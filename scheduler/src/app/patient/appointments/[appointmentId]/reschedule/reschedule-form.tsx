"use client";

import { useActionState } from "react";
import { rescheduleAppointmentAction } from "@/actions/appointments";
import { Button } from "@/components/ui/button";

type Slot = { id: number; label: string };

export function RescheduleForm({ appointmentId, slots }: { appointmentId: number; slots: Slot[] }) {
  const [state, action, pending] = useActionState(rescheduleAppointmentAction, null);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="appointmentId" value={appointmentId} />
      <div className="grid gap-2 sm:grid-cols-2">
        {slots.map((s) => (
          <label
            key={s.id}
            className="flex cursor-pointer items-center gap-2 rounded-md border p-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5"
          >
            <input type="radio" name="newAvailabilityId" value={s.id} required />
            <span>{s.label}</span>
          </label>
        ))}
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Rescheduling..." : "Confirm new time"}
      </Button>
    </form>
  );
}