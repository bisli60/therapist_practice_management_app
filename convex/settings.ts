import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

const DEFAULT_TREATMENT_TYPES = ["ייעוץ אישי", "טיפול זוגי", "הדרכת הורים"];
const DEFAULT_PAYMENT_METHODS = ["מזומן", "העברה בנקאית", "ביט", "צ'ק"];

export const get = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const settings = await ctx.db
      .query("settings")
      .withIndex("by_therapist", (q) => q.eq("therapistId", userId))
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
    treatmentTypes: v.array(v.string()),
    paymentMethods: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const existing = await ctx.db
      .query("settings")
      .withIndex("by_therapist", (q) => q.eq("therapistId", userId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, args);
    } else {
      await ctx.db.insert("settings", {
        therapistId: userId,
        ...args,
      });
    }
  },
});
