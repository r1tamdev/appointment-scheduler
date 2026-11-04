
import nodemailer from "nodemailer";
import type { NotificationChannel } from "./channel";

let transporter: ReturnType<
  typeof nodemailer.createTransport
> | null = null;

function getTransporter() {
  if (!transporter) {
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
      throw new Error("SMTP is not configured");
    }

    const port = Number(process.env.SMTP_PORT ?? 587);

    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });
  }

  return transporter;
}

// PASSWORD RESET EMAIL

export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string
) {
  const from = process.env.EMAIL_FROM;

  if (!from) {
    throw new Error("EMAIL_FROM is not set");
  }

  const safeUrl = resetUrl.replace(/&/g, "&amp;").replace(/"/g, "&quot;");

  await getTransporter().sendMail({
    from,
    to,
    subject: "Reset your Schedula password",

    text: `
We received a request to reset your Schedula password.

Open this link to choose a new password:

${resetUrl}

This link expires in 1 hour and can only be used once.

If you did not request this, you can ignore this email.
    `,

    html: `
      <div style="
        font-family: Arial, sans-serif;
        max-width: 560px;
        margin: auto;
        line-height: 1.6;
        color: #172033;
      ">
        <h2>Reset your password</h2>

        <p>
          We received a request to reset your Schedula password.
        </p>

        <p>
          <a
            href="${safeUrl}"
            style="
              display: inline-block;
              padding: 12px 20px;
              background: #2563eb;
              color: #ffffff;
              text-decoration: none;
              border-radius: 6px;
            "
          >
            Reset password
          </a>
        </p>

        <p>
          This link expires in 1 hour and can only be used once.
        </p>

        <p>
          If you did not request this, you can safely ignore this email.
        </p>
      </div>
    `,
  });
}

// EXISTING EMAIL NOTIFICATION CHANNEL

export const emailChannel: NotificationChannel = {
  name: "EMAIL",

  async send({ to, subject, text, html }) {
    const from = process.env.EMAIL_FROM;

    if (!from) {
      throw new Error("EMAIL_FROM is not set");
    }

    const info = await getTransporter().sendMail({
      from,
      to,
      subject,
      text,
      html,
    });

    return {
      providerRef: info.messageId,
    };
  },
};
