import { requireRole } from "@/lib/session";
import { getOrCreateDoctor } from "@/lib/profiles";
import { getDoctorSlots } from "@/lib/queries";
import { deleteSlotAction } from "@/actions/availability";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { formatSlotDate, formatTime } from "@/lib/format";
import { AddSlotForm } from "./add-slot-form";
import { clinicToday } from "@/lib/time";
import { DeleteSlotButton } from "@/components/delete-slot-button";

export default async function AvailabilityPage() {
  const session = await requireRole("DOCTOR");
  const doctor = await getOrCreateDoctor(session.user.id);
  const slots = await getDoctorSlots(doctor.doctorId);
  const today = clinicToday();

return (
    <div className="space-y-6">

      <div>
        <h1 className="text-2xl font-semibold">
          Availability
        </h1>

        <p className="text-sm text-muted-foreground">
          Manage your Wave and Stream schedules.
        </p>
      </div>

      <AddSlotForm minDate={today} />

      {slots.length === 0 ? (
        <p className="rounded-md border p-6 text-center text-sm text-muted-foreground">
          No upcoming slots yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border">

          <table className="w-full text-left text-sm">

            <thead className="border-b bg-muted/50">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">Time</th>
                <th className="p-3">Type</th>
                <th className="p-3">Capacity</th>
                <th className="p-3">Status</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>

            <tbody>
              {slots.map((s) => (
                <tr
                  key={s.availabilityId}
                  className="border-b last:border-0"
                >
                  <td className="p-3">
                    {formatSlotDate(s.slotDate)}
                  </td>

                  <td className="p-3">
                    {formatTime(s.startTime)} –{" "}
                    {formatTime(s.endTime)}
                  </td>

                  <td className="p-3">
                    {s.schedulingType}
                  </td>

                  <td className="p-3">
                    {s.bookedCount}/{s.capacity}
                  </td>

                  <td className="p-3">
                    <StatusBadge
                      status={
                        s.bookedCount >= s.capacity
                          ? "FULL"
                          : s.status
                      }
                    />
                  </td>

                  <td className="p-3">
                  {s.status === "AVAILABLE" ? (
                  <DeleteSlotButton
                  availabilityId={s.availabilityId}
                  />
                  ) : (
                  <span className="text-xs text-muted-foreground">
                  Not deletable
                  </span>
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