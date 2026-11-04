"use client";

import Link from "next/link";
import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { signInAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PasswordField } from "@/components/password-field";

function SignInForm() {
  const [state, action, pending] = useActionState(signInAction, null);
  const searchParams = useSearchParams();

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm bold">
        <CardHeader>
          <CardTitle className="text-lg font-bold">
            Login
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form action={action} className="space-y-4">
            {searchParams.get("passwordReset") === "success" && (
              <p
                role="status"
                className="rounded-md bg-green-50 p-3 text-sm text-green-700"
              >
                Your password has been reset. You can now sign in with your new password.
              </p>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
              />
            </div>

             <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>

                <Link
                  href="/forgot-password"
                  className="text-xs underline underline-offset-4"
                >
                  Forgot password?
                </Link>
              </div>

              <PasswordField
                id="password"
                name="password"
                required
                autoComplete="current-password"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="rememberMe" />
            Remember me on this device
            </label>
            {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Signing in..." : "Sign in"}
            </Button>
            <p className="text-center text-sm">
              New here? <Link href="/signup" className="underline">Create an account</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  );
}