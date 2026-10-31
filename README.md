# Appointment Scheduler

A doctor appointment booking application for patients and doctors. Doctors publish their availability, patients pay online to book a slot, and the booking appears on the doctor's dashboard. Booking, cancellation and rescheduling trigger email notifications.

**Live:** https://appointment-scheduler-black.vercel.app/

## Features

**Patients**
- Sign up and sign in
- Search doctors by specialization and view their free slots
- Pay the consultation fee online (Razorpay) to confirm a booking
- View upcoming appointments and history
- Reschedule to another slot with the same doctor, or cancel

**Doctors**
- Manage profile (specialization, experience, consultation fee)
- Add and remove availability slots (overlapping slots are rejected)
- See booked appointments, mark them completed, or cancel

**Payments**
- The fee is read from the database on the server, never from the browser
- A slot is held for 10 minutes while the patient pays, then released
- Payment signatures are verified on the server
- Free consultations (fee 0) skip payment and confirm immediately
- Payment code sits behind a provider interface, so another provider can be added

**Email notifications**
- Booking confirmation (patient), new booking alert (doctor), payment receipt
- Cancellation and rescheduling emails
- Every email is stored in an outbox table first, then sent by a dispatcher with retries and backoff
- Duplicate events cannot create duplicate emails (unique dedupe key)
- A provider failure never breaks booking
- Emails contain no medical details (the visit reason is never included)

**Safeguards**
- Role-based access on every page
- A slot is claimed atomically, so it cannot be double booked
- Cancelling or expiring a booking frees the slot

## Tech Stack

- **Framework:** Next.js (App Router), TypeScript
- **Backend:** Next.js Server Actions and route handlers, Zod validation
- **UI:** Tailwind CSS, shadcn/ui
- **Database:** PostgreSQL on Neon, Drizzle ORM
- **Auth:** Better Auth (email and password, roles)
- **Payments:** Razorpay
- **Email:** Nodemailer over SMTP (Brevo)
- **Deployment:** Vercel

## Project Structure

```
appointment-scheduler/
└── scheduler/                         # Next.js app
    └── src/
        ├── actions/                   # Server Actions (auth, doctors, availability, appointments, payments)
        ├── app/
        │   ├── api/auth/[...all]/     # Better Auth handler
        │   ├── api/cron/notifications/ # Sends due emails and releases expired holds
        │   ├── signin/  signup/
        │   ├── doctor/                # Dashboard, profile, availability
        │   └── patient/               # Dashboard, find doctors, booking, reschedule
        ├── components/                # Navbar, status badge, shadcn/ui
        ├── db/                        # Drizzle connection and schema
        └── lib/
            ├── payments/              # Provider interface, Razorpay, slot holds, confirmation
            ├── notifications/         # Outbox, templates, email channel, dispatcher, events
            └── ...                    # Auth config, session helpers, queries, time helpers
```

## Database

| Area | Tables |
|---|---|
| Accounts | `user`, `session`, `account`, `verification` (Better Auth) |
| Scheduling | `patients`, `doctors`, `availability`, `appointments` |
| Payments | `payments`, `payment_events`, `refunds` |
| Notifications | `notifications` (outbox), `notification_preferences` |

- `user` to `patients` and `user` to `doctors`: 1:1
- `doctors` to `availability`: 1:N
- `patients` and `doctors` to `appointments`: 1:N
- A slot can have only one active appointment (partial unique index on `PENDING_PAYMENT` and `BOOKED`)
- `appointments` to `payments`: 1:1

**Appointment statuses:** `PENDING_PAYMENT`, `BOOKED`, `COMPLETED`, `CANCELLED`, `EXPIRED`
**Slot statuses:** `AVAILABLE`, `HELD`, `BOOKED`

## Prerequisites

- Node.js 22.22.3+ or 24.x LTS
- npm
- A Neon PostgreSQL database
- A Razorpay account (test mode is enough)
- An SMTP account for email (Brevo free plan works)

## Getting Started

```bash
cd scheduler
npm install
```

Create `scheduler/.env.local`:

```
DATABASE_URL=postgresql://user:password@host/db?sslmode=verify-full
BETTER_AUTH_SECRET=your-long-random-string
BETTER_AUTH_URL=http://localhost:3000

RAZORPAY_API_KEY=rzp_test_xxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxx

SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=your-smtp-login
SMTP_PASS=your-smtp-key
EMAIL_FROM="Appointment Scheduler <verified-sender@example.com>"
APP_URL=http://localhost:3000
CRON_SECRET=your-long-random-string
```

Create the tables and start the app:

```bash
npx drizzle-kit push
npm run dev
```

Open http://localhost:3000

### Trying the booking flow

1. Sign up as a **doctor**, complete the profile (set a fee), and add a few future slots.
2. Sign up as a **patient** in another browser or an incognito window.
3. Find the doctor, pick a slot, and pay in the Razorpay test popup.
4. The booking appears on both dashboards, and the confirmation emails are sent.

A fee of `0` books without payment. Fees between 0 and ₹1 are rejected because Razorpay's minimum order is ₹1.

### Sending queued and retried emails

Emails are sent right after each event. Anything that failed is retried by the cron endpoint:

```bash
curl -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/notifications
```

The same call also releases payment holds that have expired. In production, call it every minute from an external scheduler.

## Deployment

Deployed on Vercel with **Root Directory** set to `scheduler`. Add every variable from `.env.local` in the Vercel project settings, with `BETTER_AUTH_URL` and `APP_URL` set to the live URL. After any schema change, run `npx drizzle-kit push` against the Neon database before testing the live site.
