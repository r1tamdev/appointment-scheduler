
"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

type FormState = { error: string } | null;

type ResetRequestState = {
  error?: string;
  success?: string;
} | null;

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
  rememberMe: z.string().optional(),
});

function normalizePhone(raw: string): string | null {
  const cleaned = raw.replace(/[\s-]/g, "");

  const withCode = /^\d{10}$/.test(cleaned)
    ? `+91${cleaned}`
    : cleaned;

  return /^\+[1-9]\d{9,14}$/.test(withCode)
    ? withCode
    : null;
}


export async function signUpAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = signUpSchema.safeParse(
    Object.fromEntries(formData)
  );

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0].message,
    };
  }

  const { mobile: rawPhone, ...rest } = parsed.data;

  let mobile: string | undefined;

  if (rawPhone) {
    const normalized = normalizePhone(rawPhone);

    if (!normalized) {
      return {
        error: "Enter a valid phone number, e.g. 9876543210",
      };
    }

    mobile = normalized;
  }

  try {
    await auth.api.signUpEmail({
      body: {
        ...rest,
        ...(mobile ? { mobile } : {}),
      },
    });
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Sign up failed",
    };
  }

  redirect("/dashboard");
}


export async function signInAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = signInSchema.safeParse(
    Object.fromEntries(formData)
  );

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0].message,
    };
  }

  const { email, password, rememberMe } = parsed.data;

  try {
    await auth.api.signInEmail({
      body: {
        email,
        password,
        rememberMe: rememberMe === "on",
      },
    });
  } catch {
    return {
      error: "Invalid email or password",
    };
  }

  redirect("/dashboard");
}



export async function requestPasswordResetAction(
  _prev: ResetRequestState,
  formData: FormData
): Promise<ResetRequestState> {
  const parsed = z.object({
    email: z.string().email("Enter a valid email"),
  }).safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0].message,
    };
  }

  const appUrl =
    process.env.APP_URL || "http://localhost:3000";

  try {
    await auth.api.requestPasswordReset({
      body: {
        email: parsed.data.email,
        redirectTo: `${appUrl}/reset-password`,
      },
    });
  } catch (error) {
    console.error("Password reset request failed:", error);
  }

  // Generic response prevents account enumeration.
  return {
    success:
      "If an account exists for that email, a password reset link has been sent. Please check your inbox and spam folder.",
  };
}



export async function resetPasswordAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = z.object({
    token: z.string().min(1, "This reset link is invalid or incomplete"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  }).refine(
    (data) => data.password === data.confirmPassword,
    {
      message: "Passwords do not match",
      path: ["confirmPassword"],
    }
  ).safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0].message,
    };
  }

  try {
    await auth.api.resetPassword({
      body: {
        token: parsed.data.token,
        newPassword: parsed.data.password,
      },
    });
  } catch {
    return {
      error:
        "This reset link is invalid, expired, or already used. Please request a new one.",
    };
  }

  redirect("/signin?passwordReset=success");
}

// SIGN OUT

export async function signOutAction() {
  await auth.api.signOut({
    headers: await headers(),
  });

  redirect("/signin");
}
