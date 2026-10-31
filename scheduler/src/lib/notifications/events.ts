import { eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { appointments, availability, doctors, patients, payments, user } from "@/db/schema";
import { formatSlotDate, formatTime } from "@/lib/format";
import { enqueueNotification, type Executor } from "./outbox";
import type { TemplatePayload } from "./templates";

const patientUser = alias(user, "patient_user");
const doctorUser = alias(user, "doctor_user");

async function loadContext(ex: Executor, appointmentId: number) {
  const [row] = await ex
    .select({
      patientUserId: patientUser.id,
      patientName: patientUser.name,
      patientEmail: patientUser.email,
      doctorUserId: doctorUser.id,
      doctorName: doctorUser.name,
      doctorEmail: doctorUser.email,
      slotDate: availability.slotDate,
      startTime: availability.startTime,
      endTime: availability.endTime,
      paymentStatus: payments.status,
      paymentAmount: payments.amount,
      paymentRef: payments.providerPaymentId,
    })
    .from(appointments)
    .innerJoin(patients, eq(appointments.patientId, patients.patientId))
    .innerJoin(patientUser, eq(patients.userId, patientUser.id))
    .innerJoin(doctors, eq(appointments.doctorId, doctors.doctorId))
    .innerJoin(doctorUser, eq(doctors.userId, doctorUser.id))
    .innerJoin(availability, eq(appointments.availabilityId, availability.availabilityId))
    .leftJoin(payments, eq(payments.appointmentId, appointments.appointmentId))
    .where(eq(appointments.appointmentId, appointmentId));
  return row;
}

type Context = NonNullable<Awaited<ReturnType<typeof loadContext>>>;

function basePayload(c: Context): Omit<TemplatePayload, "recipientName" | "recipientRole" | "portalPath"> {
  return {
    doctorName: c.doctorName,
    patientName: c.patientName,
    dateLabel: formatSlotDate(c.slotDate),
    timeLabel: `${formatTime(c.startTime)} – ${formatTime(c.endTime)}`,
  };
}

const forPatient = (c: Context, extra: Partial<TemplatePayload> = {}): TemplatePayload => ({
  ...basePayload(c),
  recipientName: c.patientName,
  recipientRole: "PATIENT",
  portalPath: "/patient",
  ...extra,
});

const forDoctor = (c: Context, extra: Partial<TemplatePayload> = {}): TemplatePayload => ({
  ...basePayload(c),
  recipientName: c.doctorName,
  recipientRole: "DOCTOR",
  portalPath: "/doctor",
  ...extra,
});

export async function enqueueBookingEmails(ex: Executor, appointmentId: number) {
  const c = await loadContext(ex, appointmentId);
  if (!c) return;
  const id = appointmentId;

  await enqueueNotification(ex, {
    type: "BOOKING_CONFIRMED",
    toUserId: c.patientUserId,
    toAddress: c.patientEmail,
    appointmentId: id,
    payload: forPatient(c),
    dedupeKey: `appt:${id}:booked:patient`,
  });
  await enqueueNotification(ex, {
    type: "NEW_BOOKING_DOCTOR",
    toUserId: c.doctorUserId,
    toAddress: c.doctorEmail,
    appointmentId: id,
    payload: forDoctor(c),
    dedupeKey: `appt:${id}:booked:doctor`,
  });

  if (c.paymentStatus === "PAID" && c.paymentAmount) {
    await enqueueNotification(ex, {
      type: "PAYMENT_RECEIVED",
      toUserId: c.patientUserId,
      toAddress: c.patientEmail,
      appointmentId: id,
      payload: forPatient(c, {
        amountLabel: `₹${(c.paymentAmount / 100).toFixed(2)}`,
        paymentRef: c.paymentRef ?? "—",
        portalPath: "/patient",
      }),
      dedupeKey: `appt:${id}:payment:received`,
    });
  }
}

export async function enqueueCancellationEmails(
  ex: Executor,
  appointmentId: number,
  cancelledBy: "PATIENT" | "DOCTOR" | "SYSTEM"
) {
  const c = await loadContext(ex, appointmentId);
  if (!c) return;
  const id = appointmentId;
  const paid = c.paymentStatus === "PAID" && (c.paymentAmount ?? 0) > 0;

  await enqueueNotification(ex, {
    type: "APPOINTMENT_CANCELLED",
    toUserId: c.patientUserId,
    toAddress: c.patientEmail,
    appointmentId: id,
    payload: forPatient(c, { cancelledBy, mentionRefund: paid }),
    dedupeKey: `appt:${id}:cancelled:patient`,
  });
  await enqueueNotification(ex, {
    type: "APPOINTMENT_CANCELLED",
    toUserId: c.doctorUserId,
    toAddress: c.doctorEmail,
    appointmentId: id,
    payload: forDoctor(c, { cancelledBy }),
    dedupeKey: `appt:${id}:cancelled:doctor`,
  });
}

export async function enqueueRescheduleEmails(
  ex: Executor,
  appointmentId: number,
  newAvailabilityId: number,
  old: { slotDate: string; startTime: string }
) {
  const c = await loadContext(ex, appointmentId); // already shows the NEW slot
  if (!c) return;
  const id = appointmentId;
  const oldFields = {
    oldDateLabel: formatSlotDate(old.slotDate),
    oldTimeLabel: formatTime(old.startTime),
  };

  await enqueueNotification(ex, {
    type: "APPOINTMENT_RESCHEDULED",
    toUserId: c.patientUserId,
    toAddress: c.patientEmail,
    appointmentId: id,
    payload: forPatient(c, oldFields),
    dedupeKey: `appt:${id}:rescheduled:${newAvailabilityId}:patient`,
  });
  await enqueueNotification(ex, {
    type: "APPOINTMENT_RESCHEDULED",
    toUserId: c.doctorUserId,
    toAddress: c.doctorEmail,
    appointmentId: id,
    payload: forDoctor(c, oldFields),
    dedupeKey: `appt:${id}:rescheduled:${newAvailabilityId}:doctor`,
  });
}