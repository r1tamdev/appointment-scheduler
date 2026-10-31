"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

type FormState = { error: string } | null;

const signUpSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["DOCTOR", "PATIENT"]),
  mobile: z.string().trim().optional(),
});

const signInSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

function normalizePhone(raw: string): string | null {
  const cleaned = raw.replace(/[\s-]/g, "");
  const withCode = /^\d{10}$/.test(cleaned) ? `+91${cleaned}` : cleaned;
  return /^\+[1-9]\d{9,14}$/.test(withCode) ? withCode : null;
}

export async function signUpAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = signUpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

 const { mobile: rawPhone, ...rest } = parsed.data;
  let mobile: string | undefined;
  if (rawPhone) {
    const normalized = normalizePhone(rawPhone);
    if (!normalized) return { error: "Enter a valid phone number, e.g. 9876543210" };
    mobile = normalized;
  }

  try {
    await auth.api.signUpEmail({ body: { ...rest, ...(mobile ? { mobile: mobile } : {}) } });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Sign up failed" };
  }
  redirect("/dashboard");
}

export async function signInAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = signInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    await auth.api.signInEmail({ body: parsed.data });
  } catch {
    return { error: "Invalid email or password" };
  }
  redirect("/dashboard");
}

export async function signOutAction() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/signin");
}