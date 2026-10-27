import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { Button } from "@/components/ui/button";

async function RedirectIfSignedIn(){
  const session = await getSession();
  if(session) redirect ("/dashboard")
  return null;
}

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="text-4xl font-bold">Appointment Scheduler</h1>
      <p className="max-w-md text-muted-foreground">
        Book appointments with doctors, or manage your availability as a doctor.
      </p>
      <div className="flex gap-3">
        <Button>
          <Link href="/signup">Get started</Link>
        </Button>
        <Button variant="outline">
          <Link href="/signin">Sign in</Link>
        </Button>
      </div>
    </main>
  );
}
