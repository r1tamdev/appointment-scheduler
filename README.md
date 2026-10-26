# Appointment Scheduler

A doctor appointment scheduling system for patients and doctors. Built with NestJS, PostgreSQL, and Next.js.

> Status: initial setup. The backend module structure and a Hello World frontend are in place.

## Tech Stack

- **Backend:** Node.js, TypeScript, NestJS, PostgreSQL
- **Frontend:** React, Next.js, TypeScript

## Modules

1. User
2. Patient
3. Doctor
4. Availability
5. Appointment

## Project Structure

```
appointment-scheduler/
├── backend/    # NestJS API (port 3000)
└── frontend/   # Next.js app (port 3030)
```

## Prerequisites

- Node.js 22.22.3+ or 24.x LTS
- npm
- PostgreSQL (needed once the database is connected)

## Getting Started

### Backend

```bash
cd backend
npm install
npm run start:dev
```

Runs at http://localhost:3000

### Frontend

```bash
cd frontend
npm install
npm run dev -- -p 3030
```

Runs at http://localhost:3030

## Database

The ER diagram is in the DBML format (tables: `users`, `patients`, `doctors`, `availability`, `appointments`). Paste the DBML into [dbdiagram.io](https://dbdiagram.io) to view it.

## Roadmap

- [x] Project setup (NestJS backend, Next.js frontend)
- [x] ER diagram
- [ ] Connect PostgreSQL
- [ ] Authentication (signup, signin, signout)
- [ ] Doctor availability
- [ ] Appointment booking
