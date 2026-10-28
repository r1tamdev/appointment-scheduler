"use server";

import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { appointments, availability, doctors, patients } from "@/db/schema";
import { getSession, requireRole } from "@/lib/session";
import { getOrCreateDoctor, getOrCreatePatient } from "@/lib/profiles";

type FormState = { error: string } | null;

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
      .set({ status: "CANCELLED" })
      .where(eq(appointments.appointmentId, id));
    await tx
      .update(availability)
      .set({ status: "AVAILABLE" })
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
