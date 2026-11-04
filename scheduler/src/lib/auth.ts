import {betterAuth} from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db";
import { nextCookies } from "better-auth/next-js";
import * as schema from "../db/schema";

import { sendPasswordResetEmail } from "@/lib/notifications/email";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema}),
  emailAndPassword:{ enabled: true,
    resetPasswordTokenExpiresIn: 60*60,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail(user.email, url);
    },
   },
  user: { 
    additionalFields: {
      role: {type: "string", defaultValue: "PATIENT", required: true, input: true},
      phone: {type: "string", required: false, input: true}
    },
  },
  plugins: [nextCookies()],
});