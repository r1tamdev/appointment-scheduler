import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  integer,
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
  },
  (t) => [
    // A slot can have only one ACTIVE booking. Cancelled rows don't block rebooking.
    uniqueIndex("one_active_booking_per_slot")
      .on(t.availabilityId)
      .where(sql`${t.status} = 'BOOKED'`),
  ]
);
