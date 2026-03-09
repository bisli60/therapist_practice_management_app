import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const patients = await ctx.db
      .query("patients")
      .withIndex("by_therapist", (q) => q.eq("therapistId", userId))
      .collect();

    // Calculate debt for each patient
    const patientsWithDebt = await Promise.all(
      patients.map(async (patient) => {
        // Get all sessions for this patient
        const sessions = await ctx.db
          .query("sessions")
          .withIndex("by_patient", (q) => q.eq("patientId", patient._id))
          .collect();

        // Get all payments for this patient
        const payments = await ctx.db
          .query("payments")
          .withIndex("by_patient", (q) => q.eq("patientId", patient._id))
          .collect();

        const totalSessionCost = sessions.reduce((sum, session) => sum + session.cost, 0);
        const totalPayments = payments.reduce((sum, payment) => sum + payment.amount, 0);
        const debt = totalSessionCost - totalPayments;

        return {
          ...patient,
          totalSessions: sessions.length,
          totalSessionCost,
          totalPayments,
          debt,
        };
      })
    );

    return patientsWithDebt;
  },
});

export const updateDebtStatus = mutation({
  args: {
    patientId: v.id("patients"),
    status: v.string(), // "paid", "partial", "cleared"
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const patient = await ctx.db.get(args.patientId);
    if (!patient || patient.therapistId !== userId) {
      throw new Error("Patient not found");
    }

    const today = new Date().toISOString().split("T")[0];

    if (args.status === "paid" || args.status === "cleared") {
      // Calculate current debt
      const sessions = await ctx.db
        .query("sessions")
        .withIndex("by_patient", (q) => q.eq("patientId", args.patientId))
        .collect();

      const payments = await ctx.db
        .query("payments")
        .withIndex("by_patient", (q) => q.eq("patientId", args.patientId))
        .collect();

      const totalSessionCost = sessions.reduce((sum, session) => sum + session.cost, 0);
      const totalPayments = payments.reduce((sum, payment) => sum + payment.amount, 0);
      const debt = totalSessionCost - totalPayments;

      if (debt > 0) {
        if (args.status === "paid") {
          // Record a payment for the full debt
          await ctx.db.insert("payments", {
            therapistId: userId,
            patientId: args.patientId,
            amount: debt,
            date: today,
            method: "other",
            notes: "תשלום חוב מלא",
          });
          
          // Also mark all sessions as paid
          for (const session of sessions) {
            if (!session.isPaid) {
              await ctx.db.patch(session._id, { isPaid: true });
            }
          }
        } else if (args.status === "cleared") {
          // Record a write-off payment
          await ctx.db.insert("payments", {
            therapistId: userId,
            patientId: args.patientId,
            amount: debt,
            date: today,
            method: "other",
            notes: "מחיקת חוב",
            isWriteOff: true,
          });
        }
      }
    }

    await ctx.db.patch(args.patientId, { debtStatus: args.status });
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    sessionRate: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const { sessionRate, ...rest } = args;

    return await ctx.db.insert("patients", {
      therapistId: userId,
      sessionRate: sessionRate ?? 0,
      ...rest,
    });
  },
});

export const get = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const patient = await ctx.db.get(args.patientId);
    if (!patient || patient.therapistId !== userId) {
      throw new Error("Patient not found");
    }

    return patient;
  },
});

export const remove = mutation({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const patient = await ctx.db.get(args.patientId);
    if (!patient || patient.therapistId !== userId) {
      throw new Error("Patient not found");
    }

    // Delete all sessions for this patient
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_patient", (q) => q.eq("patientId", args.patientId))
      .collect();
    for (const session of sessions) {
      await ctx.db.delete(session._id);
    }

    // Delete all payments for this patient
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_patient", (q) => q.eq("patientId", args.patientId))
      .collect();
    for (const payment of payments) {
      await ctx.db.delete(payment._id);
    }

    // Delete the patient record
    await ctx.db.delete(args.patientId);
  },
});

export const update = mutation({
  args: {
    patientId: v.id("patients"),
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    sessionRate: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const patient = await ctx.db.get(args.patientId);
    if (!patient || patient.therapistId !== userId) {
      throw new Error("Patient not found");
    }

    const { patientId, ...updates } = args;
    await ctx.db.patch(patientId, updates);
  },
});
