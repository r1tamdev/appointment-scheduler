import Link from "next/link";
import { requireRole } from "@/lib/session";
import { getOrCreatePatient } from "@/lib/profiles";
import { getPatientAppointments } from "@/lib/queries";
import { cancelAppointmentAction } from "@/actions/appointments";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { formatSlotDate, formatTime } from "@/lib/format";

export default async function PatientDashboard() {
  const session = await requireRole("PATIENT");
  const patient = await getOrCreatePatient(session.user.id);
  const rows = await getPatientAppointments(patient.patientId);

  const upcoming = rows.filter((r) => r.status === "BOOKED");
  const history = rows.filter((r) => r.status === "COMPLETED" || r.status === "CANCELLED");

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Welcome, {session.user.name}</h1>
          <p className="text-sm text-muted-foreground">Your appointments</p>
        </div>
        <Button render={<Link href="/patient/doctors" />} nativeButton={false}>
        Book an appointment
        </Button>
      </div>

      <section className="space-y-3">
        <h2 className="font-medium">Upcoming</h2>
        {upcoming.length === 0 ? (
          <p className="rounded-md border p-6 text-center text-sm text-muted-foreground">
            No upcoming appointments.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {upcoming.map((r) => (
              <div key={r.appointmentId} className="space-y-2 rounded-md border p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">Dr. {r.doctorName}</p>
                    <p className="text-sm text-muted-foreground">{r.specialization}</p>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
                <p className="text-sm">
                  {formatSlotDate(r.slotDate)} · {formatTime(r.startTime)} – {formatTime(r.endTime)}
                </p>
                {r.reason && <p className="text-sm text-muted-foreground">Reason: {r.reason}</p>}
                <div className="flex gap-2">
  <Button
    size="sm"
    render={<Link href={`/patient/appointments/${r.appointmentId}/reschedule`} />}
    nativeButton={false}
  >
    Reschedule
  </Button>
  <form action={cancelAppointmentAction}>
    <input type="hidden" name="appointmentId" value={r.appointmentId} />
    <Button type="submit" size="sm" variant="outline">Cancel appointment</Button>
  </form>
</div>
              </div>
            ))}
          </div>
        )}
      </section>

      {history.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-medium">History</h2>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="p-3">Doctor</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Time</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {history.map((r) => (
                  <tr key={r.appointmentId} className="border-b last:border-0">
                    <td className="p-3">Dr. {r.doctorName}</td>
                    <td className="p-3">{formatSlotDate(r.slotDate)}</td>
                    <td className="p-3">{formatTime(r.startTime)} – {formatTime(r.endTime)}</td>
                    <td className="p-3"><StatusBadge status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
