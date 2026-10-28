"use server";

import { z } from "zod";
import { and, eq, gt, lt } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { availability } from "@/db/schema";
import { requireRole } from "@/lib/session";
import { getOrCreateDoctor } from "@/lib/profiles";

type FormState = { error?: string; success?: string } | null;

const slotSchema = z
  .object({
    slotDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, "Pick a start time"),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, "Pick an end time"),
  })
  .refine((d) => d.endTime > d.startTime, {
    message: "End time must be after start time",
    path: ["endTime"],
  });

export async function addSlotAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireRole("DOCTOR");
  const parsed = slotSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { slotDate, startTime, endTime } = parsed.data;
  const today = new Date().toISOString().slice(0, 10);
  if (slotDate < today) return { error: "You can't add a slot in the past" };

  const doctor = await getOrCreateDoctor(session.user.id);

  const overlap = await db
    .select({ id: availability.availabilityId })
    .from(availability)
    .where(
      and(
        eq(availability.doctorId, doctor.doctorId),
        eq(availability.slotDate, slotDate),
        lt(availability.startTime, endTime),
        gt(availability.endTime, startTime)
      )
    )
    .limit(1);
  if (overlap.length > 0) return { error: "This overlaps with an existing slot" };

  await db.insert(availability).values({
    doctorId: doctor.doctorId,
    slotDate,
    startTime,
    endTime,
  });

  revalidatePath("/doctor/availability");
  return { success: "Slot added" };
}

export async function deleteSlotAction(formData: FormData) {
  const session = await requireRole("DOCTOR");
  const id = Number(formData.get("availabilityId"));
  if (!Number.isInteger(id)) return;

  const doctor = await getOrCreateDoctor(session.user.id);
  await db
    .delete(availability)
    .where(
      and(
        eq(availability.availabilityId, id),
        eq(availability.doctorId, doctor.doctorId),
        eq(availability.status, "AVAILABLE")
      )
    );
  revalidatePath("/doctor/availability");
}
