"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { releaseHoldAction, startBookingAction, verifyPaymentAction } from "@/actions/payments";
import { Button } from "@/components/ui/button";

type Slot = { id: number; label: string };

type RazorpayResponse = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};
type RazorpayOptions = {
  key: string;
  order_id: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  prefill: { name: string; email: string };
  theme: { color: string };
  handler: (response: RazorpayResponse) => void | Promise<void>;
  modal: { ondismiss: () => void | Promise<void> };
};
type RazorpayInstance = {
  open: () => void;
  on: (event: string, cb: (r: { error?: { description?: string } }) => void) => void;
};
declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function BookingForm({ slots, fee }: { slots: Slot[]; fee: number }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const paymentStarted = useRef(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    setBusy(true);
    paymentStarted.current = false;

    const result = await startBookingAction(formData);
    if ("error" in result) {
      setError(result.error);
      setBusy(false);
      return;
    }
    if (result.free) {
      router.push("/patient");
      router.refresh();
      return;
    }

    const loaded = await loadRazorpay();
    if (!loaded || !window.Razorpay) {
      await releaseHoldAction(result.appointmentId);
      setError("Could not load the payment window. Check your connection and try again.");
      setBusy(false);
      return;
    }

    const rzp = new window.Razorpay({
      key: result.keyId,
      order_id: result.orderId,
      amount: result.amount,
      currency: result.currency,
      name: "Appointment Scheduler",
      description: `Consultation with Dr. ${result.doctorName}`,
      prefill: { name: result.patientName, email: result.patientEmail },
      theme: { color: "#0d9488" },
      handler: async (response) => {
        paymentStarted.current = true;
        const verified = await verifyPaymentAction({
          appointmentId: result.appointmentId,
          razorpayOrderId: response.razorpay_order_id,
          razorpayPaymentId: response.razorpay_payment_id,
          razorpaySignature: response.razorpay_signature,
        });
        if ("error" in verified) {
          setError(verified.error);
          setBusy(false);
          return;
        }
        router.push("/patient");
        router.refresh();
      },
      modal: {
        ondismiss: async () => {
          // Closed without paying: free the slot straight away.
          if (!paymentStarted.current) await releaseHoldAction(result.appointmentId);
          setBusy(false);
        },
      },
    });
    rzp.on("payment.failed", (r) =>
      setError(r.error?.description ?? "Payment failed. You can try again.")
    );
    rzp.open();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2">
        {slots.map((s) => (
          <label
            key={s.id}
            className="flex cursor-pointer items-center gap-2 rounded-md border p-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5"
          >
            <input type="radio" name="availabilityId" value={s.id} required />
            <span>{s.label}</span>
          </label>
        ))}
      </div>
      <textarea
        name="reason"
        rows={3}
        maxLength={300}
        placeholder="Reason for visit (optional)"
        className="border-input w-full rounded-md border bg-transparent p-3 text-sm"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={busy}>
        {busy ? "Please wait..." : fee > 0 ? `Pay ₹${fee} & book` : "Book appointment"}
      </Button>
    </form>
  );
}