import { eq } from "drizzle-orm";

import { db } from "@/db";

import {
  appointments,
  payments,
} from "@/db/schema";

import {
  reserveCapacity,
} from "@/lib/availability/capacity";

import {
  enqueueBookingEmails,
} from "@/lib/notifications/events";

export type ConfirmOutcome =
  | "CONFIRMED"
  | "ALREADY_CONFIRMED"
  | "LATE_NEEDS_REFUND"
  | "NOT_FOUND";

export async function ConfirmPayment(p: {
  providerOrderId: string;
  providerPaymentId: string;
}): Promise<ConfirmOutcome> {

  return db.transaction(async (tx) => {

    const [payment] = await tx
      .select()
      .from(payments)
      .where(
        eq(
          payments.providerOrderId,
          p.providerOrderId
        )
      )
      .for("update");

    if (!payment) return "NOT_FOUND";

    if (payment.status === "PAID") {
      return "ALREADY_CONFIRMED";
    }

    await tx
      .update(payments)
      .set({
        status: "PAID",
        providerPaymentId: p.providerPaymentId,
        paidAt: new Date(),
        failureReason: null,
      })
      .where(
        eq(
          payments.paymentId,
          payment.paymentId
        )
      );

    const [appt] = await tx
      .select({
        status: appointments.status,
        availabilityId: appointments.availabilityId,
      })
      .from(appointments)
      .where(
        eq(
          appointments.appointmentId,
          payment.appointmentId
        )
      )
      .for("update");

    if (!appt) return "LATE_NEEDS_REFUND";

    if (appt.status === "PENDING_PAYMENT") {

      await tx
        .update(appointments)
        .set({
          status: "BOOKED",
          holdExpiresAt: null,
        })
        .where(
          eq(
            appointments.appointmentId,
            payment.appointmentId
          )
        );

      await enqueueBookingEmails(
        tx,
        payment.appointmentId
      );

      return "CONFIRMED";
    }

    // Payment arrived after the hold was expired.
    if (appt.status === "EXPIRED") {

      const reclaimed = await reserveCapacity(
        tx,
        appt.availabilityId
      );

      if (reclaimed.length > 0) {

        await tx
          .update(appointments)
          .set({
            status: "BOOKED",
            holdExpiresAt: null,
            cancelledAt: null,
            cancelledBy: null,
          })
          .where(
            eq(
              appointments.appointmentId,
              payment.appointmentId
            )
          );

        await enqueueBookingEmails(
          tx,
          payment.appointmentId
        );

        return "CONFIRMED";
      }
    }

    return "LATE_NEEDS_REFUND";
  });
}
