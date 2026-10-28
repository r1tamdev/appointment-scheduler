import Link from "next/link";
import { signOutAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b">
        <nav className="mx-auto flex max-w-5xl items-center justify-between p-4">
          <div className="flex items-center gap-6 text-sm">
            <span className="font-semibold">Patient Portal</span>
            <Link href="/patient" className="hover:underline">My appointments</Link>
            <Link href="/patient/doctors" className="hover:underline">Find doctors</Link>
          </div>
          <form action={signOutAction}>
            <Button type="submit" variant="outline" size="sm">Sign out</Button>
          </form>
        </nav>
      </header>
      <main className="mx-auto max-w-5xl p-4">{children}</main>
    </div>
  );
}
