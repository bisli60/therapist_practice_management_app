import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const generateUploadUrl = mutation(async (ctx) => {
  return await ctx.storage.generateUploadUrl();
});

export const add = mutation({
  args: {
    userId: v.id("users"),
    message: v.optional(v.string()),
    audioStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("featureRequests", {
      userId: args.userId,
      message: args.message,
      audioStorageId: args.audioStorageId,
      createdAt: Date.now(),
    });
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const requests = await ctx.db
      .query("featureRequests")
      .withIndex("by_created_at")
      .order("desc")
      .take(50);
    
    // Join with user email and get storage URL
    const result = await Promise.all(
      requests.map(async (req) => {
        const user = await ctx.db.get(req.userId);
        let audioUrl = null;
        if (req.audioStorageId) {
          audioUrl = await ctx.storage.getUrl(req.audioStorageId);
        }
        return {
          ...req,
          userEmail: user?.email || "Unknown",
          audioUrl,
        };
      })
    );
    
    return result;
  },
});

export const remove = mutation({
  args: {
    id: v.id("featureRequests"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.id);
    if (!request || request.userId !== args.userId) {
      throw new Error("Unauthorized to delete this request");
    }
    // Delete file from storage if it exists
    if (request.audioStorageId) {
      await ctx.storage.delete(request.audioStorageId);
    }
    await ctx.db.delete(args.id);
  },
});

export const update = mutation({
  args: {
    id: v.id("featureRequests"),
    userId: v.id("users"),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.id);
    if (!request || request.userId !== args.userId) {
      throw new Error("Unauthorized to update this request");
    }
    await ctx.db.patch(args.id, {
      message: args.message,
    });
  },
});
