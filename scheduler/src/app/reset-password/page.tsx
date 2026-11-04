
"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useActionState } from "react";

import { resetPasswordAction } from "@/actions/auth";
import { PasswordField } from "@/components/password-field";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function ResetPasswordForm() {
  const searchParams = useSearchParams();

  const token = searchParams.get("token");
  const linkError = searchParams.get("error");

  const [state, action, pending] = useActionState(
    resetPasswordAction,
    null
  );

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-lg font-bold">
            Create a new password
          </CardTitle>

          <p className="text-sm text-muted-foreground">
            Choose a new password with at least 8 characters.
          </p>
        </CardHeader>

        <CardContent>
          {!token || linkError ? (
            <div className="space-y-4">
              <p role="alert" className="text-sm text-red-600">
                This password reset link is invalid or expired.
                Please request a new one.
              </p>

              <Link
                href="/forgot-password"
                className="flex h-9 w-full items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                Request a new link
              </Link>
            </div>
          ) : (
            <form action={action} className="space-y-4">

              <input
                type="hidden"
                name="token"
                value={token}
              />

              <div className="space-y-2">
                <Label htmlFor="password">
                  New password
                </Label>

                <PasswordField
                  id="password"
                  name="password"
                  required
                  autoComplete="new-password"
                  placeholder=""
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">
                  Confirm new password
                </Label>

                <PasswordField
                  id="confirmPassword"
                  name="confirmPassword"
                  required
                  autoComplete="new-password"
                />
              </div>

              {state?.error && (
                <p role="alert" className="text-sm text-red-600">
                  {state.error}
                </p>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={pending}
              >
                {pending ? "Updating password..." : "Reset password"}
              </Button>

            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
