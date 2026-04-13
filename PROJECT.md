
# neuMAC — Pulmonology Management System
## System Guide & QA Checklist

**Version:** Session 2 build  
**Stack:** Vue 3 CDN · Express.js (Railway) · Supabase (PostgreSQL)  
**Files:** `index.html` · `app.js` · `index.js` · `style.css` (external)

---

## Part 1 — How the system works

### Architecture overview

```
Browser (Vue 3 SPA)
  └── index.html         Single HTML file, all templates
  └── app.js             All Vue logic, composables, API calls
       ├── ApiService     HTTP layer, JWT auth, cache, offline detection
       ├── useUI()        Sidebar, toasts, modals, ⌘K palette
       ├── useStaff()     Medical staff CRUD + profile drawer
       ├── useRotations() Resident rotations + gantt view
       ├── useOnCall()    On-call schedule management
       ├── useAbsences()  Staff absence log
       ├── useResearch()  Research lines, trials, projects
       ├── useNews()      News & publications
       └── useDashboard() Dashboard stats + daily briefing

Railway (Node/Express)
  └── index.js           157 REST API routes
       ├── /api/auth/*    Login, logout, session, password reset
       ├── /api/medical-staff/*
       ├── /api/rotations/*
       ├── /api/oncall/*
       ├── /api/absence-records/*
       ├── /api/training-units/*
       ├── /api/research-*/*
       ├── /api/news/*
       ├── /api/emergency-callouts/*  ← NEW (needs Supabase table)
       └── /api/settings/*

Supabase (PostgreSQL)
  └── 20+ tables, JWT auth, RLS policies
```

---

### Views (sidebar navigation)

| View | Route key | Description |
|------|-----------|-------------|
| Overview | `dashboard` | Hero greeting, alerts strip, stat rail, on-call panel, rotations panel, unit occupancy |
| Medical Staff | `medical_staff` | Compact card grid + table. Full profile drawer. Add/edit 3-step modal |
| On-call | `oncall_schedule` | 3 tabs: Schedule · Duty Log · On-call Summary |
| Clinical Units | `training_units` | Unit cards with resident slots, timeline heatmap, capacity bars |
| Rotations | `resident_rotations` | Compact orb view + table + monthly gantt chart |
| Absence | `staff_absence` | KPI strip + absence table with coverage tracking |
| Research Hub | `research_hub` | Research lines, clinical trials, innovation projects, analytics |
| News & Posts | `news` | Article/update/publication/photo-story editor with preview |
| Settings | `system_settings` | Hospital settings, staff types, academic degrees, rotation services |
| Communications | `communications` | Department announcements |

---

### Authentication & permissions

**Login:** Email + password → JWT stored in `localStorage`. Session validated against `/api/auth/me` on page load.

**Roles and what they can do:**

| Role | Access |
|------|--------|
| `system_admin` | Everything, including system settings and user management |
| `department_head` | All clinical modules, can delete records |
| `resident_manager` | Rotations, absences, on-call scheduling |
| `researcher` | Research hub only |
| `readonly` | View only, no create/edit/delete |

**Session expiry:** If the JWT expires mid-session, all API calls return 401. The app automatically redirects to the login screen and shows a message. No data is lost.

---

### Key features

#### Dashboard
- Live alerts derived from real data: on-call gaps, rotations ending this week, unassigned residents, slots opening
- "All clear" only shows after data has loaded and nothing is urgent
- Auto-refreshes every 5 minutes when the user is on the dashboard
- Stat rail: total staff, active rotations, on-call coverage, research lines

#### Medical Staff
- **Compact view:** Card grid, 2 columns, avatar + name + specialization + rotation chip + action buttons
- **Table view:** 5 columns — Name (with specialization as subtext) · Type · Current Rotation · Status · Actions
- **Profile drawer:** Opens on click, shows full details, certificates, research profile, quick actions (assign rotation, log absence, schedule on-call)
- **Add/Edit modal:** 3-step wizard — Identity · Professional · Roles

#### Resident Rotations
- **Compact orb view:** One orb per resident, colour-coded by status (green=active, blue=scheduled, grey=done)
- **Table view:** Resident · Unit · Period · Days Left · Status · Actions
- **Monthly gantt:** Horizontal bars per resident across a configurable horizon (3–12 months). Click a bar to open the detail sheet. Edit from the detail sheet
- Resident gap warnings: strip shows residents with no rotation in the next 3 months

#### On-call Schedule
- **Tab 1 — Schedule:** Full shift table. Status column (Scheduled / Live / Done) derived from `duty_date`. Today's live shifts show a green "Log call-out" button
- **Tab 2 — Duty log:** Records unscheduled emergency call-outs (not planned on-call). KPI tiles + log table
- **Tab 3 — On-call summary:** Aggregated burden per physician (scheduled + call-outs + night + weekend). Fairness alert if any physician is >50% above the team average

#### ⌘K Command Palette
- Open: `⌘K` (Mac) or `Ctrl+K` (Windows/Linux), or the search bar at the bottom of the sidebar
- Navigate: `↑↓` arrows, `Enter` to execute, `Esc` to close
- Searches: views by name, staff by full name, clinical units by name
- Quick actions: Add staff, Schedule on-call, Assign rotation, Log absence, Log call-out
- Smart actions: if you type a staff name + an action word (e.g. "García rotation"), it surfaces "Assign rotation — García" directly

#### Offline detection
- A yellow banner appears at the top if the connection drops
- Mutation requests (POST/PUT/DELETE) are blocked with a clear message while offline
- On reconnect, staff and rotation data automatically resync

---

### Database — pending action

> ⚠️ **The `emergency_callouts` table must be created in Supabase before the Duty Log feature works.**

Run this SQL in the Supabase SQL editor:

```sql
create table emergency_callouts (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid references medical_staff(id) on delete cascade,
  called_at timestamptz not null,
  end_time timestamptz,
  reason_category text default 'unspecified',
  time_type text default 'night',
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index on emergency_callouts(staff_id);
create index on emergency_callouts(called_at);
```

---

### Maintenance mode

When `system_settings.maintenance_mode = true` in the database, the API returns `503` for all non-auth requests. System admins bypass it. The frontend shows a persistent toast. To enable from the app: Settings → toggle Maintenance Mode.

---

## Part 2 — QA Checklist

Work through these in order. Note anything that behaves unexpectedly.

---

### A — Authentication

- [ ] Login with valid credentials works and lands on dashboard
- [ ] Login with wrong password shows a clear error message
- [ ] Refresh the page while logged in — session persists without re-login
- [ ] Leave the tab open for a long time, then try an action — session expiry redirects cleanly to login with a message
- [ ] Log out and try accessing the URL directly — redirects to login

---

### B — Dashboard

- [ ] Stat rail shows real numbers (not zeros or NaN)
- [ ] "All clear" does NOT appear while data is still loading
- [ ] If there are on-call gaps in the next 7 days, a danger alert appears in the hero strip
- [ ] If rotations are ending this week, a warning alert appears
- [ ] The unit occupancy list shows real unit names and fill-rate bars
- [ ] The on-call panel shows today's physician or a gap warning
- [ ] The rotation panel shows active rotations or "none"
- [ ] Clicking an alert navigates to the correct view

---

### C — Medical Staff

- [ ] Compact view: all staff cards load, names not truncated, avatars show initials
- [ ] Compact view: Edit button calls the correct person (not undefined)
- [ ] Compact view: Delete/Deactivate button calls the correct person
- [ ] Table view: 5 columns visible, names don't wrap vertically
- [ ] Table view: action buttons (view / edit / delete) always visible, not hidden
- [ ] Clicking a card/row opens the profile drawer for the right person
- [ ] Profile drawer: "Edit" button opens the edit modal pre-filled correctly
- [ ] Add staff modal: all 3 steps navigate correctly
- [ ] Add staff modal: required fields show validation errors if empty
- [ ] Saving a new staff member appears in the list without page refresh
- [ ] Editing and saving a staff member updates the list correctly
- [ ] Deactivating a staff member removes them from the active list

---

### D — Resident Rotations

- [ ] Compact orb view: orbs are colour-coded (green active, blue scheduled, grey done)
- [ ] Residents with no rotations show "No rotations assigned" + "Assign" button
- [ ] Clicking "Assign" opens the rotation modal — check it is pre-filled with the resident
- [ ] Table view: all columns readable, action buttons always visible
- [ ] Monthly gantt: bars render for the correct residents and date ranges
- [ ] Clicking a gantt bar opens the detail sheet for the right rotation
- [ ] "Edit Rotation" in the detail sheet opens the edit modal pre-filled
- [ ] Resident gap warning strip shows residents with gaps in next 3 months
- [ ] Saving a new rotation updates the gantt and table immediately

---

### E — On-call Schedule

- [ ] Schedule tab: shifts load, dates, times, and physician names show correctly
- [ ] Today's shift shows a "Live" status badge
- [ ] Past shifts show "Done", future shifts show "Scheduled"
- [ ] Today's live shift shows a green "Log call-out" button
- [ ] Clicking "Log call-out" opens the modal pre-filled with that physician
- [ ] Adding a new shift saves correctly and appears in the list
- [ ] **Duty Log tab:** requires `emergency_callouts` Supabase table — if not created, this tab will be empty
- [ ] Duty Log: "Log call-out" modal saves a record with physician, time, type, and reason
- [ ] Duty Log: edit and delete work on saved records
- [ ] On-call Summary tab: table shows all physicians with their counts
- [ ] Fairness alert appears if one physician is significantly above average

---

### F — Clinical Units

- [ ] Units load as cards with capacity bars
- [ ] Resident slots shown correctly (avatar for assigned, dashed ring for free)
- [ ] Clicking "Quick assign" in the unit detail drawer opens rotation modal pre-filled with the unit
- [ ] Adding a new unit saves and appears in the grid
- [ ] Editing a unit saves correctly
- [ ] KPI strip shows correct totals

---

### G — Staff Absence

- [ ] KPI strip shows correct counts
- [ ] Absence table: badges (Vacation, Sick leave, etc.) in sentence case, not ALL CAPS
- [ ] Status pills (Absent now / Planned / Returned) in correct colour and sentence case
- [ ] Duration shows as "3 days" not "3 DAYS"
- [ ] Coverage column shows covering staff name, not wrapping over multiple lines
- [ ] Staff avatars: attending = dark navy, resident = blue, on leave = amber
- [ ] Adding an absence saves and appears in the table
- [ ] The "Resolve" button appears for returned absences and works
- [ ] Date filters narrow the table correctly

---

### H — Research Hub

- [ ] Research lines list loads
- [ ] Clinical trials list loads
- [ ] Innovation projects list loads
- [ ] Analytics tab shows data (or skeleton while loading, not blank)
- [ ] Adding/editing a research line saves correctly
- [ ] News/publications associated with research lines link correctly

---

### I — News & Posts

- [ ] Post list loads with correct card layout
- [ ] Publication posts: cards do not collapse (min-height enforced)
- [ ] Creating a new post: all 4 tabs (Metadata / Content / Publication / Preview) navigate correctly
- [ ] Preview tab shows a live render of title, body, author, word count
- [ ] Word count warning appears if over the limit for the post type
- [ ] Publishing a draft changes its status badge
- [ ] Filters (All / Published / Drafts / Archived) work correctly

---

### J — ⌘K Command Palette

- [ ] Opens with `⌘K` / `Ctrl+K`
- [ ] Input is focused immediately on open
- [ ] Arrow keys navigate the results list
- [ ] `Enter` executes the selected item
- [ ] `Esc` closes the palette
- [ ] Searching a staff name shows that person in results
- [ ] Searching a view name navigates to it
- [ ] Action items (Add staff, Log call-out, etc.) appear and work
- [ ] "Add staff member" action opens the add staff modal

---

### K — Settings

- [ ] Hospital name and settings load and save
- [ ] Staff types list loads, add/edit/delete work
- [ ] Academic degrees show as pill chips, add/edit/delete work
- [ ] Rotation services list loads, add/edit/delete work
- [ ] Maintenance mode toggle saves (requires system_admin role)

---

### L — Responsive / Mobile

- [ ] On a phone: sidebar is hidden by default, hamburger button visible in topbar
- [ ] Hamburger opens the sidebar drawer, tapping backdrop closes it
- [ ] On a phone: all modals open full-screen
- [ ] On a phone: tables scroll horizontally, names do not wrap vertically
- [ ] On a phone: form inputs are large enough to tap and the keyboard doesn't break the layout
- [ ] On a phone: action buttons (Edit / Delete) are at least 40px tall and tappable
- [ ] On a tablet (1024px): sidebar narrows but stays visible, KPI strips go 2-column
- [ ] Rotation gantt on mobile shows a swipe hint and scrolls correctly

---

### M — Error states

- [ ] Turn off WiFi, try to save something — "You are offline" banner appears at top
- [ ] Turn off WiFi, try to save — error toast says changes cannot be saved
- [ ] Turn WiFi back on — "Back online — syncing…" toast appears
- [ ] Navigate to a view with no data — empty state (icon + title + description) shows, not a blank screen
- [ ] Use filters that match nothing — "No results match your filters" empty state shows
- [ ] Invalid form submission — field validation errors appear inline

---

### N — Data integrity cross-checks

- [ ] A resident assigned to a rotation appears with the rotation chip in the staff table
- [ ] A staff member on leave appears in the absence table AND has the amber avatar in the staff view
- [ ] The dashboard on-call panel shows today's physician from the on-call schedule
- [ ] The dashboard gap alerts match what is actually missing in the on-call schedule
- [ ] The rotation gantt matches the rotation table for the same resident
- [ ] After deleting a rotation, it disappears from the gantt, table, and staff card chip

---

*Document last updated: April 2026*  
*Build reference: Session 2 — neuMAC Elite UI + full feature set*
