import {betterAuth} from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db";
import { nextCookies } from "better-auth/next-js";
import * as schema from "../db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema}),
  emailAndPassword:{ enabled: true },
  user: { 
    additionalFields: {
      role: {type: "string", defaultValue: "PATIENT", required: true, input: true},
      phone: {type: "string", required: false, input: true}
    },
  },
  plugins: [nextCookies()],
});