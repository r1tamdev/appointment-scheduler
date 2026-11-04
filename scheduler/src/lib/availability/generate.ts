
import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import {
  availability,
  availabilityRules,
} from "@/db/schema";
import { clinicToday } from "@/lib/time";

const HORIZON_DAYS = 90;

function dateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

function timeToMinutes(time: string) {
  const [hours, minutes] = time
    .slice(0, 5)
    .split(":")
    .map(Number);

  return hours * 60 + minutes;
}

function minutesToTime(value: number) {
  const hours = Math.floor(value / 60)
    .toString()
    .padStart(2, "0");

  const minutes = (value % 60)
    .toString()
    .padStart(2, "0");

  return `${hours}:${minutes}:00`;
}

function occursOn(
  rule: typeof availabilityRules.$inferSelect,
  date: string,
  weekday: number
) {
  if (rule.recurrenceType === "ONCE") {
    return rule.specificDate === date;
  }

  if (rule.recurrenceType === "WEEKLY") {
    return (rule.weekdays ?? []).includes(weekday);
  }

  if (rule.recurrenceType === "DATES") {
    return (rule.selectedDates ?? []).includes(date);
  }

  return false;
}


export async function ensureUpcomingAvailability(
  doctorId: number
) {
  const rules = await db
    .select()
    .from(availabilityRules)
    .where(
      and(
        eq(availabilityRules.doctorId, doctorId),
        eq(availabilityRules.isActive, true)
      )
    );

  if (!rules.length) return;

  const today = clinicToday();

  const start = new Date(`${today}T00:00:00Z`);
  const end = new Date(start);

  end.setUTCDate(end.getUTCDate() + HORIZON_DAYS);

  const startDate = dateString(start);
  const endDate = dateString(end);

  const existing = await db
    .select({
      ruleId: availability.ruleId,
      slotDate: availability.slotDate,
      startTime: availability.startTime,
    })
    .from(availability)
    .where(
      and(
        eq(availability.doctorId, doctorId),
        gte(availability.slotDate, startDate),
        lte(availability.slotDate, endDate)
      )
    );

  const existingKeys = new Set(
    existing.map(
      (s) =>
        `${s.ruleId}:${s.slotDate}:${s.startTime.slice(0, 5)}`
    )
  );

  const values: (typeof availability.$inferInsert)[] = [];

  for (const rule of rules) {
    const first =
      rule.recurrenceType === "ONCE"
        ? rule.specificDate
        : startDate;

    if (!first) continue;

    const from = new Date(`${first}T00:00:00Z`);

    const through =
      rule.recurrenceType === "ONCE"
        ? from
        : end;

    const startMinutes = timeToMinutes(rule.startTime);
    const endMinutes = timeToMinutes(rule.endTime);

    for (
      const cursor = new Date(from);
      cursor <= through;
      cursor.setUTCDate(cursor.getUTCDate() + 1)
    ) {
      const day = dateString(cursor);

      if (day < startDate || day > endDate) continue;

      if (!occursOn(rule, day, cursor.getUTCDay())) {
        continue;
      }

      for (
        let minute = startMinutes;
        minute + rule.intervalMinutes <= endMinutes;
        minute += rule.intervalMinutes
      ) {
        const startTime = minutesToTime(minute);

        const key =
          `${rule.ruleId}:${day}:${startTime.slice(0, 5)}`;

        if (existingKeys.has(key)) continue;

        existingKeys.add(key);

        values.push({
          doctorId,
          ruleId: rule.ruleId,
          schedulingType: rule.schedulingType,
          capacity: rule.capacity,
          bookedCount: 0,
          slotDate: day,
          startTime,
          endTime: minutesToTime(
            minute + rule.intervalMinutes
          ),
          status: "AVAILABLE",
        });
      }
    }
  }

  
  for (let i = 0; i < values.length; i += 300) {
    await db
      .insert(availability)
      .values(values.slice(i, i + 300))
      .onConflictDoNothing();
  }
}
