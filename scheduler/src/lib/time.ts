
export const CLINIC_TIMEZONE = "Asia/Kolkata";

const CLINIC_UTC_OFFSET = "+05:30";

export function slotStartUtc(
  slotDate: string,
  startTime: string
): Date {
  return new Date(
    `${slotDate}T${startTime.slice(0, 5)}:00${CLINIC_UTC_OFFSET}`
  );
}

export function clinicToday(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: CLINIC_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value])
  );

  return `${values.year}-${values.month}-${values.day}`;
}
