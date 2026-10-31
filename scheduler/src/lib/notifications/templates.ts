export type NotificationType =
  | "BOOKING_CONFIRMED"
  | "NEW_BOOKING_DOCTOR"
  | "APPOINTMENT_CANCELLED"
  | "APPOINTMENT_RESCHEDULED"
  | "PAYMENT_RECEIVED";

export type TemplatePayload = {
  recipientName: string;
  recipientRole: "PATIENT" | "DOCTOR";
  doctorName: string;
  patientName: string;
  dateLabel: string;
  timeLabel: string;
  oldDateLabel?: string;
  oldTimeLabel?: string;
  cancelledBy?: "PATIENT" | "DOCTOR" | "SYSTEM";
  mentionRefund?: boolean;
  amountLabel?: string;
  paymentRef?: string;
  portalPath: string;
};

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function appUrl() {
  return (process.env.APP_URL ?? process.env.BETTER_AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

type Content = { subject: string; lines: string[]; cta: string };

function details(p: TemplatePayload): string[] {
  return [`Doctor: Dr. ${p.doctorName}`, `Date: ${p.dateLabel}`, `Time: ${p.timeLabel}`];
}

function content(type: NotificationType, p: TemplatePayload): Content {
  const hi = p.recipientRole === "DOCTOR" ? `Hi Dr. ${p.recipientName},` : `Hi ${p.recipientName},`;

  switch (type) {
    case "BOOKING_CONFIRMED":
      return {
        subject: `Appointment confirmed with Dr. ${p.doctorName} on ${p.dateLabel}`,
        lines: [hi, "Your appointment is confirmed.", ...details(p)],
        cta: "View appointment",
      };

    case "NEW_BOOKING_DOCTOR":
      return {
        subject: `New appointment on ${p.dateLabel} at ${p.timeLabel}`,
        lines: [hi, `${p.patientName} has booked an appointment with you.`, `Date: ${p.dateLabel}`, `Time: ${p.timeLabel}`],
        cta: "Open dashboard",
      };

    case "APPOINTMENT_CANCELLED": {
      let intro: string;
      if (p.recipientRole === "PATIENT") {
        intro =
          p.cancelledBy === "PATIENT"
            ? "You cancelled your appointment."
            : `Dr. ${p.doctorName} is unable to keep your appointment, and it has been cancelled. We're sorry for the inconvenience.`;
      } else {
        intro =
          p.cancelledBy === "DOCTOR"
            ? "You cancelled this appointment."
            : `${p.patientName} cancelled their appointment with you.`;
      }
      const lines = [hi, intro, ...details(p)];
      if (p.recipientRole === "PATIENT" && p.mentionRefund) {
        lines.push("Any refund that is due will be confirmed in a separate email once it has been processed.");
      }
      return { subject: `Appointment cancelled: ${p.dateLabel}`, lines, cta: "View appointments" };
    }

    case "APPOINTMENT_RESCHEDULED":
      return {
        subject: `Appointment rescheduled to ${p.dateLabel}`,
        lines: [
          hi,
          p.recipientRole === "DOCTOR"
            ? `${p.patientName} moved their appointment to a new time.`
            : "Your appointment has been moved to a new time.",
          `Previously: ${p.oldDateLabel} at ${p.oldTimeLabel}`,
          `Now: ${p.dateLabel}, ${p.timeLabel}`,
          `Doctor: Dr. ${p.doctorName}`,
        ],
        cta: "View appointment",
      };

    case "PAYMENT_RECEIVED":
      return {
        subject: `Payment received: ${p.amountLabel}`,
        lines: [
          hi,
          `We received your payment of ${p.amountLabel}.`,
          `Payment reference: ${p.paymentRef}`,
          ...details(p),
        ],
        cta: "View receipt",
      };
  }
}

export function renderNotification(type: NotificationType, payload: TemplatePayload) {
  const { subject, lines, cta } = content(type, payload);
  const url = `${appUrl()}${payload.portalPath}`;

  const text = [...lines, `${cta}: ${url}`, "Appointment Scheduler"].join("\n\n");
  const html = `<!doctype html><html><body style="margin:0;background:#f1f5f9;font-family:Arial,sans-serif;">
<div style="max-width:520px;margin:24px auto;background:#ffffff;border-radius:12px;overflow:hidden;">
  <div style="background:#0d9488;color:#ffffff;padding:16px 24px;font-size:18px;font-weight:bold;">Appointment Scheduler</div>
  <div style="padding:24px;color:#0f172a;font-size:15px;line-height:1.6;">
    ${lines.map((l) => `<p style="margin:0 0 12px;">${esc(l)}</p>`).join("")}
    <p style="margin:24px 0 0;"><a href="${esc(url)}" style="background:#0d9488;color:#ffffff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:bold;">${esc(cta)}</a></p>
  </div>
</div></body></html>`;

  return { subject, text, html };
}