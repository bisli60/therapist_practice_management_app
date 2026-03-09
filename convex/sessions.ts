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

    // Get details for each session
    const sessionsWithDetails = await Promise.all(
      sessions.map(async (session) => {
        const patient = await ctx.db.get(session.patientId);
        const payment = session.paymentId ? await ctx.db.get(session.paymentId) : null;
        
        return {
          ...session,
          patientName: patient?.name || "Unknown",
          paymentAmount: payment?.amount,
          paymentMethod: payment?.method,
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
          });
        } else {
          // Delete existing payment if amount set to 0
          await ctx.db.delete(session.paymentId);
          newPaymentId = undefined;
        }
      } else if (currentAmount > 0) {
        // Create new payment if it didn't exist
        newPaymentId = await ctx.db.insert("payments", {
          userId,
          patientId: args.patientId || session.patientId,
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

    // If session has an associated payment, delete it safely
    if (session.paymentId) {
      const payment = await ctx.db.get(session.paymentId);
      if (payment) {
        await ctx.db.delete(session.paymentId);
      }
    }

    await ctx.db.delete(args.sessionId);
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
