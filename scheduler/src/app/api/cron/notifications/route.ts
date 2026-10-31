import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { dispatchDueNotifications } from "@/lib/notifications/dispatcher";
import { releaseExpiredHolds } from "@/lib/payments/holds";

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await releaseExpiredHolds();
  const summary = await dispatchDueNotifications(50);
  return NextResponse.json(summary);
}