import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  time,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

export const patients = pgTable("patients", {
  patientId: serial("patient_id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  dateOfBirth: date("date_of_birth"),
  gender: varchar("gender", { length: 20 }),
  address: text("address"),
});

export const doctors = pgTable("doctors", {
  doctorId: serial("doctor_id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  specialization: varchar("specialization", { length: 100 }),
  experienceYears: integer("experience_years"),
  consultationFee: numeric("consultation_fee", { precision: 10, scale: 2 }),
  isApproved: boolean("is_approved").notNull().default(true),
});

export const availability = pgTable("availability", {
  availabilityId: serial("availability_id").primaryKey(),
  doctorId: integer("doctor_id")
    .notNull()
    .references(() => doctors.doctorId, { onDelete: "cascade" }),
  slotDate: date("slot_date").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("AVAILABLE"),
});

export const appointments = pgTable(
  "appointments",
  {
    appointmentId: serial("appointment_id").primaryKey(),
    patientId: integer("patient_id")
      .notNull()
      .references(() => patients.patientId, { onDelete: "cascade" }),
    doctorId: integer("doctor_id")
      .notNull()
      .references(() => doctors.doctorId, { onDelete: "cascade" }),
    availabilityId: integer("availability_id")
      .notNull()
      .references(() => availability.availabilityId, { onDelete: "cascade" }),
    reason: text("reason"),
    status: varchar("status", { length: 20 }).notNull().default("BOOKED"),
    bookedAt: timestamp("booked_at").notNull().defaultNow(),
    holdExpiresAt: timestamp("hold_expires_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancelledBy: varchar("cancelled_by", { length: 10 }),
  },
  (t) => [
    // A slot can have only one ACTIVE booking. Cancelled rows don't block rebooking.
    uniqueIndex("one_active_booking_per_slot")
      .on(t.availabilityId)
      .where(sql`${t.status} = 'BOOKED'`),
  ]
);

export const payments = pgTable(
  "payments",
  {
    paymentId: serial("payment_id").primaryKey(),
    appointmentId: integer("appointment_id")
      .notNull()
      .unique()
      .references(() => appointments.appointmentId, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 20 }).notNull().default("razorpay"),
    providerOrderId: varchar("provider_order_id", { length: 64 }).notNull().unique(),
    providerPaymentId: varchar("provider_payment_id", { length: 64 }).unique(),
    amount: integer("amount").notNull(),
    refundedAmount: integer("refunded_amount").notNull().default(0),
    currency: varchar("currency", { length: 3 }).notNull().default("INR"),
    status: varchar("status", { length: 20 }).notNull().default("CREATED"),
    failureReason: text("failure_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
  },
  (t) => [check("refund_within_paid", sql`${t.refundedAmount} <= ${t.amount}`)]
);

export const paymentEvents = pgTable(
  "payment_events",
  {
    id: serial("id").primaryKey(),
    provider: varchar("provider", { length: 20 }).notNull(),
    eventId: varchar("event_id", { length: 100 }).notNull(),
    eventType: varchar("event_type", { length: 60 }).notNull(),
    payload: jsonb("payload").notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("payment_events_provider_event").on(t.provider, t.eventId)]
);

export const refunds = pgTable("refunds", {
  refundId: serial("refund_id").primaryKey(),
  paymentId: integer("payment_id")
    .notNull()
    .references(() => payments.paymentId, { onDelete: "cascade" }),
  appointmentId: integer("appointment_id")
    .notNull()
    .references(() => appointments.appointmentId, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  reason: varchar("reason", { length: 200 }).notNull(),
  policyPercent: integer("policy_percent"),
  status: varchar("status", { length: 20 }).notNull().default("REQUESTED"),
  providerRefundId: varchar("provider_refund_id", { length: 64 }).unique(),
  idempotencyKey: varchar("idempotency_key", { length: 100 }).notNull().unique(),
  failureReason: text("failure_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const notifications = pgTable(
  "notifications",
  {
    notificationId: serial("notification_id").primaryKey(),
    type: varchar("type", { length: 50 }).notNull(),
    channel: varchar("channel", { length: 20 }).notNull().default("EMAIL"),
    recipientUserId: text("recipient_user_id").references(() => user.id, { onDelete: "cascade" }),
    toAddress: varchar("to_address", { length: 255 }).notNull(),
    appointmentId: integer("appointment_id").references(() => appointments.appointmentId, {
      onDelete: "cascade",
    }),
    payload: jsonb("payload").notNull().default({}),
    dedupeKey: varchar("dedupe_key", { length: 150 }).notNull().unique(),
    status: varchar("status", { length: 20 }).notNull().default("SCHEDULED"),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }).notNull().defaultNow(),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    providerRef: varchar("provider_ref", { length: 100 }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("notifications_due_idx").on(t.status, t.scheduledFor)]
);

export const notificationPreferences = pgTable("notification_preferences", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  remindersEnabled: boolean("reminders_enabled").notNull().default(true),
  reminderOffsetsMinutes: integer("reminder_offsets_minutes")
    .array()
    .notNull()
    .default(sql`'{1440,60}'`),
  marketingOptIn: boolean("marketing_opt_in").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});


