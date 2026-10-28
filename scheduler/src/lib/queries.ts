import { and, asc, eq, gte, ilike, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { appointments, availability, doctors, patients, user } from "@/db/schema";

export async function getDoctorAppointments(doctorId: number) {
  return db
    .select({
      appointmentId: appointments.appointmentId,
      status: appointments.status,
      reason: appointments.reason,
      slotDate: availability.slotDate,
      startTime: availability.startTime,
      endTime: availability.endTime,
      patientName: user.name,
      patientEmail: user.email,
    })
    .from(appointments)
    .innerJoin(availability, eq(appointments.availabilityId, availability.availabilityId))
    .innerJoin(patients, eq(appointments.patientId, patients.patientId))
    .innerJoin(user, eq(patients.userId, user.id))
    .where(eq(appointments.doctorId, doctorId))
    .orderBy(asc(availability.slotDate), asc(availability.startTime));
}

export async function getPatientAppointments(patientId: number) {
  return db
    .select({
      appointmentId: appointments.appointmentId,
      status: appointments.status,
      reason: appointments.reason,
      slotDate: availability.slotDate,
      startTime: availability.startTime,
      endTime: availability.endTime,
      doctorName: user.name,
      specialization: doctors.specialization,
    })
    .from(appointments)
    .innerJoin(availability, eq(appointments.availabilityId, availability.availabilityId))
    .innerJoin(doctors, eq(appointments.doctorId, doctors.doctorId))
    .innerJoin(user, eq(doctors.userId, user.id))
    .where(eq(appointments.patientId, patientId))
    .orderBy(asc(availability.slotDate), asc(availability.startTime));
}

export async function listDoctors(specialization?: string) {
  const conditions = [eq(doctors.isApproved, true), isNotNull(doctors.specialization)];
  if (specialization) conditions.push(ilike(doctors.specialization, `%${specialization}%`));
  return db
    .select({
      doctorId: doctors.doctorId,
      name: user.name,
      specialization: doctors.specialization,
      experienceYears: doctors.experienceYears,
      consultationFee: doctors.consultationFee,
    })
    .from(doctors)
    .innerJoin(user, eq(doctors.userId, user.id))
    .where(and(...conditions))
    .orderBy(asc(user.name));
}

export async function getDoctorById(doctorId: number) {
  const [row] = await db
    .select({
      doctorId: doctors.doctorId,
      name: user.name,
      specialization: doctors.specialization,
      experienceYears: doctors.experienceYears,
      consultationFee: doctors.consultationFee,
    })
    .from(doctors)
    .innerJoin(user, eq(doctors.userId, user.id))
    .where(and(eq(doctors.doctorId, doctorId), eq(doctors.isApproved, true)));
  return row;
}

export async function getOpenSlots(doctorId: number) {
  return db
    .select()
    .from(availability)
    .where(
      and(
        eq(availability.doctorId, doctorId),
        eq(availability.status, "AVAILABLE"),
        gte(availability.slotDate, sql`CURRENT_DATE`)
      )
    )
    .orderBy(asc(availability.slotDate), asc(availability.startTime));
}

export async function getDoctorSlots(doctorId: number) {
  return db
    .select()
    .from(availability)
    .where(and(eq(availability.doctorId, doctorId), gte(availability.slotDate, sql`CURRENT_DATE`)))
    .orderBy(asc(availability.slotDate), asc(availability.startTime));
}
