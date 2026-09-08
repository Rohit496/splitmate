# Splitmate

Splitmate is an expense-splitting app for a group of friends, roommates, or
travel companions who want to track shared costs and see who owes whom.
Groups, expenses, and accounts are real rows in Supabase (Postgres + Auth)
behind Row Level Security, not local-only data.

## Features

- Register and sign in with an email and password, plus a "forgot password"
  email-reset flow
- Create groups and add members by email — a member can be added before they
  ever register, and their invite becomes active the moment they sign up
- Log shared expenses with an equal split or a manual, per-person split
- Tag each expense with a category (Food & Drinks, Transport, Accommodation,
  Activities, Shopping, Utilities, Other) and a date
- See each member's net balance and the fewest payments needed to settle up,
  recalculated automatically whenever expenses or settlements change
- Record a settlement ("Settle up") to mark a debt as actually paid, so it
  stops counting toward what's owed
- Group settings (creator-only): rename the group, and remove a member
  (blocked if they have existing expenses)
- Export a group's full expense history as a CSV download
- View spending reports across every group you're in — filter by date range,
  group, and category, see a spending chart and by-category breakdown, and
  export the filtered results as CSV
- Delete an expense (soft delete) without losing historical balance accuracy
- Set an optional total trip budget per group (creator-only) and see a
  progress bar on the Dashboard and Group Detail comparing total spend
  against it
- Add a new member to an existing group from Group Settings, not just when
  first creating it
- See co-members' uploaded profile photos in group member lists, not just
  initials
- Split the Dashboard's groups into "Active" (still owed) and "Settled"
  (everyone even) tabs, each with a live count
- Manage your own account from a Profile page — photo, first/last name,
  email, mobile number, and a password change
- A single Account menu (Profile, Reports, Sign out) in the navbar, with a
  loading spinner instead of an empty flash while data syncs from Supabase
- Toggle between light and dark themes from a button in the navbar; your
  choice is remembered on your next visit
- Toast confirmations for sign in, register, create group, add/delete expense,
  rename group, record a settlement, and sign out
- Data lives in Supabase (Postgres + Auth) behind Row Level Security, not in
  `localStorage` — reads are served from an in-memory cache kept in sync in
  the background, and writes are optimistic

## Tech stack

- React 19
- React Router 7 (client-side routing only, `BrowserRouter`)
- Vite 8 with `@vitejs/plugin-react`
- Tailwind CSS v4 via `@tailwindcss/vite` (design tokens in `src/index.css`, no `tailwind.config.js`)
- Supabase (`@supabase/supabase-js`) — Postgres for groups/expenses, Auth for
  accounts and sessions
- react-toastify for toast notifications
- lucide-react for icons

## Getting started

1. Clone the repo
2. Install dependencies:
   ```
   npm install
   ```
3. Copy `.env.example` to `.env` and fill in `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_PUBLISHABLE_KEY` for your Supabase project —
   `src/data/supabaseClient.js` throws at import time if either is missing
4. Run the dev server:
   ```
   npm run dev
   ```
5. Open http://localhost:5173

## Test accounts

The connected Supabase project currently has no seeded test accounts — every
account, group, and expense that previously existed was removed in a full
reset. `Login.jsx` no longer has quick-fill login buttons for this reason.

To try the app, go to `/register` and create an account with a real-looking
email (Supabase rejects `@example.com`/`@example.org` on signup). Create a
group and invite other members by email; an invited member can join a group
before they've registered, and their invite resolves to "active"
automatically once they sign up.

There's no cross-tab/cross-device live sync yet, so use separate browsers or
profiles to try out multi-user flows.

## Project structure

```
src/
  main.jsx                entry: StrictMode > BrowserRouter > App
  App.jsx                 routes + ToastContainer, sets the meta description
                          tag (each page sets its own document title)
  constant.js             all user-facing copy, grouped by feature
  index.css               Tailwind v4 @theme design tokens + base layer
  toast-theme.css         react-toastify palette overrides

  pages/                  one component per route
  components/             shared UI: AppShell, AccountMenu, ThemeToggle,
                          AuthLayout, modals, BudgetBar, ui.jsx primitives
  context/AuthContext.jsx   Supabase Auth state + register/login/logout/password
                            reset/profile updates (name, email, mobile, photo, password)
  context/ThemeContext.jsx  light/dark theme, persisted in localStorage
  data/supabaseClient.js    the one Supabase client (auth.* + from(...) tables)
  data/storage.js           the only module that reads/writes groups, expenses, and settlements
  hooks/useStore.js         useSyncExternalStore wrappers: re-render on any store
                            change, plus a ready flag for first-sync loading state
  hooks/useDocumentTitle.js sets the browser tab title for the calling page
  utils/money.js            cents<->dollars conversion, formatting, date helpers,
                            total-spend aggregation
  utils/balances.js         net balances + debt-simplification algorithm
  utils/groupExport.js      CSV export of one group's expense history
  utils/monthlyReport.js    aggregates a user's expenses across groups for the Reports page
  utils/csvExport.js        CSV export for the Reports page
```

## Available routes

| Route                 | Page             | Auth required     |
| --------------------- | ---------------- | ----------------- |
| `/`                   | Landing          | No                |
| `/login`              | Login            | No                |
| `/register`           | Register         | No                |
| `/forgot-password`    | Forgot Password  | No                |
| `/reset-password`     | Reset Password   | No                |
| `/dashboard`          | Dashboard        | Yes               |
| `/reports`            | Reports          | Yes               |
| `/profile`            | Profile          | Yes               |
| `/group/new`          | Create Group     | Yes               |
| `/group/:id`          | Group Detail     | Yes               |
| `/group/:id/settings` | Group Settings   | Yes, creator only |
| `*`                   | redirects to `/` | No                |

Routes marked "Yes" are wrapped in `RequireAuth`, which redirects to `/login`
(preserving the intended destination) when no one is signed in. `/group/:id/settings`
additionally checks that the signed-in user is the group's creator, redirecting
back to `/group/:id` otherwise.

## Data storage

Splitmate is backed by Supabase (Postgres + Auth). Every group, expense, and
account is a real row behind Row Level Security — `src/data/storage.js` and
`src/context/AuthContext.jsx` are the only two modules that talk to Supabase
directly; everything else just calls into `storage.js`/`useAuth()` and
doesn't know the backend exists.

Core tables:

- `public.users` — one row per account, created automatically by a trigger
  on `auth.users` insert. No password column; Supabase Auth owns credentials.
  Also holds an optional avatar photo (stored in a public `avatars` Storage
  bucket) and mobile number, both editable from the Profile page; email
  changes go through Supabase's real confirmation flow and only propagate
  across the app's other email-keyed tables once confirmed.
- `public.groups` / `public.group_members` — groups and their membership.
  Members are keyed by email, not just `user_id`, so a group can include
  someone who hasn't registered yet; two DB triggers resolve a pending
  member to an active account the moment a matching email registers.
  Groups also carry an optional `budget_cents` total that only the creator
  can set, shown as a progress bar against total spend.
- `public.expenses` / `public.expense_splits` — expenses and their per-person
  split. Deletes are soft (`is_deleted`) — there's no DELETE policy on
  `expenses` at all, so nothing is ever hard-removed.
- `public.settlements` — records that a debt was actually paid, offsetting
  the balance calculation without altering the expense history.

Reads are served from an in-memory cache kept in sync with Supabase in the
background; writes are optimistic (an immediate cache update, then a
background persist, with rollback on failure). Balances are never stored —
`utils/balances.js` recomputes each member's net position and the simplified
settlement list from the live expense and settlement lists on every read, so
adding, editing, or deleting an expense can never leave a stale total behind.

Row Level Security, not the client-side filtering in `storage.js`, is the
real security boundary: every table is scoped to rows for groups the
signed-in user belongs to, and the `anon` role has no grants on any of them.

One exception: your light/dark theme preference is stored in `localStorage`
(`splitmate_theme`), not Supabase — it's a per-browser UI setting, not app
data, so it isn't synced across devices.

## Important notes

- **Expenses are soft-deleted.** `deleteExpense` only sets `isDeleted: true`
  (plus `deletedAt`/`deletedBy`); the record is never removed. `listExpenses`
  filters deleted rows out, but keeping them means past balance calculations
  stay auditable and nothing is silently lost.
- **Group members are keyed by email, not by user id.** A group can include
  someone who hasn't registered yet — `storage.getGroup()` resolves each
  member at read time against the users table, marking them `active` once a
  matching account exists and `pending` until then. Nothing needs to be
  migrated when they sign up; the same email just starts resolving to a real
  user.
- **`createExpense` enforces that splits sum to the total, in cents.** This is
  the one integrity check protecting every balance and settlement computed
  from the expense list, so it throws rather than let a mismatched record
  through.
- **All money math is done in integer cents** (`utils/money.js`), never on
  raw dollar floats, to avoid rounding errors when splitting unevenly.
- **Adding a member to an existing group doesn't touch expense history.**
  `addMember` (Group Settings, creator only) only inserts a `group_members`
  row — the new member starts fresh for future expenses, never retroactively
  added to old splits.
- **Background write failures are silent.** `createGroup`, `createExpense`,
  `deleteExpense`, `renameGroup`, `removeMember`, `recordSettlement`,
  `updateGroupBudget`, `addMember`, and the Profile-page update functions all
  roll back their optimistic cache update and log to the console if the
  background Supabase write fails, but there's no toast for it yet.
- **There's no cross-tab/cross-device live sync.** A second tab or device
  only sees a change made elsewhere after its own next login or
  write-triggered resync — there's no Supabase Realtime subscription yet.
- **The theme toggle defaults to light**, not your OS's dark-mode setting —
  it only switches once you click it, then remembers your choice via
  `localStorage` on later visits.
