"use client";

import { useActionState } from "react";
import { addSlotAction } from "@/actions/availability";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AddSlotForm({ minDate }: { minDate: string }) {
  const [state, action, pending] = useActionState(addSlotAction, null);

  return (
    <form action={action} className="space-y-4 rounded-md border p-4">
      <h2 className="font-medium">Add a slot</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="slotDate">Date</Label>
          <Input id="slotDate" name="slotDate" type="date" min={minDate} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="startTime">Start time</Label>
          <Input id="startTime" name="startTime" type="time" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endTime">End time</Label>
          <Input id="endTime" name="endTime" type="time" required />
        </div>
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.success && <p className="text-sm text-green-700">{state.success}</p>}
      <Button type="submit" disabled={pending}>{pending ? "Adding..." : "Add slot"}</Button>
    </form>
  );
}
