"use server";

import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { appointments, availability, doctors, patients, payments, user } from "@/db/schema";
import { requireRole } from "@/lib/session";
import { getOrCreatePatient } from "@/lib/profiles";
import { getPaymentProvider } from "@/lib/payments";
import { ConfirmPayment } from "@/lib/payments/confirm";
import { holdExpiry, releaseExpiredHolds, releaseHold } from "@/lib/payments/holds";
import { slotStartUtc } from "@/lib/time";

export type StartBookingResult =
  | { error: string }
  | { free: true }
  | {
      free: false;
      appointmentId: number;
      orderId: string;
      amount: number;
      currency: string;
      keyId: string;
      doctorName: string;
      patientName: string;
      patientEmail: string;
    };

const startSchema = z.object({
  availabilityId: z.coerce.number().int().positive("Pick a time slot"),
  reason: z.string().max(300, "Reason is too long").optional(),
});

const startErrors: Record<string, string> = {
  SLOT_TAKEN: "Sorry, that slot was just taken. Please pick another.",
  SLOT_PAST: "That slot is no longer available.",
  BAD_FEE: "This doctor's fee is not valid for online payment. Please contact support.",
};

export async function startBookingAction(formData: FormData): Promise<StartBookingResult> {
  const session = await requireRole("PATIENT");
  const parsed = startSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { availabilityId, reason } = parsed.data;

  await releaseExpiredHolds();
  const patient = await getOrCreatePatient(session.user.id);

  // Phase 1: claim the slot and create the appointment atomically.
  let held: { appointmentId: number; amountPaise: number; doctorName: string };
  try {
    held = await db.transaction(async (tx) => {
      const claimed = await tx
        .update(availability)
        .set({ status: "HELD" })
        .where(
          and(eq(availability.availabilityId, availabilityId), eq(availability.status, "AVAILABLE"))
        )
        .returning({
          doctorId: availability.doctorId,
          slotDate: availability.slotDate,
          startTime: availability.startTime,
        });
      if (claimed.length === 0) throw new Error("SLOT_TAKEN");
      const slot = claimed[0];
      if (slotStartUtc(slot.slotDate, slot.startTime).getTime() <= Date.now()) {
        throw new Error("SLOT_PAST");
      }

      const [doc] = await tx
        .select({ fee: doctors.consultationFee, name: user.name })
        .from(doctors)
        .innerJoin(user, eq(doctors.userId, user.id))
        .where(eq(doctors.doctorId, slot.doctorId));
      const amountPaise = Math.round(Number(doc?.fee ?? 0) * 100);
      if (amountPaise < 0 || (amountPaise > 0 && amountPaise < 100)) throw new Error("BAD_FEE");

      const free = amountPaise === 0;
      if (free) {
        await tx
          .update(availability)
          .set({ status: "BOOKED" })
          .where(eq(availability.availabilityId, availabilityId));
      }

      const [appt] = await tx
        .insert(appointments)
        .values({
          patientId: patient.patientId,
          doctorId: slot.doctorId,
          availabilityId,
          reason: reason?.trim() || null,
          status: free ? "BOOKED" : "PENDING_PAYMENT",
          holdExpiresAt: free ? null : holdExpiry(),
        })
        .returning({ appointmentId: appointments.appointmentId });

      return { appointmentId: appt.appointmentId, amountPaise, doctorName: doc?.name ?? "" };
    });
  } catch (e) {
    if (e instanceof Error && e.message in startErrors) return { error: startErrors[e.message] };
    throw e;
  }

  // Free consultation: confirmed immediately.
  if (held.amountPaise === 0) {
    // Step 6: enqueue the booking email here.
    revalidatePath("/patient");
    revalidatePath("/doctor");
    return { free: true };
  }

  // Phase 2: create the payment order. This is a network call, so it runs outside the transaction.
  try {
    const provider = getPaymentProvider();
    const order = await provider.createOrder({
      amountPaise: held.amountPaise,
      currency: "INR",
      receipt: `appt_${held.appointmentId}`,
      notes: { appointmentId: String(held.appointmentId) },
    });
    await db.insert(payments).values({
      appointmentId: held.appointmentId,
      provider: provider.name,
      providerOrderId: order.orderId,
      amount: order.amount,
      currency: order.currency,
    });
    return {
      free: false,
      appointmentId: held.appointmentId,
      orderId: order.orderId,
      amount: order.amount,
      currency: order.currency,
      keyId: provider.publicKey,
      doctorName: held.doctorName,
      patientName: session.user.name,
      patientEmail: session.user.email,
    };
  } catch (e) {
    console.error("Could not create payment order", e);
    await releaseHold(held.appointmentId, "SYSTEM"); // don't leave the slot stuck
    return { error: "Could not start the payment. Please try again." };
  }
}

const verifySchema = z.object({
  appointmentId: z.number().int().positive(),
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});

async function patientOwnsAppointment(appointmentId: number, userId: string) {
  const [row] = await db
    .select({ id: appointments.appointmentId })
    .from(appointments)
    .innerJoin(patients, eq(appointments.patientId, patients.patientId))
    .where(and(eq(appointments.appointmentId, appointmentId), eq(patients.userId, userId)));
  return Boolean(row);
}

export async function verifyPaymentAction(
  input: z.infer<typeof verifySchema>
): Promise<{ ok: true } | { error: string }> {
  const session = await requireRole("PATIENT");
  const parsed = verifySchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid payment details." };
  const d = parsed.data;

  if (!(await patientOwnsAppointment(d.appointmentId, session.user.id))) {
    return { error: "Payment not found." };
  }
  const [pay] = await db
    .select({ orderId: payments.providerOrderId })
    .from(payments)
    .where(eq(payments.appointmentId, d.appointmentId));
  if (!pay || pay.orderId !== d.razorpayOrderId) return { error: "Payment not found." };

  const valid = getPaymentProvider().verifyCheckoutSignature({
    orderId: d.razorpayOrderId,
    paymentId: d.razorpayPaymentId,
    signature: d.razorpaySignature,
  });
  if (!valid) return { error: "Payment verification failed." };

  const outcome = await ConfirmPayment({
    providerOrderId: d.razorpayOrderId,
    providerPaymentId: d.razorpayPaymentId,
  });

  revalidatePath("/patient");
  revalidatePath("/doctor");

  if (outcome === "LATE_NEEDS_REFUND" || outcome === "NOT_FOUND") {
    return {
      error: "Your payment arrived after the slot was released. It will be refunded automatically.",
    };
  }
  return { ok: true };
}

export async function releaseHoldAction(appointmentId: number) {
  const session = await requireRole("PATIENT");
  if (!(await patientOwnsAppointment(appointmentId, session.user.id))) return;
  await releaseHold(appointmentId, "PATIENT");
  revalidatePath("/patient");
}