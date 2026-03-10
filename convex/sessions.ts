import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { userId: v.optional(v.id("users")), patientId: v.optional(v.id("patients")) },
  handler: async (ctx, args) => {
    if (!args.userId) return [];
    
    let sessions;
    if (args.patientId) {
      sessions = await ctx.db
        .query("sessions")
        .withIndex("by_user_and_patient", (q) => 
          q.eq("userId", args.userId).eq("patientId", args.patientId!)
        )
        .order("desc")
        .collect();
    } else {
      sessions = await ctx.db
        .query("sessions")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .order("desc")
        .collect();
    }

    // Filter out deleted sessions and get details
    const activeSessions = sessions.filter(s => s.isDeleted !== true);
    
    // Get all active payments for the patient(s)
    let payments;
    if (args.patientId) {
      payments = await ctx.db
        .query("payments")
        .withIndex("by_patient", (q) => q.eq("patientId", args.patientId!))
        .collect();
    } else {
      payments = await ctx.db
        .query("payments")
        .withIndex("by_user", (q) => q.eq("userId", args.userId!))
        .collect();
    }
    const activePayments = payments.filter(p => p.isDeleted !== true);

    // Calculate General Credit (payments not linked to a session)
    // We group by patientId since the list might contain multiple patients
    const generalCreditByPatient: Record<string, number> = {};
    activePayments.forEach(p => {
      if (!p.sessionId) {
        const pid = p.patientId.toString();
        generalCreditByPatient[pid] = (generalCreditByPatient[pid] || 0) + p.amount;
      }
    });

    // Sort active sessions by date (ASC) for FIFO allocation
    const sortedSessionsForFIFO = [...activeSessions].sort((a, b) => a.date.localeCompare(b.date));
    
    // Tracks how much general credit is still available for each patient
    const remainingCredit = { ...generalCreditByPatient };

    // Set of session IDs that are covered by FIFO credit
    const sessionsCoveredByFIFO = new Set<string>();

    for (const session of sortedSessionsForFIFO) {
      const pid = session.patientId.toString();
      // If session is NOT directly linked to a payment, try to cover it with general credit
      if (!session.paymentId && remainingCredit[pid] >= session.cost) {
        remainingCredit[pid] -= session.cost;
        sessionsCoveredByFIFO.add(session._id.toString());
      }
    }
    
    const sessionsWithDetails = await Promise.all(
      activeSessions.map(async (session) => {
        const patient = await ctx.db.get(session.patientId);
        
        // A session is paid if:
        // 1. It has a direct linked payment that is NOT deleted
        // 2. It's covered by FIFO general credit
        const payment = session.paymentId ? await ctx.db.get(session.paymentId) : null;
        const hasDirectPayment = session.paymentId && payment && !payment.isDeleted;
        const isActuallyPaid = hasDirectPayment || sessionsCoveredByFIFO.has(session._id.toString());
        
        return {
          ...session,
          isPaid: !!isActuallyPaid,
          patientName: patient?.name || "Unknown",
          paymentAmount: hasDirectPayment ? payment.amount : undefined,
          paymentMethod: hasDirectPayment ? payment.method : undefined,
        };
      })
    );

    return sessionsWithDetails;
  },
});

export const create = mutation({
  args: {
    userId: v.id("users"),
    patientId: v.id("patients"),
    date: v.string(),
    duration: v.number(),
    cost: v.number(),
    notes: v.optional(v.string()),
    category: v.optional(v.string()),
    isPaid: v.optional(v.boolean()),
    paymentId: v.optional(v.id("payments")),
  },
  handler: async (ctx, args) => {
    // Verify patient exists and belongs to user
    const patient = await ctx.db.get(args.patientId);
    if (!patient || patient.userId !== args.userId) {
      throw new Error("Patient not found");
    }

    const { userId, isPaid, paymentId, ...rest } = args;

    return await ctx.db.insert("sessions", {
      userId,
      ...rest,
      isPaid: isPaid ?? false,
      paymentId,
    });
  },
});

export const update = mutation({
  args: {
    userId: v.id("users"),
    sessionId: v.id("sessions"),
    patientId: v.optional(v.id("patients")),
    date: v.optional(v.string()),
    duration: v.optional(v.number()),
    cost: v.optional(v.number()),
    notes: v.optional(v.string()),
    category: v.optional(v.string()),
    isPaid: v.optional(v.boolean()),
    paymentAmount: v.optional(v.number()),
    paymentMethod: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== args.userId) {
      throw new Error("Session not found");
    }

    const { sessionId, userId, paymentAmount, paymentMethod, ...updates } = args;
    
    let newPaymentId = session.paymentId;

    // Handle payment updates
    if (paymentAmount !== undefined || paymentMethod !== undefined) {
      const currentAmount = paymentAmount ?? 0;
      
      if (session.paymentId) {
        if (currentAmount > 0) {
          // Update existing payment
          await ctx.db.patch(session.paymentId, {
            amount: currentAmount,
            method: paymentMethod || "other",
            date: args.date || session.date,
            isDeleted: false,
          });
        } else {
          // Soft delete existing payment if amount set to 0
          await ctx.db.patch(session.paymentId, { isDeleted: true });
          newPaymentId = undefined;
        }
      } else if (currentAmount > 0) {
        // Create new payment if it didn't exist
        newPaymentId = await ctx.db.insert("payments", {
          userId,
          patientId: args.patientId || session.patientId,
          sessionId: args.sessionId,
          amount: currentAmount,
          date: args.date || session.date,
          method: paymentMethod || "other",
          notes: "תשלום מעודכן עבור טיפול",
        });
      }
    }

    await ctx.db.patch(sessionId, {
      ...updates,
      paymentId: newPaymentId,
    });
  },
});

export const remove = mutation({
  args: { userId: v.id("users"), sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== args.userId) {
      throw new Error("Session not found");
    }

    // Find all payments linked to this session
    const relatedPayments = await ctx.db
      .query("payments")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    // Soft delete ALL related payments specifically linked to this session.
    // This includes "income" (initial payment) and "adjustment" (debt cancellation).
    for (const payment of relatedPayments) {
      await ctx.db.patch(payment._id, { isDeleted: true });
    }

    // Safety Check: If session has an associated paymentId (legacy or direct link)
    if (session.paymentId) {
      const payment = await ctx.db.get(session.paymentId);
      if (payment && !payment.isDeleted) {
        await ctx.db.patch(session.paymentId, { isDeleted: true });
      }
    }

    // Soft delete the session itself
    await ctx.db.patch(args.sessionId, { isDeleted: true });
  },
});

export const markAsPaid = mutation({
  args: { userId: v.id("users"), sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== args.userId) {
      throw new Error("Session not found");
    }

    await ctx.db.patch(args.sessionId, { isPaid: true });
  },
});

export const listUnpaid = query({
  args: { userId: v.id("users"), patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_user_and_patient", (q) => 
        q.eq("userId", args.userId).eq("patientId", args.patientId)
      )
      .collect();

    const activeSessions = sessions.filter(s => s.isDeleted !== true);
    
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_patient", (q) => q.eq("patientId", args.patientId))
      .collect();
    const activePayments = payments.filter(p => p.isDeleted !== true);

    // Calculate General Credit
    let generalCredit = activePayments
      .filter(p => !p.sessionId)
      .reduce((sum, p) => sum + p.amount, 0);

    // Sort by date ASC for FIFO
    const sortedSessions = [...activeSessions].sort((a, b) => a.date.localeCompare(b.date));
    
    const unpaidSessions = [];

    for (const session of sortedSessions) {
      // A session is considered paid if:
      // 1. Its isPaid flag is true AND (if it has a paymentId, that payment exists and is not deleted)
      // 2. OR it can be covered by FIFO general credit
      
      const payment = session.paymentId ? activePayments.find(p => p._id === session.paymentId) : null;
      const isDirectlyPaid = session.isPaid && (session.paymentId ? !!payment : true);
      
      if (isDirectlyPaid) continue;

      if (generalCredit >= session.cost) {
        generalCredit -= session.cost;
        continue;
      }

      // If we reach here, it's at least partially unpaid
      const remainingCost = session.cost - (generalCredit > 0 ? generalCredit : 0);
      generalCredit = 0; // consumed

      unpaidSessions.push({
        ...session,
        remainingCost,
        treatmentType: session.notes?.match(/סוג טיפול: (.*?)(?: \||$)/)?.[1] || "טיפול"
      });
    }

    return unpaidSessions;
  },
});
