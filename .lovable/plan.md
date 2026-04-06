
## Implementation Plan — 8 Feature Batch

### Phase 1: Database Migration (Single migration, all schema changes)

**Hotels table — new columns:**
- `child_pricing_enabled` (boolean, default false)
- `child_price_type` (text, default 'percentage')
- `child_price_value` (numeric, default 0)
- `no_show_cutoff_time` (text, default '23:00')
- `night_audit_enabled` (boolean, default false)
- `night_audit_time` (text, default '23:59')
- `night_audit_email` (text, nullable)

**Reservations table — new columns:**
- `num_children` (integer, default 0)
- `child_total` (numeric, default 0)

**New table: `lost_found_items`** with hotel_id isolation, RLS, all fields per spec

**New table: `invoice_extras`** with hotel_id isolation, RLS, all fields per spec

**New table: `night_audit_logs`** with hotel_id isolation, RLS, all fields per spec

**Role cleanup:**
- Migrate existing `manager` user_roles to `admin`
- Update RLS policies: remove all `manager` references, consolidate to `admin`-only
- Update `has_role()` function documentation (enum stays as-is since it's defined in types)

**RPC updates:**
- `create_reservation_if_available` — add `p_num_children` param, compute `child_total`
- `update_reservation_if_available` — add `p_num_children` param, compute `child_total`
- `get_dashboard_stats` — add no-show count
- `get_analytics_summary` — add no-show count

### Phase 2: Edge Function — Night Audit
- Create `supabase/functions/generate-night-audit/index.ts`
- Queries reservations, invoices, rooms for the audit date
- Generates PDF, stores in Supabase Storage
- Emails via existing Resend pattern
- Idempotent (upsert on hotel_id + audit_date)

### Phase 3: Edge Function — No-Show Notification
- Create `supabase/functions/send-noshow-email/index.ts`
- Simple notification email following existing patterns

### Phase 4: UI Changes (all visual/logic, no backend changes)

**Settings page** (`AdminSettings.tsx`):
- Add "Children Pricing" section
- Add "Operations" section with no-show cutoff time
- Add "Night Audit" section with toggle, time, email, generate-now button
- Update save handler to include new fields

**Sidebar** (`AdminLayout.tsx`):
- Add Lost & Found nav item between Invoices and Analytics

**App routes** (`App.tsx`):
- Add `/admin/lost-found` route

**New page: `AdminLostFound.tsx`**:
- Full CRUD with status badges, filter tabs, log item modal, status transition modals

**Reservation forms** (`AdminReservations.tsx`, `AdminDashboard.tsx`):
- Add children counter when hotel has child_pricing_enabled
- Update price calculation with child pricing
- Add no_show status to filter/status selectors
- Add No Show button on dashboard arrivals (after cutoff)

**StatusBadge** (`StatusBadge.tsx`):
- Add `no_show` style

**Staff page** (`AdminStaff.tsx`):
- Remove role column and role selector
- Staff records become informational only

**Invoices page** (`AdminInvoices.tsx`):
- Add extras management (inline add/delete)
- Update total calculation with extras

**Invoice PDF** (`generateInvoicePdf.ts`):
- Render extras as line items between room charge and tax

**Analytics page** (`AdminAnalytics.tsx`):
- Add no-show metric cards
- Add Night Audit tab with logs table

**Availability page** (`AdminAvailability.tsx`):
- Calendar cells show occupancy fractions with gradient fill
- Date detail panel replaces blocked dates list
- Per-room block toggles

### Phase 5: Verification
- Build check
- Test critical flows

### Estimated scope: ~2500 lines of changes across 15+ files
