"use client";

import { useActionState } from "react";
import { bookAppointmentAction } from "@/actions/appointments";
import { Button } from "@/components/ui/button";

type Slot = { id: number; label: string };

export function BookingForm({ slots }: { slots: Slot[] }) {
  const [state, action, pending] = useActionState(bookAppointmentAction, null);

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2">
        {slots.map((s) => (
          <label
            key={s.id}
            className="flex cursor-pointer items-center gap-2 rounded-md border p-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5"
          >
            <input type="radio" name="availabilityId" value={s.id} required />
            <span>{s.label}</span>
          </label>
        ))}
      </div>
      <textarea
        name="reason"
        rows={3}
        maxLength={300}
        placeholder="Reason for visit (optional)"
        className="border-input w-full rounded-md border bg-transparent p-3 text-sm"
      />
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Booking..." : "Book appointment"}
      </Button>
    </form>
  );
}
