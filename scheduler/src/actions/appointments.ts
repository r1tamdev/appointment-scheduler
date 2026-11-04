
"use server";

import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";

import { db } from "@/db";

import {
  appointments,
  availability,
  doctors,
  patients,
} from "@/db/schema";

import {
  getSession,
  requireRole,
} from "@/lib/session";

import {
  getOrCreateDoctor,
} from "@/lib/profiles";

import { slotStartUtc } from "@/lib/time";

import {
  reserveCapacity,
  releaseCapacity,
} from "@/lib/availability/capacity";

import {
  dispatchInBackground,
} from "@/lib/notifications/dispatcher";

import {
  enqueueCancellationEmails,
  enqueueRescheduleEmails,
} from "@/lib/notifications/events";

type FormState = {
  error: string;
} | null;

// CANCEL APPOINTMENT

export async function cancelAppointmentAction(
  formData: FormData
) {
  const session = await getSession();

  if (!session) redirect("/signin");

  const id = Number(
    formData.get("appointmentId")
  );

  if (!Number.isInteger(id)) return;

  const [row] = await db
    .select({
      status: appointments.status,
      availabilityId: appointments.availabilityId,
      patientUserId: patients.userId,
      doctorUserId: doctors.userId,
    })
    .from(appointments)
    .innerJoin(
      patients,
      eq(appointments.patientId, patients.patientId)
    )
    .innerJoin(
      doctors,
      eq(appointments.doctorId, doctors.doctorId)
    )
    .where(
      eq(appointments.appointmentId, id)
    );

  if (!row || row.status !== "BOOKED") return;

  if (
    session.user.id !== row.patientUserId &&
    session.user.id !== row.doctorUserId
  ) {
    return;
  }

  const cancelledBy =
    session.user.id === row.doctorUserId
      ? "DOCTOR"
      : "PATIENT";

  await db.transaction(async (tx) => {
    await tx
      .update(appointments)
      .set({
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelledBy,
      })
      .where(
        eq(appointments.appointmentId, id)
      );

    await releaseCapacity(
      tx,
      row.availabilityId
    );

    await enqueueCancellationEmails(
      tx,
      id,
      cancelledBy
    );
  });

  after(dispatchInBackground);

  revalidatePath("/patient");
  revalidatePath("/doctor");
}

// COMPLETE APPOINTMENT

export async function completeAppointmentAction(
  formData: FormData
) {
  const session = await requireRole("DOCTOR");

  const id = Number(
    formData.get("appointmentId")
  );

  if (!Number.isInteger(id)) return;

  const doctor = await getOrCreateDoctor(
    session.user.id
  );

  await db
    .update(appointments)
    .set({
      status: "COMPLETED",
    })
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

// RESCHEDULE APPOINTMENT

const MIN_HOURS_BEFORE_RESCHEDULE = 2;

const rescheduleSchema = z.object({
  appointmentId: z.coerce
    .number()
    .int()
    .positive(),

  newAvailabilityId: z.coerce
    .number()
    .int()
    .positive("Pick a new time slot"),
});

const rescheduleErrors: Record<string, string> = {
  NOT_FOUND: "Appointment not found.",

  NOT_RESCHEDULABLE:
    "Only confirmed appointments can be rescheduled.",

  SAME_SLOT: "Pick a different slot.",

  TOO_LATE:
    `Appointments can be rescheduled up to ${MIN_HOURS_BEFORE_RESCHEDULE} hours before the start time.`,

  SLOT_TAKEN:
    "Sorry, that slot was just booked. Please pick another.",

  SLOT_PAST:
    "That slot is no longer available.",
};

export async function rescheduleAppointmentAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await requireRole("PATIENT");

  const parsed = rescheduleSchema.safeParse(
    Object.fromEntries(formData)
  );

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0].message,
    };
  }

  const {
    appointmentId,
    newAvailabilityId,
  } = parsed.data;

  try {
    await db.transaction(async (tx) => {

      // Lock appointment to prevent concurrent changes.
      const [current] = await tx
        .select({
          status: appointments.status,
          doctorId: appointments.doctorId,
          oldAvailabilityId:
            appointments.availabilityId,
          slotDate: availability.slotDate,
          startTime: availability.startTime,
        })
        .from(appointments)
        .innerJoin(
          patients,
          eq(
            appointments.patientId,
            patients.patientId
          )
        )
        .innerJoin(
          availability,
          eq(
            appointments.availabilityId,
            availability.availabilityId
          )
        )
        .where(
          and(
            eq(
              appointments.appointmentId,
              appointmentId
            ),
            eq(
              patients.userId,
              session.user.id
            )
          )
        )
        .for("update", {
          of: appointments,
        });

      if (!current) {
        throw new Error("NOT_FOUND");
      }

      if (current.status !== "BOOKED") {
        throw new Error("NOT_RESCHEDULABLE");
      }

      if (
        current.oldAvailabilityId ===
        newAvailabilityId
      ) {
        throw new Error("SAME_SLOT");
      }

      const hoursLeft =
        (
          slotStartUtc(
            current.slotDate,
            current.startTime
          ).getTime() - Date.now()
        ) / 3_600_000;

      if (
        hoursLeft < MIN_HOURS_BEFORE_RESCHEDULE
      ) {
        throw new Error("TOO_LATE");
      }

      // Reserve the new interval first.
      const claimed = await reserveCapacity(
        tx,
        newAvailabilityId
      );

      if (
        claimed.length === 0 ||
        claimed[0].doctorId !== current.doctorId
      ) {
        throw new Error("SLOT_TAKEN");
      }

      if (
        slotStartUtc(
          claimed[0].slotDate,
          claimed[0].startTime
        ).getTime() <= Date.now()
      ) {
        throw new Error("SLOT_PAST");
      }

      // Release old interval.
      await releaseCapacity(
        tx,
        current.oldAvailabilityId
      );

      // Update appointment.
      await tx
        .update(appointments)
        .set({
          availabilityId: newAvailabilityId,
        })
        .where(
          eq(
            appointments.appointmentId,
            appointmentId
          )
        );

      // Notify patient and doctor.
      await enqueueRescheduleEmails(
        tx,
        appointmentId,
        newAvailabilityId,
        {
          slotDate: current.slotDate,
          startTime: current.startTime,
        }
      );
    });
  } catch (e) {
    if (
      e instanceof Error &&
      e.message in rescheduleErrors
    ) {
      return {
        error: rescheduleErrors[e.message],
      };
    }

    throw e;
  }

  after(dispatchInBackground);

  revalidatePath("/patient");
  revalidatePath("/doctor");

  redirect("/patient");
}
