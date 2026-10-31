import nodemailer from "nodemailer";
import type { NotificationChannel } from "./channel";

let transporter : ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (!transporter) {
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    if (!host || !user || !pass) throw new Error("SMTP is not configured");
    const port = Number(process.env.SMTP_PORT ?? 587);
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }
  return transporter;
}

export const emailChannel: NotificationChannel = {
  name: "EMAIL",
  async send({ to, subject, text, html }) {
    const from = process.env.EMAIL_FROM;
    if (!from) throw new Error("EMAIL_FROM is not set");
    const info = await getTransporter().sendMail({ from, to, subject, text, html });
    return { providerRef: info.messageId };
  },
};