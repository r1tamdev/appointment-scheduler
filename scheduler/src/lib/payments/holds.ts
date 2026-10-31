import { and, eq, inArray, lt } from "drizzle-orm";
import { db } from "@/db";
import { appointments, availability, payments } from "@/db/schema";

export const HOLD_MINUTES = 10;

export function holdExpiry() {
  return new Date(Date.now() + HOLD_MINUTES * 60_000);
}

export async function releaseHold(appointmentId: number, cancelledBy: "PATIENT" | "SYSTEM") {
  await db.transaction(async (tx) => {
    const [appt] = await tx
      .select({ status: appointments.status, availabilityId: appointments.availabilityId })
      .from(appointments)
      .where(eq(appointments.appointmentId, appointmentId))
      .for("update");
    if (!appt || appt.status !== "PENDING_PAYMENT") return;

    const [pay] = await tx
      .select({ status: payments.status })
      .from(payments)
      .where(eq(payments.appointmentId, appointmentId));
    if (pay?.status === "PAID") return;

    await tx
      .update(appointments)
      .set({ status: "EXPIRED", cancelledAt: new Date(), cancelledBy })
      .where(eq(appointments.appointmentId, appointmentId));
    await tx
      .update(availability)
      .set({ status: "AVAILABLE" })
      .where(eq(availability.availabilityId, appt.availabilityId));
    await tx
      .update(payments)
      .set({ status: "EXPIRED" })
      .where(and(eq(payments.appointmentId, appointmentId), eq(payments.status, "CREATED")));
  });
}

export async function releaseExpiredHolds() {
  await db.transaction(async (tx) => {
    const expired = await tx
      .update(appointments)
      .set({ status: "EXPIRED", cancelledAt: new Date(), cancelledBy: "SYSTEM" })
      .where(and(eq(appointments.status, "PENDING_PAYMENT"), lt(appointments.holdExpiresAt, new Date())))
      .returning({
        appointmentId: appointments.appointmentId,
        availabilityId: appointments.availabilityId,
      });
    if (expired.length === 0) return;

    await tx
      .update(availability)
      .set({ status: "AVAILABLE" })
      .where(inArray(availability.availabilityId, expired.map((e) => e.availabilityId)));
    await tx
      .update(payments)
      .set({ status: "EXPIRED" })
      .where(
        and(
          inArray(payments.appointmentId, expired.map((e) => e.appointmentId)),
          eq(payments.status, "CREATED")
        )
      );
  });
}