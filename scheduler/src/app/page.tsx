import { Suspense } from "react";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { buttonVariants } from "@/components/ui/button";
import {
  CalendarCheck,
  CalendarClock,
  BellRing,
  Stethoscope,
  UserPlus,
  CircleCheck,
  MailCheck,
  ShieldCheck,
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { connection } from "next/server";

const features = [
  { icon: Stethoscope, title: "Find the right doctor", text: "Search by specialization.", color: "bg-teal-100 text-teal-700" },
  { icon: CalendarCheck, title: "Pick a free slot", text: "See live availability.", color: "bg-sky-100 text-sky-700" },
  { icon: BellRing, title: "Track every booking", text: "Cancel or complete in one click.", color: "bg-amber-100 text-amber-700" },
];

const steps = [
  { icon: UserPlus, title: "Sign up", text: "Create a doctor or patient account." },
  { icon: Stethoscope, title: "Find a doctor", text: "Browse by specialization." },
  { icon: CalendarClock, title: "Book a slot", text: "Choose a time that suits you." },
  { icon: CalendarCheck, title: "Get seen", text: "The doctor sees it on their dashboard." },
];

async function HeroButtons() {
  const session = await getSession();
  if (session) {
    return (
      <Link href="/dashboard" className={buttonVariants({ size: "lg", className: "text-base font-semibold" })}>
        Go to dashboard
      </Link>
    );
  }
  return (
    <>
    <Link
  href="/signup"
  className={cn(
    buttonVariants({ size: "lg" }),
    "h-14 rounded-xl px-8 text-lg font-semibold sm:h-15 sm:rounded-2xl sm:px-8 sm:text-2xl"
  )}
>
  Book an appointment
</Link>
<Link
  href="/signin"
  className={cn(
    buttonVariants({ size: "lg", variant: "outline" }),
    "h-14 rounded-xl px-8 text-lg font-semibold sm:h-15 sm:rounded-2xl sm:px-8 sm:text-2xl"
  )}
>
  Visit Portal
</Link>
    </>
  );
}

async function CtaButton() {
  const session = await getSession();
  return (
    <Link
      href={session ? "/dashboard" : "/signup"}
      className={buttonVariants({ size: "lg", variant: "secondary", className: "mt-6 text-base font-semibold" })}
    >
      {session ? "Go to dashboard" : "Create account"}
    </Link>
  );
}

const highlights = [
  { icon: ShieldCheck, text: "Secure online payments" },
  { icon: MailCheck, text: "Instant email confirmation" },
  { icon: CalendarClock, text: "Reschedule or cancel anytime" },
];

async function SampleDate() {
  await connection(); 
  return new Date().toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Asia/Kolkata", 
  });
}

export default function Home() {
  return (
    <div>
      {/* Hero */}
      {/* Hero */}
<section className="relative isolate overflow-hidden bg-linear-to-br from-teal-50 via-sky-50 to-white">
  {/* Soft glow behind the headline */}
  <div
    aria-hidden
    className="pointer-events-none absolute -top-24 left-1/2 -z-10 h-96 w-96 -translate-x-1/2 rounded-full bg-teal-200/40 blur-3xl"
  />

    <div className="mx-auto max-w-5xl px-4 py-20 text-center">
    <span className="inline-block rounded-full bg-teal-100 px-3 py-1 text-xs font-medium text-teal-800">
    Online doctor appointments
    </span>
    <h1 className="mt-4 text-5xl font-bold tracking-tight sm:text-7xl">
      Book your doctor in <span className="text-teal-600">minutes</span>
    </h1>
    <p className="mx-auto mt-4 max-w-xl text-lg text-slate-600">
      Find a doctor, pick a free slot, pay securely, and get confirmed instantly.
    </p>
    <div className="mt-8 flex flex-wrap justify-center gap-3">
      <Suspense fallback={<div className="h-10" />}>
        <HeroButtons />
      </Suspense>
    </div>
  </div>

  {/* Sample booking preview */}
  <div className="mx-auto max-w-5xl px-4 pb-20">
    <div className="mx-auto max-w-xl rounded-2xl border border-white/60 bg-white/80 p-6 text-left shadow-xl shadow-teal-900/10 backdrop-blur">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Sample booking</p>
        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-800">
          <CircleCheck className="h-3.5 w-3.5" /> Confirmed
        </span>
      </div>

      <div className="mt-4 flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-100 text-teal-700">
          <Stethoscope className="h-6 w-6" />
        </div>
        <div>
          <p className="font-semibold">Dr. XYZ</p>
          <p className="text-sm text-slate-500">Specialization</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg bg-teal-50 p-3">
          <p className="text-xs text-slate-500">Date</p>
          <p className="font-medium">
          <Suspense fallback="Today">
          <SampleDate />
          </Suspense>
          </p>
        </div>
        <div className="rounded-lg bg-sky-50 p-3">
          <p className="text-xs text-slate-500">Time</p>
          <p className="font-medium">Your chosen slot</p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t pt-4 text-sm">
        <span className="text-slate-500">Consultation fee</span>
        <span className="font-semibold text-teal-700">₹INR · Paid</span>
      </div>
    </div>
  </div>
</section>

<section className="bg-teal-50 bg-linear-to-br">
  <ul className="mx-auto grid max-w-5xl gap-6 px-4 py-8 sm:grid-cols-3">
    {highlights.map(({ icon: Icon, text }) => (
      <li
        key={text}
        className="flex items-center justify-center gap-3 text-sm font-medium text-slate-700 sm:text-base"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-700">
          <Icon className="h-5 w-5" />
        </span>
        {text}
      </li>
    ))}
  </ul>
</section>


      {/* Features */}
      <section className="mx-auto grid max-w-5xl gap-6 px-4 py-16 sm:grid-cols-3">
        {features.map(({ icon: Icon, title, text, color }) => (
          <div key={title} className="rounded-xl border bg-white p-6 shadow-sm">
            <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg ${color}`}>
              <Icon className="h-6 w-6" />
            </div>
            <h3 className="font-semibold">{title}</h3>
            <p className="mt-1 text-sm text-slate-600">{text}</p>
          </div>
        ))}
      </section>

      {/* How it works */}
      <section className="bg-teal-50">
        <div className="mx-auto max-w-5xl px-4 py-16">
          <h2 className="text-center text-3xl font-bold">How it works</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map(({ icon: Icon, title, text }, i) => (
              <div key={title} className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-teal-600 text-white">
                  <Icon className="h-6 w-6" />
                </div>
                <p className="mt-3 text-xs font-medium text-teal-700">Step {i + 1}</p>
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-slate-600">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-5xl px-4 py-16">
        <div className="rounded-2xl bg-teal-600 px-6 py-12 text-center text-white">
          <h2 className="text-3xl font-bold">Ready to get started?</h2>
          <p className="mx-auto mt-2 max-w-md text-teal-50">
            Create a free account as a patient or a doctor.
          </p>
          <Suspense fallback={<div className="mt-6 h-10" />}>
            <CtaButton />
          </Suspense>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="mx-auto max-w-5xl px-4 py-6 text-center text-sm text-slate-500">
          © {new Date().getFullYear()} Schedula. All rights reserved.
        </div>
      </footer>
    </div>
  );
}