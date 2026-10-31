import { db } from "@/db";
import { notifications } from "@/db/schema";
import type { NotificationType, TemplatePayload } from "./templates";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type Executor = typeof db | Tx;

export async function enqueueNotification(
  ex: Executor,
  input: {
    type: NotificationType;
    toUserId: string;
    toAddress: string;
    appointmentId: number;
    payload: TemplatePayload;
    dedupeKey: string;
    scheduledFor?: Date;
  }
) {
  await ex
    .insert(notifications)
    .values({
      type: input.type,
      channel: "EMAIL",
      recipientUserId: input.toUserId,
      toAddress: input.toAddress,
      appointmentId: input.appointmentId,
      payload: input.payload,
      dedupeKey: input.dedupeKey,
      scheduledFor: input.scheduledFor ?? new Date(),
    })

    .onConflictDoNothing({ target: notifications.dedupeKey });
}