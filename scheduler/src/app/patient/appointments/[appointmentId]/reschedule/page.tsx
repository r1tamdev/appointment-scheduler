import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/session";
import { getOpenSlots, getPatientAppointment } from "@/lib/queries";
import { formatSlotDate, formatTime } from "@/lib/format";
import { RescheduleForm } from "./reschedule-form";

export default async function ReschedulePage({
  params,
}: {
  params: Promise<{ appointmentId: string }>;
}) {
  const session = await requireRole("PATIENT");
  const { appointmentId } = await params;
  const id = Number(appointmentId);
  if (!Number.isInteger(id)) notFound();

  const appt = await getPatientAppointment(id, session.user.id);
  if (!appt || appt.status !== "BOOKED") notFound();

  const slots = await getOpenSlots(appt.doctorId);
  const options = slots.map((s) => ({
    id: s.availabilityId,
    label: `${formatSlotDate(s.slotDate)} · ${formatTime(s.startTime)} – ${formatTime(s.endTime)}`,
  }));

  return (
    <div className="space-y-6">
      <Link href="/patient" className="text-sm underline">← Back to appointments</Link>

      <div className="rounded-md border p-4">
        <h1 className="text-2xl font-semibold">Reschedule appointment</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Dr. {appt.doctorName} · currently {formatSlotDate(appt.slotDate)},{" "}
          {formatTime(appt.startTime)} – {formatTime(appt.endTime)}
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="font-medium">Choose a new slot</h2>
        {options.length === 0 ? (
          <p className="rounded-md border p-6 text-center text-sm text-muted-foreground">
            No other open slots right now.
          </p>
        ) : (
          <RescheduleForm appointmentId={id} slots={options} />
        )}
      </section>
    </div>
  );
}