import { requireRole } from "@/lib/session";
import { getOrCreateDoctor } from "@/lib/profiles";
import { ProfileForm } from "./profile-form";

export default async function DoctorProfilePage() {
  const session = await requireRole("DOCTOR");
  const doctor = await getOrCreateDoctor(session.user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Profile</h1>
        <p className="text-sm text-muted-foreground">
          Patients see this when they browse doctors.
        </p>
      </div>
      <ProfileForm
        specialization={doctor.specialization ?? ""}
        experienceYears={doctor.experienceYears ?? ""}
        consultationFee={doctor.consultationFee ?? ""}
      />
    </div>
  );
}
