import Link from "next/link";
import { signOutAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b">
        <nav className="mx-auto flex max-w-5xl items-center justify-between p-4">
          <div className="flex items-center gap-6 text-sm">
            <span className="font-semibold">Doctor Portal</span>
            <Link href="/doctor" className="hover:underline">Appointments</Link>
            <Link href="/doctor/availability" className="hover:underline">Availability</Link>
            <Link href="/doctor/profile" className="hover:underline">Profile</Link>
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
