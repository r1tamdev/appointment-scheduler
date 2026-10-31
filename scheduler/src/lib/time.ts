export const CLINIC_TIMEZONE="Asia/Kolkata";
const CLINIC_UTC_OFFSET="+05:30"; 

export function slotStartUtc(slotDate: string, startTime: string): Date {
  return new Date(`${slotDate}T${startTime.slice(0, 5)}:00${CLINIC_UTC_OFFSET}`);
}
