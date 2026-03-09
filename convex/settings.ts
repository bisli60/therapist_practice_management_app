import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const DEFAULT_TREATMENT_TYPES = ["ייעוץ אישי", "טיפול זוגי", "הדרכת הורים"];
const DEFAULT_PAYMENT_METHODS = ["מזומן", "העברה בנקאית", "ביט", "צ'ק"];

export const get = query({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    if (!args.userId) return null;
    
    const settings = await ctx.db
      .query("settings")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();

    if (!settings) {
      return {
        treatmentTypes: DEFAULT_TREATMENT_TYPES,
        paymentMethods: DEFAULT_PAYMENT_METHODS,
      };
    }

    return settings;
  },
});

export const update = mutation({
  args: {
    userId: v.id("users"),
    treatmentTypes: v.array(v.string()),
    paymentMethods: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("settings")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        treatmentTypes: args.treatmentTypes,
        paymentMethods: args.paymentMethods,
      });
    } else {
      await ctx.db.insert("settings", {
        userId: args.userId,
        treatmentTypes: args.treatmentTypes,
        paymentMethods: args.paymentMethods,
      });
    }
  },
});
