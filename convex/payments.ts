import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

export const list = query({
  args: { userId: v.optional(v.id("users")), patientId: v.optional(v.id("patients")) },
  handler: async (ctx, args) => {
    if (!args.userId) return [];
    
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

    // Filter out deleted payments and get patient names
    const activePayments = payments.filter(p => p.isDeleted !== true);

    const paymentsWithPatients = await Promise.all(
      activePayments.map(async (payment) => {
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

export const removePayment = mutation({
  args: { userId: v.id("users"), paymentId: v.id("payments") },
  handler: async (ctx, args) => {
    const payment = await ctx.db.get(args.paymentId);
    if (!payment || payment.userId !== args.userId) {
      throw new Error("Payment not found");
    }

    // 1. If payment has a sessionId, update that specific session
    if (payment.sessionId) {
      const session = await ctx.db.get(payment.sessionId);
      if (session && session.paymentId === args.paymentId) {
        await ctx.db.patch(payment.sessionId, {
          paymentId: undefined,
          isPaid: false,
        });
      }
    } else {
      // 2. Fallback: Search for any session that might be pointing to this paymentId
      // (Handles legacy data or cases where sessionId wasn't explicitly set on the payment)
      const linkedSessions = await ctx.db
        .query("sessions")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .collect();
      
      for (const session of linkedSessions) {
        if (session.paymentId === args.paymentId) {
          await ctx.db.patch(session._id, {
            paymentId: undefined,
            isPaid: false,
          });
        }
      }
    }

    // Soft delete the payment
    await ctx.db.patch(args.paymentId, { isDeleted: true });
  },
});

export const settlePatientDebt = mutation({
  args: { 
    userId: v.id("users"), 
    patientId: v.id("patients"),
    sessionId: v.optional(v.id("sessions")),
    amount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let debtToSettle = args.amount;

    // 1. If amount not provided, calculate the current total debt
    if (debtToSettle === undefined) {
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
        
      debtToSettle = totalSessionCost - totalWaived - totalPaid;
    }

    // 2. If sessionId is NOT provided, find a session to link to
    let targetSessionId = args.sessionId;
    if (!targetSessionId) {
      const sessions = await ctx.db
        .query("sessions")
        .withIndex("by_patient", (q) => q.eq("patientId", args.patientId))
        .collect();
      
      const activeSessions = sessions.filter(s => !s.isDeleted);
      
      // Strategy A: Find the oldest unpaid session (FIFO)
      const oldestUnpaid = activeSessions
        .filter(s => !s.isPaid)
        .sort((a, b) => a.date.localeCompare(b.date))[0];
      
      if (oldestUnpaid) {
        targetSessionId = oldestUnpaid._id;
      } else if (activeSessions.length > 0) {
        // Strategy B: Fallback to the most recent active session
        const mostRecent = activeSessions.sort((a, b) => b.date.localeCompare(a.date))[0];
        targetSessionId = mostRecent._id;
      }
      // If Strategy C (no sessions at all), targetSessionId remains undefined
    }

    // 3. If debt > 0, create a new balancing payment record
    if (debtToSettle > 0) {
      await ctx.db.insert("payments", {
        userId: args.userId,
        patientId: args.patientId,
        sessionId: targetSessionId, // Linked if possible, else undefined
        amount: debtToSettle,
        date: new Date().toISOString().split("T")[0],
        method: "other",
        notes: targetSessionId ? "ביטול חוב משויך לטיפול" : "ביטול חוב כללי (ללא טיפול משויך)",
        type: "adjustment",
        isRevenue: false,
        isDeleted: false,
      });
    }

    return { success: true, settledAmount: debtToSettle };
  },
});

export const create = mutation({
  args: {
    userId: v.id("users"),
    patientId: v.id("patients"),
    sessionId: v.optional(v.id("sessions")),
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

    const { userId, sessionId, ...rest } = args;
    
    // Determine category from session if not provided
    let category = (args as any).category;
    if (!category && sessionId) {
      const session = await ctx.db.get(sessionId);
      if (session) {
        category = session.category;
        if (!category && session.notes) {
          const typeMatch = session.notes.match(/סוג טיפול: (.*?)(?: \||$)/);
          category = typeMatch ? typeMatch[1] : "טיפול";
        }
      }
    }

    const paymentId = await ctx.db.insert("payments", {
      userId,
      sessionId,
      type: "income",
      isRevenue: true,
      category: category || "כללי",
      ...rest,
      isDeleted: false,
    });

    // If sessionId provided, update session record's status
    if (sessionId) {
      const session = await ctx.db.get(sessionId);
      if (session) {
        // Only mark as paid if this payment covers the cost (simplified logic for now)
        // In a more robust system we would sum all payments for this session
        const isFullyPaid = rest.amount >= session.cost;
        await ctx.db.patch(sessionId, {
          paymentId: paymentId,
          isPaid: isFullyPaid,
        });
      }
    }

    return paymentId;
  },
});

export const createAndLinkToOldestUnpaid = mutation({
  args: {
    userId: v.id("users"),
    patientId: v.id("patients"),
    amount: v.number(),
    date: v.string(),
    method: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 1. Find all sessions for this patient
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_user_and_patient", (q) => 
        q.eq("userId", args.userId).eq("patientId", args.patientId)
      )
      .collect();

    // 2. Find sessions that are NOT deleted and NOT fully paid
    const activeSessions = sessions.filter(s => !s.isDeleted);
    
    // We need to find which sessions still have a balance.
    // To be accurate, we'd sum payments for each session.
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_patient", (q) => q.eq("patientId", args.patientId))
      .collect();
    
    const sessionPayments = payments.filter(p => !p.isDeleted && p.isRevenue !== false);

    const sessionsWithBalance = activeSessions.map(session => {
      const paidForThisSession = sessionPayments
        .filter(p => p.sessionId === session._id)
        .reduce((sum, p) => sum + p.amount, 0);
      return {
        ...session,
        remaining: session.cost - paidForThisSession
      };
    }).filter(s => s.remaining > 0)
      .sort((a, b) => a.date.localeCompare(b.date));

    const targetSession = sessionsWithBalance[0];

    // 3. Extract category from session
    let sessionCategory = targetSession?.category;
    if (!sessionCategory && targetSession?.notes) {
      const typeMatch = targetSession.notes.match(/סוג טיפול: (.*?)(?: \||$)/);
      sessionCategory = typeMatch ? typeMatch[1] : undefined;
    }

    // 4. Create the payment
    const paymentId = await ctx.db.insert("payments", {
      userId: args.userId,
      patientId: args.patientId,
      sessionId: targetSession?._id,
      amount: args.amount,
      date: args.date,
      method: args.method,
      notes: args.notes,
      type: "income",
      category: sessionCategory || "טיפול",
      isRevenue: true,
      isDeleted: false,
    });

    // 5. Update session paid status if this payment clears the remaining balance
    if (targetSession) {
      const isNowFullyPaid = (args.amount >= targetSession.remaining);
      await ctx.db.patch(targetSession._id, {
        isPaid: isNowFullyPaid,
        // We only update paymentId if it's the primary/first payment or we want to track the latest
        paymentId: targetSession.paymentId || paymentId, 
      });
    }

    return paymentId;
  },
});

export const getTodayIncome = query({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    if (!args.userId) return 0;
    
    const today = new Date().toISOString().split("T")[0];
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_user", (q) => q.eq("userId", args.userId!))
      .collect();

    return payments
      .filter((p) => {
        // Exclude anything that is explicitly not revenue, is an adjustment, is a write-off, or is deleted
        if (p.isDeleted || p.isRevenue === false || p.type === "adjustment" || p.isWriteOff) return false;
        return p.date === today;
      })
      .reduce((sum, payment) => sum + payment.amount, 0);
  },
});

export const getTotalIncome = query({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    if (!args.userId) return 0;
    
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_user", (q) => q.eq("userId", args.userId!))
      .collect();

    return payments
      .filter((p) => {
        // Exclude anything that is explicitly not revenue, is an adjustment, is a write-off, or is deleted
        if (p.isDeleted || p.isRevenue === false || p.type === "adjustment" || p.isWriteOff) return false;
        return true;
      })
      .reduce((sum, payment) => sum + payment.amount, 0);
  },
});

export const getIncomeByCategory = query({
  args: { 
    userId: v.id("users"),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    let paymentsQuery = ctx.db
      .query("payments")
      .withIndex("by_user", (q) => q.eq("userId", args.userId));

    const payments = await paymentsQuery.collect();

    const activePayments = payments.filter(p => {
      if (p.isDeleted || p.isRevenue !== true || p.isWriteOff) return false;
      if (args.startDate && p.date < args.startDate) return false;
      if (args.endDate && p.date > args.endDate) return false;
      return true;
    });

    const typeMap: Record<string, number> = {};
    let total = 0;

    // Fetch all unique sessions linked to these payments in parallel
    const sessionIds = Array.from(new Set(activePayments.map(p => p.sessionId).filter((id): id is Id<"sessions"> => id !== undefined)));
    const sessionsData = await Promise.all(sessionIds.map(id => ctx.db.get(id)));

    for (const payment of activePayments) {
      // Priority 1: Payment's own category
      let category = (payment as any).category;

      // Priority 2: Session's category
      if (!category && payment.sessionId) {
        const session = sessionsData.find(s => s?._id === payment.sessionId);
        category = session?.category;
        
        // Priority 3: Parse from session notes
        if (!category && session?.notes) {
          const typeMatch = session.notes.match(/סוג טיפול: (.*?)(?: \||$)/);
          category = typeMatch ? typeMatch[1] : "טיפול";
        }
      }
      
      category = category || "כללי";

      typeMap[category] = (typeMap[category] || 0) + payment.amount;
      total += payment.amount;
    }

    const data = Object.entries(typeMap)
      .map(([category, value]) => ({
        category,
        value,
      }))
      .sort((a, b) => b.value - a.value);

    return { data, total };
  },
});
