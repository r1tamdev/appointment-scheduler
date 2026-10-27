# Appointment Scheduler

A doctor appointment booking application for patients and doctors. Doctors publish their availability, patients book a slot, and the booking appears on the doctor's dashboard.

> Status: in development. Authentication and role-based dashboards are in place. Doctor, availability, and appointment features are next.

## Tech Stack

- **Framework:** Next.js (App Router), TypeScript
- **Backend:** Next.js Server Actions, Zod for validation
- **UI:** Tailwind CSS, shadcn/ui
- **Database:** PostgreSQL on Neon, Drizzle ORM
- **Authentication:** Better Auth (email and password, role-based)
- **Deployment:** Vercel

## Modules

1. User
2. Patient
3. Doctor
4. Availability
5. Appointment

## Project Structure

```
appointment-scheduler/
├── docs/
│   └── schedule-er-diagram.dbml     # ER diagram (view on dbdiagram.io)
└── scheduler/                       # Next.js app
    ├── src/
    │   ├── actions/                 # Server Actions (auth, doctors, availability, appointments)
    │   ├── app/
    │   │   ├── api/auth/[...all]/   # Better Auth route handler
    │   │   ├── signin/  signup/     # Auth pages
    │   │   ├── dashboard/           # Redirects each role to its dashboard
    │   │   ├── doctor/              # Doctor pages
    │   │   └── patient/             # Patient pages
    │   ├── components/ui/           # shadcn/ui components
    │   ├── db/                      # Drizzle connection and schema
    │   └── lib/                     # Auth config and session helpers
    └── drizzle.config.ts
```

## Database

Tables: `users`, `patients`, `doctors`, `availability`, `appointments`.

- `users` to `patients`: 1:1
- `users` to `doctors`: 1:1
- `doctors` to `availability`: 1:N
- `patients` to `appointments`: 1:N
- `doctors` to `appointments`: 1:N
- `availability` to `appointments`: 1:1 (a slot can be booked only once)

Better Auth also manages its own `session`, `account`, and `verification` tables.

## Prerequisites

- Node.js 22.22.3+ or 24.x LTS
- npm
- A Neon PostgreSQL database

## Getting Started

```bash
cd scheduler
npm install
```

Create `scheduler/.env.local`:

```
DATABASE_URL=postgresql://user:password@host/db?sslmode=require
BETTER_AUTH_SECRET=your-long-random-string
BETTER_AUTH_URL=http://localhost:3000
```

Create the tables and start the app:

```bash
npx drizzle-kit push
npm run dev
```

Open http://localhost:3000

## Deployment

Deployed on Vercel with **Root Directory** set to `scheduler`. Set the same three environment variables in Vercel, with `BETTER_AUTH_URL` pointing to the live URL.

Live URL: _to be added_

## Roadmap

- [x] Project setup (Next.js, Drizzle, Neon, shadcn/ui)
- [x] ER diagram
- [x] Authentication (signup, signin, signout) with role-based dashboards
- [ ] Doctor profile
- [ ] Doctor availability slots
- [ ] Patient booking
- [ ] Appointments on the doctor dashboard
- [ ] Cancel and complete appointments
- [ ] Deployment
