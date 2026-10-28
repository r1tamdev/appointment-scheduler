import Link from "next/link";
import { requireRole } from "@/lib/session";
import { getOrCreateDoctor } from "@/lib/profiles";
import { getDoctorAppointments } from "@/lib/queries";
import { cancelAppointmentAction, completeAppointmentAction } from "@/actions/appointments";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { formatSlotDate, formatTime } from "@/lib/format";

export default async function DoctorDashboard() {
  const session = await requireRole("DOCTOR");
  const doctor = await getOrCreateDoctor(session.user.id);
  const rows = await getDoctorAppointments(doctor.doctorId);

  const booked = rows.filter((r) => r.status === "BOOKED").length;
  const completed = rows.filter((r) => r.status === "COMPLETED").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Welcome, Dr. {session.user.name}</h1>
        <p className="text-sm text-muted-foreground">Your appointments</p>
      </div>

      {!doctor.specialization && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Your profile is incomplete, so patients can't find you yet.{" "}
          <Link href="/doctor/profile" className="font-medium underline">Complete your profile</Link>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-md border p-4">
          <p className="text-sm text-muted-foreground">Upcoming</p>
          <p className="text-2xl font-semibold">{booked}</p>
        </div>
        <div className="rounded-md border p-4">
          <p className="text-sm text-muted-foreground">Completed</p>
          <p className="text-2xl font-semibold">{completed}</p>
        </div>
        <div className="rounded-md border p-4">
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="text-2xl font-semibold">{rows.length}</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-md border p-6 text-center text-sm text-muted-foreground">
          No appointments yet. Add availability slots so patients can book you.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="p-3">Patient</th>
                <th className="p-3">Date</th>
                <th className="p-3">Time</th>
                <th className="p-3">Reason</th>
                <th className="p-3">Status</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.appointmentId} className="border-b last:border-0">
                  <td className="p-3">
                    <div className="font-medium">{r.patientName}</div>
                    <div className="text-xs text-muted-foreground">{r.patientEmail}</div>
                  </td>
                  <td className="p-3">{formatSlotDate(r.slotDate)}</td>
                  <td className="p-3">{formatTime(r.startTime)} – {formatTime(r.endTime)}</td>
                  <td className="p-3">{r.reason || "—"}</td>
                  <td className="p-3"><StatusBadge status={r.status} /></td>
                  <td className="p-3">
                    {r.status === "BOOKED" && (
                      <div className="flex gap-2">
                        <form action={completeAppointmentAction}>
                          <input type="hidden" name="appointmentId" value={r.appointmentId} />
                          <Button type="submit" size="sm">Complete</Button>
                        </form>
                        <form action={cancelAppointmentAction}>
                          <input type="hidden" name="appointmentId" value={r.appointmentId} />
                          <Button type="submit" size="sm" variant="outline">Cancel</Button>
                        </form>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
