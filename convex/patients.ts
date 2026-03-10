import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    if (!args.userId) return [];
    
    const patients = await ctx.db
      .query("patients")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Calculate debt for each patient
    const patientsWithDebt = await Promise.all(
      patients.map(async (patient) => {
        // Get all active sessions for this patient
        const sessions = await ctx.db
          .query("sessions")
          .withIndex("by_patient", (q) => q.eq("patientId", patient._id))
          .collect();
        const activeSessions = sessions.filter(s => !s.isDeleted);
        const activeSessionIds = new Set(activeSessions.map(s => s._id.toString()));

        // Get all active payments for this patient
        const payments = await ctx.db
          .query("payments")
          .withIndex("by_patient", (q) => q.eq("patientId", patient._id))
          .collect();
        
        // A payment is valid for balance if:
        // 1. It is not deleted (isDeleted !== true)
        // 2. AND (It has no sessionId OR its sessionId points to an active session)
        const validPayments = payments.filter(p => {
          if (p.isDeleted) return false;
          if (p.sessionId && !activeSessionIds.has(p.sessionId.toString())) return false;
          return true;
        });

        const totalSessionCost = activeSessions.reduce((sum, session) => sum + session.cost, 0);
        
        // Separate actual income from adjustments (waived debt)
        const totalPaid = validPayments
          .filter(p => p.type === "income" || p.type === undefined) // legacy payments are usually income
          .reduce((sum, p) => sum + p.amount, 0);
          
        const totalWaived = validPayments
          .filter(p => p.type === "adjustment")
          .reduce((sum, p) => sum + p.amount, 0);
        
        // debt = Cost - Waived - Paid
        // If debt > 0, patient owes money. If < 0, patient has credit.
        const debt = totalSessionCost - totalWaived - totalPaid;

        return {
          ...patient,
          totalSessions: activeSessions.length,
          totalSessionCost,
          totalPayments: totalPaid, // Now only shows actual money paid
          totalWaived,
          debt,
        };
      })
    );

    return patientsWithDebt;
  },
});

export const updateDebtStatus = mutation({
  args: {
    userId: v.id("users"),
    patientId: v.id("patients"),
    status: v.string(), // "paid", "partial", "cleared"
  },
  handler: async (ctx, args) => {
    const patient = await ctx.db.get(args.patientId);
    if (!patient || patient.userId !== args.userId) {
      throw new Error("Patient not found");
    }

    const today = new Date().toISOString().split("T")[0];

    if (args.status === "paid" || args.status === "cleared") {
      // Calculate current debt from non-deleted records
      const sessions = await ctx.db
        .query("sessions")
        .withIndex("by_patient", (q) => q.eq("patientId", args.patientId))
        .collect();
      const activeSessions = sessions.filter(s => !s.isDeleted);
      const activeSessionIds = new Set(activeSessions.map(s => s._id.toString()));

      const payments = await ctx.db
        .query("payments")
        .withIndex("by_patient", (q) => q.eq("patientId", args.patientId))
        .collect();
      
      const validPayments = payments.filter(p => {
        if (p.isDeleted) return false;
        if (p.sessionId && !activeSessionIds.has(p.sessionId.toString())) return false;
        return true;
      });

      const totalSessionCost = activeSessions.reduce((sum, session) => sum + session.cost, 0);
      const totalPaid = validPayments
        .filter(p => p.type === "income" || p.type === undefined)
        .reduce((sum, p) => sum + p.amount, 0);
      const totalWaived = validPayments
        .filter(p => p.type === "adjustment")
        .reduce((sum, p) => sum + p.amount, 0);
        
      const debt = totalSessionCost - totalWaived - totalPaid;

      if (debt > 0) {
        if (args.status === "paid") {
          // Record a payment for the full debt
          await ctx.db.insert("payments", {
            userId: args.userId,
            patientId: args.patientId,
            amount: debt,
            date: today,
            method: "other",
            notes: "תשלום חוב מלא",
            type: "income",
            isRevenue: true,
          });
          
          // Also mark all active sessions as paid
          for (const session of activeSessions) {
            if (!session.isPaid) {
              await ctx.db.patch(session._id, { isPaid: true });
            }
          }
        } else if (args.status === "cleared") {
          // Record a write-off adjustment
          await ctx.db.insert("payments", {
            userId: args.userId,
            patientId: args.patientId,
            amount: debt,
            date: today,
            method: "other",
            notes: "ביטול חוב",
            isWriteOff: true,
            type: "adjustment",
            isRevenue: false,
          });
        }
      }
    }

    await ctx.db.patch(args.patientId, { debtStatus: args.status });
  },
});

export const create = mutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    sessionRate: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, sessionRate, ...rest } = args;

    return await ctx.db.insert("patients", {
      userId,
      sessionRate: sessionRate ?? 0,
      ...rest,
    });
  },
});

export const get = query({
  args: { userId: v.id("users"), patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const patient = await ctx.db.get(args.patientId);
    if (!patient || patient.userId !== args.userId) {
      throw new Error("Patient not found");
    }

    return patient;
  },
});

export const remove = mutation({
  args: { userId: v.id("users"), patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const patient = await ctx.db.get(args.patientId);
    if (!patient || patient.userId !== args.userId) {
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
    userId: v.id("users"),
    patientId: v.id("patients"),
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    sessionRate: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const patient = await ctx.db.get(args.patientId);
    if (!patient || patient.userId !== args.userId) {
      throw new Error("Patient not found");
    }

    const { patientId, userId, ...updates } = args;
    await ctx.db.patch(patientId, updates);
  },
});

