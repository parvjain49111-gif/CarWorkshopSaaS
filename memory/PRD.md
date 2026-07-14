# WorkshopOps — Enterprise Car Workshop Management (Post-Upgrade)

## Vision
A commercial-grade SaaS-quality workshop management system for multi-brand car repair businesses across India. Every workshop owner, manager, service advisor, mechanic, and accountant works from a single mobile-first app.

## Users & Roles
- **owner** — full control including delete, staff role changes, settings edits
- **manager** — staff view, inventory management, send reminders
- **service_advisor** — send lifecycle notifications
- **mechanic** — read + update assigned jobs
- **accountant** — inventory + billing edits

## Feature Set (Post 4-phase upgrade)

### Phase 1 — Enterprise Job Card + CRM
- Auto-numbered Job Card `JC-YYMM-NNNN`
- 7-state workflow: Vehicle Received → Inspection → Approval Pending → Repair Started → Quality Check → Ready for Delivery → Delivered
- Full audit log (`status_history[]`) — who changed what and when
- Billing fields: labour charges, discount, GST, gst_amount, parts_total, total_amount, payment_status
- Odometer & assigned service advisor tracking
- Aggregated CRM view auto-derived from jobs (lifetime value, outstanding, vehicle history, visit count)
- 5-role staff management (owner-only role changes)
- Workshop Settings module (name, GSTIN, GST rate, UPI, invoice prefix, footer)

### Phase 2 — Inventory & Invoicing
- Full CRUD on parts (owner/manager/accountant)
- Low-stock alerts + inventory value summary
- Excel XLSX export with formatted headers, frozen panes
- Bulk import endpoint for XLSX/CSV-parsed rows
- **PDF invoice generation** using reportlab with workshop letterhead, GST breakdown, UPI QR intent
- Auto-deduct stock on install-status part on job save (already present, retained)

### Phase 3 — WhatsApp Automation + Reminders
- Provider-agnostic notification module at `backend/services/whatsapp.py`
  - Protocol-based `Notifier` interface
  - Default `ConsoleNotifier` logs messages — swap-in ready
  - `configure_notifier()` hook for Twilio/MSG91/AiSensy/Interakt/Gupshup
- 13 lifecycle events with template strings
- Auto-triggers on job create, status change, invoice, payment
- Service reminder engine at `/api/reminders/due` (time-based, 180+ days)
- Bulk reminder sender `/api/reminders/send-due` (owner/manager)
- Manual send endpoint `/api/notifications/send` (service advisor+)

### Phase 4 — UI Polish
- Reusable UI kit at `src/components/kit.tsx`
  - `Skeleton` loading placeholder
  - `Confirm` dialog for destructive actions
  - `EmptyState` component
- Cohesive dark industrial theme with color tokens
- Safe area handling on every screen
- Keyboard-aware forms via `react-native-keyboard-controller`
- 6 root routes: `/data`, `/staff`, `/settings`, `/inventory`, `/reminders`, `/customer/[key]`, `/job/[id]`
- 5 tabs: DASH · JOBS · +INTAKE · STATS · CRM · MORE

## Backend API (FastAPI + MongoDB)

### Auth
- `POST /api/auth/session` — exchange Emergent OAuth session → app token
- `GET /api/auth/me`, `POST /api/auth/logout`

### Job Cards
- `POST /api/jobs` — create with auto job_card_no
- `GET /api/jobs` — search + filter by status/date
- `GET /api/jobs/{id}` — full detail
- `PATCH /api/jobs/{id}` — update fields (auto-logs status changes, recomputes totals, fires notifications)
- `DELETE /api/jobs/{id}` — owner only
- `GET /api/jobs/export.csv` and `/export.xlsx`
- `GET /api/jobs/{id}/invoice.pdf` — PDF invoice

### CRM
- `GET /api/customers` — aggregated view with search
- `GET /api/customers/{key}` — full customer detail + service history

### Staff & Settings
- `GET /api/staff` — list users with enriched counts (owner/manager)
- `PATCH /api/staff/{user_id}` — change role (owner)
- `GET/PUT /api/settings` — workshop config

### Inventory
- `POST/GET/PATCH/DELETE /api/parts` and `/api/parts/{id}`
- `POST /api/parts/{id}/stock-move` — stock adjustment
- `GET /api/parts/low-stock`, `/summary`, `/export.xlsx`
- `POST /api/parts/import` — bulk upsert

### Notifications & Reminders
- `POST /api/notifications/send` — manual event trigger
- `GET /api/notifications/events` — list templates
- `GET /api/reminders/due` — vehicles due for service
- `POST /api/reminders/send-due` — bulk WhatsApp reminders

### Analytics
- `GET /api/stats` — dashboard counts
- `GET /api/analytics` — 14-day trend, brands, issues, references, revenue, turnaround, employees, customers

## Collections
- `users` { user_id, email, name, picture, role, created_at }
- `user_sessions` { session_token, user_id, expires_at (TTL) }
- `jobs` — see Job model (35+ fields)
- `parts` — full inventory schema
- `inventory_transactions` — audit trail
- `invoices` — draft & issued invoices
- `settings` — single `_id: "workshop"` document

## Frontend Structure
```
app/
  _layout.tsx          # root layout, auth gate, all Stack routes
  index.tsx            # splash → route based on auth
  login.tsx            # Google OAuth
  (tabs)/
    _layout.tsx        # 5 tabs
    index.tsx          # Dashboard
    jobs.tsx           # Jobs list
    add.tsx            # Intake form
    analytics.tsx      # Founder analytics
    customers.tsx      # CRM
    profile.tsx        # MORE hub → staff/settings/inventory/reminders
  job/[id].tsx         # Job detail (7-state, billing, PDF, audit log)
  customer/[key].tsx   # Customer 360°
  data.tsx             # In-app data table + copy/xlsx export
  staff.tsx            # 5-role management
  settings.tsx         # Workshop config
  inventory.tsx        # Parts CRUD + low-stock
  reminders.tsx        # Service reminders + bulk WhatsApp send
src/
  lib/
    api.ts             # single API client
    auth.tsx           # AuthProvider (Emergent Google OAuth)
    theme.ts           # colors, JOB_STATUSES, ROLES, PAYMENT_META
    export.ts          # CSV / XLSX download helpers
    photos.ts          # camera + gallery + auto-resize
  components/
    ui.tsx             # StatusPill, SectionLabel
    kit.tsx            # Skeleton, Confirm, EmptyState
  hooks/
    use-icon-fonts.tsx
```

## Deployment
- Backend: FastAPI on 8001, wraps `/api/*` routes
- Frontend: Expo Web export served on 3000
- MongoDB local (`test_database` by default)
- Configuration via `.env` files — no secrets in code

## What's next (post-launch)
- Real WhatsApp provider credentials from Twilio/MSG91/AiSensy/Interakt/Gupshup
- Barcode scanning for parts (schema already supports part_number)
- Insurance & PUC expiry reminders (schema needs those two dates per vehicle)
- Attendance tracking for mechanics
- Custom domain + Publish via Emergent
