import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const register = mutation({
  args: {
    email: v.string(),
    secretCode: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .unique();

    if (existing) {
      throw new Error("User already exists");
    }

    const userId = await ctx.db.insert("users", {
      email: args.email.toLowerCase(),
      secretCode: args.secretCode,
    });

    return userId;
  },
});

export const login = mutation({
  args: {
    email: v.string(),
    secretCode: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .unique();

    if (!user || user.secretCode !== args.secretCode) {
      throw new Error("Invalid email or secret code");
    }

    return user._id;
  },
});

export const clearOldPatients = mutation({
  args: {},
  handler: async (ctx) => {
    const tables = ["patients", "sessions", "payments", "settings"] as const;
    let count = 0;

    for (const table of tables) {
      // @ts-ignore
      const docs = await ctx.db.query(table).collect();
      for (const doc of docs) {
        // @ts-ignore
        if (!doc.userId || doc.therapistId) {
          await ctx.db.delete(doc._id);
          count++;
        }
      }
    }

    return { deleted: count };
  },
});

export const fixMissingUserIds = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const tables = ["patients", "sessions", "payments", "settings"] as const;
    let count = 0;

    for (const table of tables) {
      // @ts-ignore
      const docs = await ctx.db.query(table).collect();
      for (const doc of docs) {
        // @ts-ignore
        if (!doc.userId) {
          // @ts-ignore
          await ctx.db.patch(doc._id, { userId: args.userId });
          count++;
        }
      }
    }

    return { updated: count };
  },
});

export const get = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

export const updateSecretCode = mutation({
  args: { userId: v.id("users"), newSecretCode: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }
    await ctx.db.patch(args.userId, { secretCode: args.newSecretCode });
  },
});
