import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { userId: v.optional(v.id("users")), patientId: v.optional(v.id("patients")) },
  handler: async (ctx, args) => {
    if (!args.userId) return [];
    
    let payments;
    if (args.patientId) {
      payments = await ctx.db
        .query("payments")
        .withIndex("by_user_and_patient", (q) => 
          q.eq("userId", args.userId).eq("patientId", args.patientId!)
        )
        .order("desc")
        .collect();
    } else {
      payments = await ctx.db
        .query("payments")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
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
    userId: v.id("users"),
    patientId: v.id("patients"),
    amount: v.number(),
    date: v.string(),
    method: v.string(),
    notes: v.optional(v.string()),
    isWriteOff: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Verify patient exists and belongs to user
    const patient = await ctx.db.get(args.patientId);
    if (!patient || patient.userId !== args.userId) {
      throw new Error("Patient not found");
    }

    const { userId, ...rest } = args;
    return await ctx.db.insert("payments", {
      userId,
      ...rest,
    });
  },
});

export const getTotalIncome = query({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    if (!args.userId) return 0;
    
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    return payments
      .filter((p) => !p.isWriteOff)
      .reduce((sum, payment) => sum + payment.amount, 0);
  },
});

export const getTodayIncome = query({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    if (!args.userId) return 0;
    
    const today = new Date().toISOString().split("T")[0];
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    return payments
      .filter((p) => p.date === today && !p.isWriteOff)
      .reduce((sum, payment) => sum + payment.amount, 0);
  },
});
