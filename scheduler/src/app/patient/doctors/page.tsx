import Link from "next/link";
import { requireRole } from "@/lib/session";
import {
  getDoctorSpecializations,
  listDoctors,
} from "@/lib/queries";
import { Button } from "@/components/ui/button";

export default async function FindDoctorsPage({
  searchParams,
}: {
  searchParams: Promise<{ specialization?: string }>;
}) {
  await requireRole("PATIENT");

  const { specialization } = await searchParams;

  const selectedSpecialization = specialization?.trim() || undefined;

  // Fetch available specialisations and matching doctors.
  const [specializations, doctors] = await Promise.all([
    getDoctorSpecializations(),
    listDoctors(selectedSpecialization),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          Find a doctor
        </h1>

        <p className="text-sm text-muted-foreground">
          Select a specialisation to find the right doctor.
        </p>
      </div>

      {/* Specialisation Filter */}
      <form
        action="/patient/doctors"
        method="GET"
        className="flex max-w-md flex-col gap-3 sm:flex-row"
      >
        <select
          name="specialization"
          defaultValue={selectedSpecialization ?? ""}
          className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">
            All Specialisations
          </option>

          {specializations.map((specialization) => (
            <option
              key={specialization}
              value={specialization}
            >
              {specialization}
            </option>
          ))}
        </select>

        <Button type="submit">
          Apply Filter
        </Button>
      </form>

      {/* Selected Filter */}
      {selectedSpecialization && (
        <p className="text-sm text-muted-foreground">
          Showing doctors specialising in{" "}
          <span className="font-medium text-foreground">
            {selectedSpecialization}
          </span>
        </p>
      )}

      {/* Doctor Results */}
      {doctors.length === 0 ? (
        <p className="rounded-md border p-6 text-center text-sm text-muted-foreground">
          No doctors found for this specialisation.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {doctors.map((doctor) => (
            <div
              key={doctor.doctorId}
              className="space-y-3 rounded-md border p-4"
            >
              <div>
                <p className="font-medium">
                  Dr. {doctor.name}
                </p>

                <p className="text-sm text-muted-foreground">
                  {doctor.specialization}
                </p>
              </div>

              <p className="text-sm">
                {doctor.experienceYears ?? 0} yrs experience
                {" · "}
                ₹{Number(doctor.consultationFee ?? 0)}
              </p>

              <Button
                size="sm"
                nativeButton={false}
                render={
                  <Link
                    href={`/patient/doctors/${doctor.doctorId}`}
                  />
                }
              >
                View slots
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}