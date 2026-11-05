"use server";

import { z } from "zod";
import { and, eq, gt, lt, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { availability, availabilityRules, appointments } from "@/db/schema";
import { requireRole } from "@/lib/session";
import { getOrCreateDoctor } from "@/lib/profiles";
import { ensureUpcomingAvailability } from "@/lib/availability/generate";
import { clinicToday } from "@/lib/time";

type FormState = { error?: string; success?: string } | null;

const scheduleSchema = z.object({
  schedulingType: z.enum(["WAVE", "STREAM"]),

  recurrenceType: z.enum([
    "ONCE",
    "WEEKLY",
    "DATES",
  ]),

  specificDate: z.string().optional(),

  startTime: z.string().regex(/^\d{2}:\d{2}$/),

  endTime: z.string().regex(/^\d{2}:\d{2}$/),

  intervalMinutes: z.coerce
    .number()
    .int()
    .min(5)
    .max(240),

  capacity: z.coerce
    .number()
    .int()
    .min(1)
    .max(100),

  selectedDates: z.string().optional(),
});

function datesInRange(start: string, days: number) {
  const result: string[] = [];

  const date = new Date(`${start}T00:00:00Z`);

  for (let i = 0; i <= days; i++) {
    result.push(date.toISOString().slice(0, 10));

    date.setUTCDate(date.getUTCDate() + 1);
  }

  return result;
}

export async function createScheduleAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await requireRole("DOCTOR");

  const parsed = scheduleSchema.safeParse({
    schedulingType: formData.get("schedulingType"),
    recurrenceType: formData.get("recurrenceType"),
    specificDate: formData.get("specificDate") ?? undefined,
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    intervalMinutes: formData.get("intervalMinutes"),
    capacity: formData.get("capacity"),
    selectedDates: formData.get("selectedDates") ?? undefined,
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0].message,
    };
  }

  const data = parsed.data;

  const today = clinicToday();

  const startMinutes =
    Number(data.startTime.slice(0, 2)) * 60 +
    Number(data.startTime.slice(3, 5));

  const endMinutes =
    Number(data.endTime.slice(0, 2)) * 60 +
    Number(data.endTime.slice(3, 5));

  if (endMinutes <= startMinutes) {
    return {
      error: "End time must be after start time.",
    };
  }

  if (
    (endMinutes - startMinutes) %
      data.intervalMinutes !==
    0
  ) {
    return {
      error:
        "The interval must divide evenly into the scheduling window.",
    };
  }

  const doctor = await getOrCreateDoctor(
    session.user.id
  );

  const weekdays = formData
    .getAll("weekdays")
    .map(Number);

  if (data.recurrenceType === "ONCE") {
    if (
      !data.specificDate ||
      !/^\d{4}-\d{2}-\d{2}$/.test(data.specificDate)
    ) {
      return {
        error: "Choose the schedule date.",
      };
    }

    if (data.specificDate < today) {
      return {
        error: "You can't schedule in the past.",
      };
    }
  }

 
  if (data.recurrenceType === "WEEKLY") {
    if (
      !weekdays.length ||
      weekdays.some(
        (d) =>
          !Number.isInteger(d) ||
          d < 0 ||
          d > 6
      )
    ) {
      return {
        error: "Choose at least one weekday.",
      };
    }
  }

  
  const selectedDates =
    data.recurrenceType === "DATES"
      ? (data.selectedDates ?? "")
          .split(",")
          .map((d) => d.trim())
          .filter(Boolean)
      : [];

  if (data.recurrenceType === "DATES") {
    if (
      !selectedDates.length ||
      selectedDates.some(
        (d) =>
          !/^\d{4}-\d{2}-\d{2}$/.test(d) ||
          d < today
      )
    ) {
      return {
        error:
          "Enter future dates in YYYY-MM-DD format, separated by commas.",
      };
    }

    if (new Set(selectedDates).size !== selectedDates.length) {
      return {
        error: "Remove duplicate selected dates.",
      };
    }
  }

  const dates =
    data.recurrenceType === "ONCE"
      ? [data.specificDate!]
      : data.recurrenceType === "DATES"
        ? selectedDates
        : datesInRange(today, 90).filter((d) =>
            weekdays.includes(
              new Date(`${d}T00:00:00Z`).getUTCDay()
            )
          );

  const existing = dates.length
    ? await db
        .select({
          date: availability.slotDate,
          start: availability.startTime,
          end: availability.endTime,
        })
        .from(availability)
        .where(
          and(
            eq(
              availability.doctorId,
              doctor.doctorId
            ),
            lt(
              availability.startTime,
              `${data.endTime}:00`
            ),
            gt(
              availability.endTime,
              `${data.startTime}:00`
            )
          )
        )
    : [];

  const dateSet = new Set(dates);

  if (
    existing.some((slot) =>
      dateSet.has(slot.date)
    )
  ) {
    return {
      error:
        "This schedule overlaps an existing availability on at least one selected date.",
    };
  }


  await db.insert(availabilityRules).values({
    doctorId: doctor.doctorId,

    schedulingType: data.schedulingType,

    recurrenceType: data.recurrenceType,

    specificDate:
      data.recurrenceType === "ONCE"
        ? data.specificDate!
        : null,

    weekdays:
      data.recurrenceType === "WEEKLY"
        ? weekdays
        : null,

    selectedDates:
      data.recurrenceType === "DATES"
        ? selectedDates
        : null,

    startTime: `${data.startTime}:00`,

    endTime: `${data.endTime}:00`,

    intervalMinutes: data.intervalMinutes,

    capacity: data.capacity,
  });


  await ensureUpcomingAvailability(
    doctor.doctorId
  );

  revalidatePath("/doctor/availability");
  revalidatePath("/patient/doctors");

  return {
    success:
      `${data.schedulingType === "WAVE" ? "Wave" : "Stream"} schedule created successfully.`,
  };
}

export async function deleteSlotAction(formData: FormData) {
  const session = await requireRole("DOCTOR");

  const id = Number(formData.get("availabilityId"));

  if (!Number.isInteger(id) || id <= 0) return;

  const doctor = await getOrCreateDoctor(session.user.id);

  await db.transaction(async (tx) => {
    // Lock the slot to prevent concurrent booking/deletion.
    const [slot] = await tx
      .select({
        availabilityId: availability.availabilityId,
        status: availability.status,
      })
      .from(availability)
      .where(
        and(
          eq(availability.availabilityId, id),
          eq(availability.doctorId, doctor.doctorId)
        )
      )
      .for("update");

    if (!slot || slot.status !== "AVAILABLE") {
      throw new Error("This slot is not available for deletion.");
    }

    // Check whether an active appointment exists.
    const [activeAppointment] = await tx
      .select({
        appointmentId: appointments.appointmentId,
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.availabilityId, id),
          eq(appointments.status, "BOOKED")
        )
      )
      .limit(1);

    if (activeAppointment) {
      throw new Error(
        "This slot has an active appointment and cannot be deleted."
      );
    }

    // Soft delete: preserve appointment history.
    await tx
      .update(availability)
      .set({ status: "CANCELLED" })
      .where(eq(availability.availabilityId, id));
  });

  revalidatePath("/doctor/availability");
  revalidatePath("/doctor");
  revalidatePath("/patient");
}