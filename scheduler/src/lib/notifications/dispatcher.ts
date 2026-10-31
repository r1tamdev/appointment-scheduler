import { and, asc, eq, inArray, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import type { NotificationChannel } from "./channel";
import { emailChannel } from "./email";
import { renderNotification, type NotificationType, type TemplatePayload } from "./templates";

const MAX_ATTEMPTS = 5;
const RETRY_DELAY_MINUTES = [1, 5, 15, 60];
const LEASE_MINUTES = 10;

const channels: Record<string, NotificationChannel> = { EMAIL: emailChannel };

const inMinutes = (m: number) => new Date(Date.now() + m * 60_000);

export async function dispatchDueNotifications(limit = 20) {
  const summary = { sent: 0, retrying: 0, failed: 0 };

  const claimed = await db.transaction(async (tx) => {
    const due = await tx
      .select()
      .from(notifications)
      .where(and(eq(notifications.status, "SCHEDULED"), lte(notifications.scheduledFor, new Date())))
      .orderBy(asc(notifications.scheduledFor))
      .limit(limit)
      .for("update", { skipLocked: true });
    if (due.length === 0) return [];

    await tx
      .update(notifications)
      .set({
        attempts: sql`${notifications.attempts} + 1`,
        scheduledFor: inMinutes(LEASE_MINUTES),
      })
      .where(inArray(notifications.notificationId, due.map((d) => d.notificationId)));
    return due;
  });

  for (const row of claimed) {
    const attempt = row.attempts + 1;
    try {
      const channel = channels[row.channel];
      if (!channel) throw new Error(`No provider for channel ${row.channel}`);

      const message = renderNotification(row.type as NotificationType, row.payload as TemplatePayload);
      const result = await channel.send({ to: row.toAddress, ...message });

      await db
        .update(notifications)
        .set({ status: "SENT", sentAt: new Date(), providerRef: result.providerRef, lastError: null })
        .where(eq(notifications.notificationId, row.notificationId));
      summary.sent++;
    } catch (e) {
      const error = (e instanceof Error ? e.message : String(e)).slice(0, 500);
      if (attempt >= MAX_ATTEMPTS) {
        await db
          .update(notifications)
          .set({ status: "FAILED", lastError: error })
          .where(eq(notifications.notificationId, row.notificationId));
        summary.failed++;
      } else {
        const delay = RETRY_DELAY_MINUTES[Math.min(attempt - 1, RETRY_DELAY_MINUTES.length - 1)];
        await db
          .update(notifications)
          .set({ scheduledFor: inMinutes(delay), lastError: error })
          .where(eq(notifications.notificationId, row.notificationId));
        summary.retrying++;
      }
    }
  }
  return summary;
}


export async function dispatchInBackground() {
  try {
    await dispatchDueNotifications();
  } catch (e) {
    console.error("Notification dispatch failed", e);
  }
}