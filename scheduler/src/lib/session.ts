import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function requireRole(role: "DOCTOR" | "PATIENT") {
  const session = await getSession();
  if (!session) redirect("/signin");
  if (session.user.role !== role) redirect("/dashboard");
  return session;
}