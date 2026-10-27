import { requireRole } from "@/lib/session";
import { signOutAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";

export const instant = false;

export default async function DoctorPage() {
  const session = await requireRole("DOCTOR");
  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Doctor dashboard</h1>
      <p>Welcome, Dr. {session.user.name}</p>
      <form action={signOutAction}>
        <Button type="submit" variant="outline">Sign out</Button>
      </form>
    </main>
  );
}