# WorkshopOps — Multi-brand Car Workshop Management

## Problem
A multi-brand car workshop owner needs a single mobile app to log customer intakes (car details, customer info, reference, photos), track mechanic diagnoses vs customer-reported problems, and manage spare parts through the repair lifecycle.

## Users
- **Owner** — first registered Google user, full access including deletion of jobs.
- **Mechanic** — subsequent Google users, can read jobs, update status, add findings, and manage spare parts.

## Key Features (v1)
1. **Authentication** — Emergent-managed Google OAuth (mobile + web). First user becomes `owner`, others default to `mechanic`. Session token stored in `expo-secure-store` on mobile / `localStorage` on web. Token TTL 7 days.
2. **Dashboard** — Hero count, pending/in_progress/completed tiles tap-through to filtered Jobs list, recent intakes.
3. **Intake Form** — Customer name, phone, reference, car name, plate, model year, problems reported, photos for front/back/left/right (camera or gallery).
4. **Jobs List** — Search by car number, customer or car name; status filter chips; pull-to-refresh.
5. **Job Detail** —
   - Status switcher (Pending → In Progress → Completed)
   - Side-by-side "Customer said" vs "Mechanic found" diagnosis
   - Spare parts manager (add/remove, qty, price, per-part status: pending/ordered/installed)
   - Photo gallery with full-screen viewer
6. **Profile** — User identity, role badge, sign out.

## Backend (FastAPI + MongoDB)
- `POST /api/auth/session` — exchange Emergent `session_id` → app `session_token`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `POST /api/jobs`
- `GET /api/jobs` (q, status, date_from, date_to)
- `GET /api/jobs/{job_id}`
- `PATCH /api/jobs/{job_id}` (status, mechanic_findings, spare_parts, assigned_mechanic, estimated_cost)
- `DELETE /api/jobs/{job_id}` (owner only)
- `GET /api/stats`

## Collections
- `users` { user_id, email, name, picture, role }
- `user_sessions` { session_token, user_id, expires_at, created_at } TTL on `expires_at`
- `jobs` { job_id, customer_*, car_*, model_year, reference, customer_problems, mechanic_findings, spare_parts[], photos {front/back/left/right}, status, created_by, created_at, updated_at }

## Frontend Stack
Expo SDK 54, expo-router, react-native-safe-area-context, react-native-keyboard-controller, expo-image-picker, expo-web-browser, expo-secure-store, @expo/vector-icons.

## Design
Industrial garage command-center aesthetic — obsidian black, surface-grey panels, safety-yellow accents, sharp 0/4px corners, dense data layout.
