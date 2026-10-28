"use client";

import { useActionState } from "react";
import { saveDoctorProfileAction } from "@/actions/doctors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  specialization: string;
  experienceYears: number | "";
  consultationFee: string;
};

export function ProfileForm({ specialization, experienceYears, consultationFee }: Props) {
  const [state, action, pending] = useActionState(saveDoctorProfileAction, null);

  return (
    <form action={action} className="max-w-md space-y-4">
      <div className="space-y-2">
        <Label htmlFor="specialization">Specialization</Label>
        <Input id="specialization" name="specialization" defaultValue={specialization} placeholder="e.g. Cardiology" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="experienceYears">Years of experience</Label>
        <Input id="experienceYears" name="experienceYears" type="number" min={0} defaultValue={experienceYears} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="consultationFee">Consultation fee (₹)</Label>
        <Input id="consultationFee" name="consultationFee" type="number" min={0} step="1" defaultValue={consultationFee} required />
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.success && <p className="text-sm text-green-700">{state.success}</p>}
      <Button type="submit" disabled={pending}>{pending ? "Saving..." : "Save profile"}</Button>
    </form>
  );
}
