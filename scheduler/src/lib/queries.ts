import { and, asc, eq, gte, ilike, inArray, isNotNull, sql, lt } from "drizzle-orm";
import { db } from "@/db";
import { appointments, availability, doctors, patients, user } from "@/db/schema";
import { releaseExpiredHolds } from "@/lib/payments/holds";
import {ensureUpcomingAvailability,} from "@/lib/availability/generate";
import { slotStartUtc } from "@/lib/time";

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
    .where(
      and(
        eq(appointments.doctorId, doctorId),
        inArray(appointments.status,["BOOKED","COMPLETED","CANCELLED"])
      ))
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

export async function getPatientAppointment(appointmentId: number, userId: string) {
  const [row] = await db
    .select({
      appointmentId: appointments.appointmentId,
      status: appointments.status,
      doctorId: appointments.doctorId,
      slotDate: availability.slotDate,
      startTime: availability.startTime,
      endTime: availability.endTime,
      doctorName: user.name,
    })
    .from(appointments)
    .innerJoin(patients, eq(appointments.patientId, patients.patientId))
    .innerJoin(availability, eq(appointments.availabilityId, availability.availabilityId))
    .innerJoin(doctors, eq(appointments.doctorId, doctors.doctorId))
    .innerJoin(user, eq(doctors.userId, user.id))
    .where(and(eq(appointments.appointmentId, appointmentId), eq(patients.userId, userId)));
  return row;
}

export async function getDoctorSpecializations() {
  const specialization = sql<string>`trim(${doctors.specialization})`;

  const rows = await db
    .selectDistinct({
      specialization,
    })
    .from(doctors)
    .where(
      and(
        eq(doctors.isApproved, true),
        isNotNull(doctors.specialization),
        sql`trim(${doctors.specialization}) <> ''`
      )
    )
    .orderBy(asc(sql`lower(trim(${doctors.specialization}))`));

  return rows.map((row) => row.specialization);
}

export async function listDoctors(specialization?: string) {
  const conditions = [
    eq(doctors.isApproved, true),
    isNotNull(doctors.specialization),
  ];

  if (specialization) {
    conditions.push(
      sql`lower(trim(${doctors.specialization})) = lower(trim(${specialization}))`
    );
  }

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
  
  await releaseExpiredHolds();

  await ensureUpcomingAvailability(doctorId);

  const rows = await db
    .select()
    .from(availability)
    .where(
      and(
        eq(availability.doctorId, doctorId),
        lt(availability.bookedCount, availability.capacity),
        gte(availability.slotDate, sql`CURRENT_DATE`)
      )
    )
    .orderBy(asc(availability.slotDate), asc(availability.startTime));

    return rows.filter((slot) => slotStartUtc(slot.slotDate, slot.startTime).getTime()>Date.now());
}

export async function getDoctorSlots(doctorId: number) {
  await ensureUpcomingAvailability(doctorId);

  return db
    .select()
    .from(availability)
    .where(and(eq(availability.doctorId, doctorId), gte(availability.slotDate, sql`CURRENT_DATE`)))
    .orderBy(asc(availability.slotDate), asc(availability.startTime));
}
