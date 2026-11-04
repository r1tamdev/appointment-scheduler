"use client";

import {
  useActionState,
  useState,
} from "react";

import {
  createScheduleAction,
} from "@/actions/availability";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DAYS = [
  [0, "Sun"],
  [1, "Mon"],
  [2, "Tue"],
  [3, "Wed"],
  [4, "Thu"],
  [5, "Fri"],
  [6, "Sat"],
] as const;

export function AddSlotForm({
  minDate,
}: {
  minDate: string;
}) {
  const [state, action, pending] = useActionState(
    createScheduleAction,
    null
  );

  const [type, setType] = useState("WAVE");

  const [recurrence, setRecurrence] =
    useState("ONCE");

  return (
    <form
      action={action}
      className="space-y-4 rounded-md border p-4"
    >

      <div>
        <h2 className="font-medium">
          Create a schedule
        </h2>

        <p className="text-sm text-muted-foreground">
          Configure Wave or Stream appointments.
        </p>
      </div>

      {/* Scheduling type and recurrence */}

      <div className="grid gap-4 sm:grid-cols-2">

        <div className="space-y-2">
          <Label htmlFor="schedulingType">
            Scheduling type
          </Label>

          <select
            id="schedulingType"
            name="schedulingType"
            value={type}
            onChange={(e) =>
              setType(e.target.value)
            }
            className="border-input h-10 w-full rounded-md border bg-background px-3 text-sm"
          >
            <option value="WAVE">
              Wave scheduling
            </option>

            <option value="STREAM">
              Stream scheduling
            </option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="recurrenceType">
            Schedule recurrence
          </Label>

          <select
            id="recurrenceType"
            name="recurrenceType"
            value={recurrence}
            onChange={(e) =>
              setRecurrence(e.target.value)
            }
            className="border-input h-10 w-full rounded-md border bg-background px-3 text-sm"
          >
            <option value="ONCE">
              One-time date
            </option>

            <option value="WEEKLY">
              Repeat by weekday
            </option>

            <option value="DATES">
              Repeat on selected dates
            </option>
          </select>
        </div>

      </div>

      {/* One-time date */}

      {recurrence === "ONCE" && (
        <div className="space-y-2">
          <Label htmlFor="specificDate">
            Date
          </Label>

          <Input
            id="specificDate"
            name="specificDate"
            type="date"
            min={minDate}
            required
          />
        </div>
      )}

      {/* Weekly recurrence */}

      {recurrence === "WEEKLY" && (
        <fieldset className="space-y-2">

          <legend className="text-sm font-medium">
            Repeat on
          </legend>

          <div className="flex flex-wrap gap-3">
            {DAYS.map(([value, label]) => (
              <label
                key={value}
                className="flex items-center gap-2 text-sm"
              >
                <input
                  type="checkbox"
                  name="weekdays"
                  value={value}
                />

                {label}
              </label>
            ))}
          </div>

          <p className="text-xs text-muted-foreground">
            Slots are generated for the next 90 days.
          </p>

        </fieldset>
      )}

      {/* Selected dates */}

      {recurrence === "DATES" && (
        <div className="space-y-2">

          <Label htmlFor="selectedDates">
            Selected dates
          </Label>

          <Input
            id="selectedDates"
            name="selectedDates"
            placeholder="2026-11-10, 2026-11-17"
            required
          />

          <p className="text-xs text-muted-foreground">
            Enter dates in YYYY-MM-DD format,
            separated by commas.
          </p>

        </div>
      )}

      {/* Time range */}

      <div className="grid gap-4 sm:grid-cols-2">

        <div className="space-y-2">
          <Label htmlFor="startTime">
            Start time
          </Label>

          <Input
            id="startTime"
            name="startTime"
            type="time"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="endTime">
            End time
          </Label>

          <Input
            id="endTime"
            name="endTime"
            type="time"
            required
          />
        </div>

      </div>

      {/* Duration / interval and capacity */}

      <div className="grid gap-4 sm:grid-cols-2">

        <div className="space-y-2">
          <Label htmlFor="intervalMinutes">
            {type === "WAVE"
              ? "Appointment duration (minutes)"
              : "Stream interval (minutes)"}
          </Label>

          <Input
            id="intervalMinutes"
            name="intervalMinutes"
            type="number"
            min="5"
            max="240"
            defaultValue="30"
            required
          />

          <p className="text-xs text-muted-foreground">
            {type === "WAVE"
              ? "Each Wave slot lasts this long."
              : "Each Stream interval lasts this long."}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="capacity">
            Maximum patients per interval
          </Label>

          <Input
            id="capacity"
            name="capacity"
            type="number"
            min="1"
            max="100"
            defaultValue="3"
            required
          />
        </div>

      </div>

      {state?.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}

      {state?.success && (
        <p role="status" className="text-sm text-green-700">
          {state.success}
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending
          ? "Creating schedule..."
          : "Create schedule"}
      </Button>

    </form>
  );
}
