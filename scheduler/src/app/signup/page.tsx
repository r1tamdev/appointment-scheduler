"use client";

import Link from "next/link";
import { useActionState } from "react";

import { signUpAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PasswordField } from "@/components/password-field";

export default function SignUpPage() {
  const [state, action, pending] = useActionState(signUpAction, null);

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-lg font-bold">
            Create an account
          </CardTitle>
        </CardHeader>

        <CardContent>
          <form action={action} className="space-y-4">

            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                autoComplete="name"
                required
              />
            </div>

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
              <Label htmlFor="password">Password</Label>

              <PasswordField
                id="password"
                name="password"
                required
                autoComplete="new-password"
                placeholder=""
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mobile">
                Mobile Number (optional)
              </Label>

              <Input
                id="mobile"
                name="mobile"
                type="tel"
                autoComplete="tel"
              />
            </div>

            {state?.error && (
              <p role="alert" className="text-sm text-red-600">
                {state.error}
              </p>
            )}

            <div className="space-y-2">
              <Label htmlFor="role">I am a</Label>

              <select
                id="role"
                name="role"
                defaultValue="PATIENT"
                className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm"
              >
                <option value="PATIENT">Patient</option>
                <option value="DOCTOR">Doctor</option>
              </select>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={pending}
            >
              {pending ? "Creating..." : "Sign up"}
            </Button>

            <p className="text-center text-sm">
              Already have an account?{" "}
              <Link href="/signin" className="underline">
                Sign in
              </Link>
            </p>

          </form>
        </CardContent>
      </Card>
    </main>
  );
}
