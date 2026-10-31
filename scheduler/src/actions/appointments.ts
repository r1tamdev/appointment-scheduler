"use server";

import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { appointments, availability, doctors, patients } from "@/db/schema";
import { getSession, requireRole } from "@/lib/session";
import { getOrCreateDoctor, getOrCreatePatient } from "@/lib/profiles";
import { slotStartUtc } from "@/lib/time";

type FormState = { error: string } | null;

/*
const bookSchema = z.object({
  availabilityId: z.coerce.number().int().positive("Pick a time slot"),
  reason: z.string().max(300, "Reason is too long").optional(),
});


export async function bookAppointmentAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await requireRole("PATIENT");
  const parsed = bookSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const patient = await getOrCreatePatient(session.user.id);
  const { availabilityId, reason } = parsed.data;

  try {
    await db.transaction(async (tx) => {
      // Atomic claim: only succeeds if the slot is still AVAILABLE.
      const claimed = await tx
        .update(availability)
        .set({ status: "BOOKED" })
        .where(
          and(
            eq(availability.availabilityId, availabilityId),
            eq(availability.status, "AVAILABLE")
          )
        )
        .returning({ doctorId: availability.doctorId });

      if (claimed.length === 0) throw new Error("SLOT_TAKEN");

      await tx.insert(appointments).values({
        patientId: patient.patientId,
        doctorId: claimed[0].doctorId,
        availabilityId,
        reason: reason?.trim() || null,
      });
    });
  } catch (e) {
    if (e instanceof Error && e.message === "SLOT_TAKEN") {
      return { error: "Sorry, that slot was just booked. Please pick another." };
    }
    throw e;
  }

  revalidatePath("/patient");
  revalidatePath("/doctor");
  redirect("/patient");
}
*/

export async function cancelAppointmentAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/signin");

  const id = Number(formData.get("appointmentId"));
  if (!Number.isInteger(id)) return;

  const [row] = await db
    .select({
      status: appointments.status,
      availabilityId: appointments.availabilityId,
      patientUserId: patients.userId,
      doctorUserId: doctors.userId,
    })
    .from(appointments)
    .innerJoin(patients, eq(appointments.patientId, patients.patientId))
    .innerJoin(doctors, eq(appointments.doctorId, doctors.doctorId))
    .where(eq(appointments.appointmentId, id));

  if (!row || row.status !== "BOOKED") return;
  // Only the patient or the doctor of this appointment may cancel it.
  if (session.user.id !== row.patientUserId && session.user.id !== row.doctorUserId) return;

  await db.transaction(async (tx) => {
    await tx
      .update(appointments)
      .set({ status: "CANCELLED",
        cancelledAt: new Date(),
        cancelledBy: session.user.id === row.doctorUserId ? "DOCTOR" : "PATIENT",
       })
      .where(eq(appointments.appointmentId, id));
    await tx
      .update(availability)
      .set({ status: "AVAILABLE", })
      .where(eq(availability.availabilityId, row.availabilityId));
  });

  revalidatePath("/patient");
  revalidatePath("/doctor");
}

export async function completeAppointmentAction(formData: FormData) {
  const session = await requireRole("DOCTOR");
  const id = Number(formData.get("appointmentId"));
  if (!Number.isInteger(id)) return;

  const doctor = await getOrCreateDoctor(session.user.id);
  await db
    .update(appointments)
    .set({ status: "COMPLETED" })
    .where(
      and(
        eq(appointments.appointmentId, id),
        eq(appointments.doctorId, doctor.doctorId),
        eq(appointments.status, "BOOKED")
      )
    );

  revalidatePath("/doctor");
  revalidatePath("/patient");
}

const MIN_HOURS_BEFORE_RESCHEDULE = 2;

const rescheduleSchema = z.object({
  appointmentId: z.coerce.number().int().positive(),
  newAvailabilityId: z.coerce.number().int().positive("Pick a new time slot"),
});

const rescheduleErrors: Record<string, string> = {
  NOT_FOUND: "Appointment not found.",
  NOT_RESCHEDULABLE: "Only confirmed appointments can be rescheduled.",
  SAME_SLOT: "Pick a different slot.",
  TOO_LATE: `Appointments can be rescheduled up to ${MIN_HOURS_BEFORE_RESCHEDULE} hours before the start time.`,
  SLOT_TAKEN: "Sorry, that slot was just booked. Please pick another.",
  SLOT_PAST: "That slot is no longer available.",
};

export async function rescheduleAppointmentAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await requireRole("PATIENT");
  const parsed = rescheduleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { appointmentId, newAvailabilityId } = parsed.data;

  try {
    await db.transaction(async (tx) => {
      // Lock the appointment row so a concurrent cancel or reschedule waits.
      const [current] = await tx
        .select({
          status: appointments.status,
          doctorId: appointments.doctorId,
          oldAvailabilityId: appointments.availabilityId,
          slotDate: availability.slotDate,
          startTime: availability.startTime,
        })
        .from(appointments)
        .innerJoin(patients, eq(appointments.patientId, patients.patientId))
        .innerJoin(availability, eq(appointments.availabilityId, availability.availabilityId))
        .where(
          and(
            eq(appointments.appointmentId, appointmentId),
            eq(patients.userId, session.user.id)
          )
        )
        .for("update", { of: appointments });

      if (!current) throw new Error("NOT_FOUND");
      if (current.status !== "BOOKED") throw new Error("NOT_RESCHEDULABLE");
      if (current.oldAvailabilityId === newAvailabilityId) throw new Error("SAME_SLOT");

      const hoursLeft =
        (slotStartUtc(current.slotDate, current.startTime).getTime() - Date.now()) / 3_600_000;
      if (hoursLeft < MIN_HOURS_BEFORE_RESCHEDULE) throw new Error("TOO_LATE");

      // Claim the new slot: same doctor, still free.
      const claimed = await tx
        .update(availability)
        .set({ status: "BOOKED" })
        .where(
          and(
            eq(availability.availabilityId, newAvailabilityId),
            eq(availability.doctorId, current.doctorId),
            eq(availability.status, "AVAILABLE")
          )
        )
        .returning({ slotDate: availability.slotDate, startTime: availability.startTime });
      if (claimed.length === 0) throw new Error("SLOT_TAKEN");
      if (slotStartUtc(claimed[0].slotDate, claimed[0].startTime).getTime() <= Date.now()) {
        throw new Error("SLOT_PAST");
      }

      await tx
        .update(availability)
        .set({ status: "AVAILABLE" })
        .where(eq(availability.availabilityId, current.oldAvailabilityId));
      await tx
        .update(appointments)
        .set({ availabilityId: newAvailabilityId })
        .where(eq(appointments.appointmentId, appointmentId));

      // Step 6: enqueue the "rescheduled" email and refresh reminders here.
    });
  } catch (e) {
    if (e instanceof Error && e.message in rescheduleErrors) {
      return { error: rescheduleErrors[e.message] };
    }
    throw e;
  }

  revalidatePath("/patient");
  revalidatePath("/doctor");
  redirect("/patient");
}
