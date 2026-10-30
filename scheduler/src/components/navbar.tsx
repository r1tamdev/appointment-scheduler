import { Suspense } from "react";
import Link from "next/link";
import { CalendarCheck } from "lucide-react";
import { getSession } from "@/lib/session";
import { signOutAction } from "@/actions/auth";
import { Button, buttonVariants } from "@/components/ui/button";

const APP_NAME = "Schedula";

const doctorLinks = [
  { href: "/doctor", label: "Appointments" },
  { href: "/doctor/availability", label: "Availability" },
  { href: "/doctor/profile", label: "Profile" },
];

const patientLinks = [
  { href: "/patient", label: "My appointments" },
  { href: "/patient/doctors", label: "Find doctors" },
];

async function NavActions() {
  const session = await getSession();

  if (!session) {
    return (
      <div className="flex items-center gap-2">
        <Link href="/signin" className={buttonVariants({ variant: "ghost", className: "font-semibold" })}>
          Log in
        </Link>
        <Link href="/signup" className={buttonVariants({ className: "font-semibold" })}>
          Get started
        </Link>
      </div>
    );
  }

  const links = session.user.role === "DOCTOR" ? doctorLinks : patientLinks;

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-4 text-sm font-medium">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="hover:text-teal-700">
            {l.label}
          </Link>
        ))}
      </div>
      <form action={signOutAction}>
        <Button type="submit" variant="outline" size="sm" className="font-semibold">
          Sign out
        </Button>
      </form>
    </div>
  );
}

export function Navbar() {
  return (
    <header className="sticky top-0 z-20 border-b bg-white/80 backdrop-blur">
      <nav className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <CalendarCheck className="h-5 w-5 text-teal-600" />
          {APP_NAME}
        </Link>
        <Suspense fallback={null}>
          <NavActions />
        </Suspense>
      </nav>
    </header>
  );
}