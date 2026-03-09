import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  patients: defineTable({
    therapistId: v.id("users"),
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    sessionRate: v.number(), // Cost per session
    notes: v.optional(v.string()),
    debtStatus: v.optional(v.string()), // "paid", "partial", "cleared"
  }).index("by_therapist", ["therapistId"]),

  sessions: defineTable({
    therapistId: v.id("users"),
    patientId: v.id("patients"),
    date: v.string(), // ISO date string
    duration: v.number(), // Duration in minutes
    cost: v.number(), // Cost for this session
    notes: v.optional(v.string()),
    isPaid: v.boolean(),
    paymentId: v.optional(v.id("payments")),
  })
    .index("by_therapist", ["therapistId"])
    .index("by_patient", ["patientId"])
    .index("by_therapist_and_patient", ["therapistId", "patientId"]),

  payments: defineTable({
    therapistId: v.id("users"),
    patientId: v.id("patients"),
    amount: v.number(),
    date: v.string(), // ISO date string
    method: v.string(), // "cash", "card", "transfer", etc.
    notes: v.optional(v.string()),
    isWriteOff: v.optional(v.boolean()),
  })
    .index("by_therapist", ["therapistId"])
    .index("by_patient", ["patientId"])
    .index("by_therapist_and_patient", ["therapistId", "patientId"]),

  settings: defineTable({
    therapistId: v.id("users"),
    treatmentTypes: v.array(v.string()),
    paymentMethods: v.array(v.string()),
  }).index("by_therapist", ["therapistId"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
