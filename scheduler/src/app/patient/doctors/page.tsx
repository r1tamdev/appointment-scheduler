import Link from "next/link";
import { requireRole } from "@/lib/session";
import { listDoctors } from "@/lib/queries";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default async function FindDoctorsPage({
  searchParams,
}: {
  searchParams: Promise<{ specialization?: string }>;
}) {
  await requireRole("PATIENT");
  const { specialization } = await searchParams;
  const q = specialization?.trim() || undefined;
  const doctors = await listDoctors(q);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Find a doctor</h1>
        <p className="text-sm text-muted-foreground">Search by specialization.</p>
      </div>

      <form className="flex max-w-md gap-2">
        <Input name="specialization" placeholder="e.g. Cardiology" defaultValue={q ?? ""} />
        <Button type="submit">Search</Button>
      </form>

      {doctors.length === 0 ? (
        <p className="rounded-md border p-6 text-center text-sm text-muted-foreground">
          No doctors found.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {doctors.map((d) => (
            <div key={d.doctorId} className="space-y-3 rounded-md border p-4">
              <div>
                <p className="font-medium">Dr. {d.name}</p>
                <p className="text-sm text-muted-foreground">{d.specialization}</p>
              </div>
              <p className="text-sm">
                {d.experienceYears ?? 0} yrs experience · ₹{Number(d.consultationFee ?? 0)}
              </p>
              <Button render={<Link
              href={`/patient/doctors/${d.doctorId}`}
              className={buttonVariants({ size: "sm" })}
              >
              View slots
              </Link>}>
            </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
