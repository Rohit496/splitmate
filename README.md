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
- Group settings (creator-only): rename the group, remove a member (blocked
  if they have existing expenses), and view settlement history
- Export a group's full expense history as a CSV download
- Delete an expense (soft delete) without losing historical balance accuracy
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
- react-toastify for toast notifications
- lucide-react for icons
- `localStorage` as the only data store — no backend, no database

## Getting started

1. Clone the repo
2. Install dependencies:
   ```
   npm install
   ```
3. Run the dev server:
   ```
   npm run dev
   ```
4. Open http://localhost:5173

## Test accounts

Four accounts are seeded automatically into `localStorage` the first time the
app loads in a browser:

- shubham@test.com / password
- bob@test.com / password
- rahul@test.com / password
- eva@test.com / password

No setup step is required — just open the app and log in with one of these.

## Project structure

```
src/
  main.jsx              entry: StrictMode > BrowserRouter > App
  App.jsx                routes + ToastContainer, sets document title/meta
  constant.js             all user-facing copy, grouped by feature
  index.css              Tailwind v4 @theme design tokens + base layer
  toast-theme.css         react-toastify palette overrides

  pages/                 one component per route
  components/            shared UI: AppShell, AuthLayout, modals, ui.jsx primitives
  context/AuthContext.jsx  auth state + register/login/logout
  data/storage.js         the only module that touches localStorage
  hooks/useStore.js       useSyncExternalStore wrapper for storage changes
  utils/money.js          cents<->dollars conversion, formatting, date helpers
  utils/balances.js       net balances + debt-simplification algorithm
```

## Available routes

| Route        | Page             | Auth required |
| ------------ | ---------------- | ------------- |
| `/`          | Landing          | No            |
| `/login`     | Login            | No            |
| `/register`  | Register         | No            |
| `/dashboard` | Dashboard        | Yes           |
| `/group/new` | Create Group     | Yes           |
| `/group/:id` | Group Detail     | Yes           |
| `*`          | redirects to `/` | No            |

Routes marked "Yes" are wrapped in `RequireAuth`, which redirects to `/login`
(preserving the intended destination) when no one is signed in.

## Data storage

Splitmate has no backend. Every record is a plain JSON array under a
namespaced `localStorage` key, and `src/data/storage.js` is the only module
allowed to read or write them:

- `splitmate.users` — registered accounts (name, normalized email, plain-text
  password, createdAt)
- `splitmate.groups` — groups, with members stored by email only
- `splitmate.expenses` — expenses, including soft-deleted ones
- `splitmate.session` — the id of the currently logged-in user

Balances are never stored. `utils/balances.js` recomputes each member's net
position and the simplified settlement list from the live expense list on
every read, so adding, editing, or deleting an expense can never leave a
stale total behind.

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
