import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/session";
import { getDoctorById, getOpenSlots } from "@/lib/queries";
import { formatSlotDate, formatTime } from "@/lib/format";
import { BookingForm } from "./booking-form";

export default async function DoctorDetailPage({
  params,
}: {
  params: Promise<{ doctorId: string }>;
}) {
  await requireRole("PATIENT");
  const { doctorId } = await params;
  const id = Number(doctorId);
  if (!Number.isInteger(id)) notFound();

  const doctor = await getDoctorById(id);
  if (!doctor) notFound();

  const slots = await getOpenSlots(id);
  const options = slots.map((s) => ({
    id: s.availabilityId,
    label: `${formatSlotDate(s.slotDate)} · ${formatTime(s.startTime)} – ${formatTime(s.endTime)}`,
  }));

  return (
    <div className="space-y-6">
      <Link href="/patient/doctors" className="text-sm underline">← Back to doctors</Link>

      <div className="rounded-md border p-4">
        <h1 className="text-2xl font-semibold">Dr. {doctor.name}</h1>
        <p className="text-muted-foreground">{doctor.specialization}</p>
        <p className="mt-2 text-sm">
          {doctor.experienceYears ?? 0} yrs experience · ₹{Number(doctor.consultationFee ?? 0)} per consultation
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="font-medium">Available slots</h2>
        {options.length === 0 ? (
          <p className="rounded-md border p-6 text-center text-sm text-muted-foreground">
            No open slots right now. Please check back later.
          </p>
        ) : (
          <BookingForm slots={options} fee={Number(doctor.consultationFee ?? 0)} />
        )}
      </section>
    </div>
  );
}
