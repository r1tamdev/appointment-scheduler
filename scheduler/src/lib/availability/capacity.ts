
import { and, eq, gt, lt, sql } from "drizzle-orm";
import { availability } from "@/db/schema";


export async function reserveCapacity(
  tx: any,
  availabilityId: number
) {
  return tx
    .update(availability)
    .set({
      bookedCount: sql`${availability.bookedCount} + 1`,

      status: sql`
        CASE
          WHEN ${availability.bookedCount} + 1 >= ${availability.capacity}
          THEN 'FULL'
          ELSE 'AVAILABLE'
        END
      `,
    })
    .where(
      and(
        eq(availability.availabilityId, availabilityId),
        eq(availability.status, "AVAILABLE"),
        lt(availability.bookedCount, availability.capacity)
      )
    )
    .returning({
      doctorId: availability.doctorId,
      slotDate: availability.slotDate,
      startTime: availability.startTime,
      endTime: availability.endTime,
      schedulingType: availability.schedulingType,
    });
}


export async function releaseCapacity(
  tx: any,
  availabilityId: number
) {
  return tx
    .update(availability)
    .set({
      bookedCount: sql`${availability.bookedCount} - 1`,

      status: sql`
        CASE
          WHEN ${availability.bookedCount} - 1 < ${availability.capacity}
          THEN 'AVAILABLE'
          ELSE 'FULL'
        END
      `,
    })
    .where(
      and(
        eq(availability.availabilityId, availabilityId),
        gt(availability.bookedCount, 0)
      )
    )
    .returning({
      id: availability.availabilityId,
    });
}
