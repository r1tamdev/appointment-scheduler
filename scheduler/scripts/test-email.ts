import { config } from "dotenv";
import nodemailer from "nodemailer";

config({ path: ".env" });

async function main() {
  const to = process.argv[2];
  if (!to) throw new Error("Usage: npx tsx scripts/test-email.ts you@example.com");

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: false, // port 587 uses STARTTLS
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  await transporter.verify();
  console.log("SMTP login OK");

  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: "Schedula test email",
    text: "If you can read this, SMTP works.",
  });
  console.log("Sent:", info.messageId);
}

main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});