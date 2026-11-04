
"use client";

import Link from "next/link";
import { useActionState } from "react";

import { requestPasswordResetAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState(
    requestPasswordResetAction,
    null
  );

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-lg font-bold">
            Forgot your password?
          </CardTitle>

          <p className="text-sm text-muted-foreground">
            Enter the email address associated with your account.
            We'll send you a reset link if an account exists.
          </p>
        </CardHeader>

        <CardContent>
          <form action={action} className="space-y-4">

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>

              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                required
              />
            </div>

            {state?.error && (
              <p role="alert" className="text-sm text-red-600">
                {state.error}
              </p>
            )}

            {state?.success && (
              <p
                role="status"
                className="rounded-md bg-green-50 p-3 text-sm text-green-700"
              >
                {state.success}
              </p>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={pending}
            >
              {pending ? "Sending..." : "Send reset link"}
            </Button>

            <p className="text-center text-sm">
              <Link href="/signin" className="underline">
                Back to sign in
              </Link>
            </p>

          </form>
        </CardContent>
      </Card>
    </main>
  );
}
