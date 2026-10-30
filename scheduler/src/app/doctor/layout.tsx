import Link from "next/link";
import { signOutAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-5xl p-4">{children}</main>
  );
}
