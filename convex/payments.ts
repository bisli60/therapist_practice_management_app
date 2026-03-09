import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
  args: { patientId: v.optional(v.id("patients")) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    let payments;
    if (args.patientId) {
      payments = await ctx.db
        .query("payments")
        .withIndex("by_patient", (q) => q.eq("patientId", args.patientId!))
        .order("desc")
        .collect();
    } else {
      payments = await ctx.db
        .query("payments")
        .withIndex("by_therapist", (q) => q.eq("therapistId", userId))
        .order("desc")
        .collect();
    }

    // Get patient names for each payment
    const paymentsWithPatients = await Promise.all(
      payments.map(async (payment) => {
        const patient = await ctx.db.get(payment.patientId);
        return {
          ...payment,
          patientName: patient?.name || "Unknown",
        };
      })
    );

    return paymentsWithPatients;
  },
});

export const create = mutation({
  args: {
    patientId: v.id("patients"),
    amount: v.number(),
    date: v.string(),
    method: v.string(),
    notes: v.optional(v.string()),
    isWriteOff: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Verify patient belongs to therapist
    const patient = await ctx.db.get(args.patientId);
    if (!patient || patient.therapistId !== userId) {
      throw new Error("Patient not found");
    }

    return await ctx.db.insert("payments", {
      therapistId: userId,
      ...args,
    });
  },
});

export const getTotalIncome = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const payments = await ctx.db
      .query("payments")
      .withIndex("by_therapist", (q) => q.eq("therapistId", userId))
      .collect();

    return payments
      .filter((p) => !p.isWriteOff)
      .reduce((sum, payment) => sum + payment.amount, 0);
  },
});

export const getTodayIncome = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const today = new Date().toISOString().split("T")[0];
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_therapist", (q) => q.eq("therapistId", userId))
      .collect();

    return payments
      .filter((p) => p.date === today && !p.isWriteOff)
      .reduce((sum, payment) => sum + payment.amount, 0);
  },
});
