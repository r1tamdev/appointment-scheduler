import { eq } from "drizzle-orm";
import { db } from "@/db";
import { doctors, patients } from "@/db/schema";

export async function getOrCreateDoctor(userId: string) {
  await db.insert(doctors).values({ userId }).onConflictDoNothing();
  const [row] = await db.select().from(doctors).where(eq(doctors.userId, userId));
  return row;
}

export async function getOrCreatePatient(userId: string) {
  await db.insert(patients).values({ userId }).onConflictDoNothing();
  const [row] = await db.select().from(patients).where(eq(patients.userId, userId));
  return row;
}
