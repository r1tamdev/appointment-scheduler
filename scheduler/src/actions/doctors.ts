"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { doctors } from "@/db/schema";
import { requireRole } from "@/lib/session";
import { getOrCreateDoctor } from "@/lib/profiles";

type FormState = { error?: string; success?: string } | null;

const profileSchema = z.object({
  specialization: z.string().min(2, "Enter a specialization").max(100),
  experienceYears: z.coerce.number().int().min(0, "Experience can't be negative").max(70),
  consultationFee: z.coerce.number().min(0, "Fee can't be negative").max(100000),
});

export async function saveDoctorProfileAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await requireRole("DOCTOR");
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const doctor = await getOrCreateDoctor(session.user.id);
  await db
    .update(doctors)
    .set({
      specialization: parsed.data.specialization,
      experienceYears: parsed.data.experienceYears,
      consultationFee: String(parsed.data.consultationFee),
    })
    .where(eq(doctors.doctorId, doctor.doctorId));

  revalidatePath("/doctor");
  revalidatePath("/doctor/profile");
  return { success: "Profile saved" };
}
