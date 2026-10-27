import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export const instant = false;

export default async function DashboardRedirect() {
  const session = await getSession();
  if (!session) redirect("/signin");
  redirect(session.user.role === "DOCTOR" ? "/doctor" : "/patient");
}