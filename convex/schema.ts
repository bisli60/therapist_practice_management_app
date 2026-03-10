import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const applicationTables = {
  users: defineTable({
    email: v.string(),
    secretCode: v.string(), // The "password" or secret code
  }).index("by_email", ["email"]),

  patients: defineTable({
    userId: v.optional(v.id("users")),
    therapistId: v.optional(v.string()),
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    sessionRate: v.number(), // Cost per session
    notes: v.optional(v.string()),
    debtStatus: v.optional(v.string()), // "paid", "partial", "cleared"
  }).index("by_user", ["userId"]),

  sessions: defineTable({
    userId: v.optional(v.id("users")),
    patientId: v.id("patients"),
    date: v.string(), // ISO date string
    duration: v.number(), // Duration in minutes
    cost: v.number(), // Cost for this session
    notes: v.optional(v.string()),
    category: v.optional(v.string()), // Added for reporting
    type: v.optional(v.string()), // Added for reporting
    isPaid: v.boolean(),
    paymentId: v.optional(v.id("payments")),
    isDeleted: v.optional(v.boolean()),
  })
    .index("by_user", ["userId"])
    .index("by_patient", ["patientId"])
    .index("by_user_and_patient", ["userId", "patientId"])
    .index("by_is_deleted", ["isDeleted"]),

  payments: defineTable({
    userId: v.optional(v.id("users")),
    patientId: v.id("patients"),
    sessionId: v.optional(v.id("sessions")),
    amount: v.number(),
    date: v.string(), // ISO date string
    method: v.string(), // "cash", "card", "transfer", etc.
    notes: v.optional(v.string()),
    isWriteOff: v.optional(v.boolean()),
    isDeleted: v.optional(v.boolean()),
    type: v.optional(v.string()), // "income" or "adjustment"
    category: v.optional(v.string()), // Added for reporting
    isRevenue: v.optional(v.boolean()),
  })
    .index("by_user", ["userId"])
    .index("by_patient", ["patientId"])
    .index("by_user_and_patient", ["userId", "patientId"])
    .index("by_session", ["sessionId"])
    .index("by_is_deleted", ["isDeleted"]),

  settings: defineTable({
    userId: v.optional(v.id("users")),
    treatmentTypes: v.array(v.string()),
    paymentMethods: v.array(v.string()),
  }).index("by_user", ["userId"]),

  featureRequests: defineTable({
    userId: v.id("users"),
    message: v.optional(v.string()),
    audioStorageId: v.optional(v.id("_storage")),
    createdAt: v.number(),
  }).index("by_created_at", ["createdAt"]),
};

export default defineSchema({
  ...applicationTables,
});
