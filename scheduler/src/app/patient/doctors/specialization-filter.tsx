"use client";

export function SpecializationFilter({
  specializations,
  selectedSpecialization,
}: {
  specializations: string[];
  selectedSpecialization?: string;
}) {
  return (
    <form
      action="/patient/doctors"
      method="GET"
      className="max-w-md"
    >
      <select
        name="specialization"
        defaultValue={selectedSpecialization ?? ""}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <option value="">All Specializations</option>

        {specializations.map((specialization) => (
          <option key={specialization} value={specialization}>
            {specialization}
          </option>
        ))}
      </select>
    </form>
  );
}