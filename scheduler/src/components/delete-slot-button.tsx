"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { deleteSlotAction } from "@/actions/availability";

export function DeleteSlotButton({
  availabilityId,
}: {
  availabilityId: number;
}) {
  const [pending, setPending] = useState(false);

  return (
    <form
      action={async (formData) => {
        if (!window.confirm("Are you sure you want to delete this slot?")) {
          return;
        }

        setPending(true);

        try {
          await deleteSlotAction(formData);
        } finally {
          setPending(false);
        }
      }}
    >
      <input
        type="hidden"
        name="availabilityId"
        value={availabilityId}
      />

      <Button
        type="submit"
        size="sm"
        variant="destructive"
        disabled={pending}
      >
        {pending ? "Deleting..." : "Delete"}
      </Button>
    </form>
  );
}