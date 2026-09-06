# Splitmate

An expense-splitting app (think Splitwise): create a group, add shared
expenses, and see the fewest payments needed to settle up. Backed by
Supabase (Postgres + Auth) — groups, expenses, and accounts are real rows
behind Row Level Security, not local-only data. `src/data/storage.js` and
`src/context/AuthContext.jsx` are the only two modules that talk to Supabase;
every other file is unchanged from the original local-only design and doesn't
know the backend exists.

## Tech stack

- **React 19** + **React Router 7** (`BrowserRouter`, client-side routing only)
- **Vite 8** (`@vitejs/plugin-react`) — dev server and build
- **Tailwind CSS v4** via `@tailwindcss/vite` — no `tailwind.config.js`; all
  design tokens live in the `@theme` block in `src/index.css`
- **Supabase** (`@supabase/supabase-js`) — Postgres (groups/expenses) + Auth
  (accounts/sessions). One client in `src/data/supabaseClient.js`.
- **react-toastify** for toast notifications
- **lucide-react** for icons
- No test runner, no TypeScript, no state library (React context + `useSyncExternalStore` cover it)
- `.prettierrc` (`{semi: false, singleQuote: true}`) — needed so the
  PostToolUse auto-format hook matches the codebase's actual style instead of
  falling back to Prettier's defaults (double quotes, semicolons)

Scripts: `npm run dev`, `npm run build`, `npm run preview`.

## Folder structure

```
src/
  main.jsx              # entry: StrictMode > BrowserRouter > App
  App.jsx               # routes + ToastContainer, sets document title/meta
  constant.js            # ALL user-facing copy — see Conventions
  index.css             # Tailwind v4 @theme tokens + base layer
  toast-theme.css        # overrides react-toastify's palette to match app tokens

  pages/                # one component per route (see Routes below)
  components/           # shared UI: AppShell, AuthLayout, modals, ui.jsx primitives
  context/AuthContext.jsx  # Supabase Auth state + register/login/logout/
                           # requestPasswordReset/updatePassword
  data/supabaseClient.js # the one Supabase client (auth.* + from(...) tables)
  data/storage.js        # the ONLY module that reads/writes groups & expenses —
                          # Supabase-backed now, no localStorage left at all
  hooks/useStore.js      # useSyncExternalStore wrapper for storage changes
  utils/money.js         # cents<->dollars, formatting, date helpers
  utils/balances.js      # net balances + debt-simplification algorithm
```

No `supabase/` directory in this repo — the schema (tables, triggers, RLS
policies) lives only in the remote Supabase project, applied directly via the
Supabase MCP tools (`apply_migration`). There are no local `.sql` migration
files to check for schema history; if you need it, query the live project.

## Data models

Backed by Supabase now (Postgres tables + Auth), but `storage.js` returns the
exact same JS shapes it always did — field names below are what every page/
component actually sees; the Postgres columns underneath are noted separately.
Reads are served from an in-memory cache kept in sync with Supabase in the
background (`bump()`/`subscribe()`/`useStoreVersion()` are unchanged from the
original design); writes are optimistic (client-generated UUID, immediate
cache update, background persist, rollback + `console.error` on failure —
there's no call site left that awaits these, so a failed write has no toast).

**User** — no localStorage mirror anymore. `getUserByEmail()`/`listUsers()`
resolve only from the in-memory cache (yourself, or anyone you already share a
group with) — Supabase RLS won't let this browser ask "does this arbitrary
email have an account" for anyone else (deliberate anti-enumeration
boundary). Postgres: `public.users` (`id` = same UUID as `auth.users.id`,
`name`, `email`, `created_at`), one row per account, created automatically by
a trigger on `auth.users` insert. No password column — Supabase Auth owns
credentials.

**Group**

```
{ id, name, createdBy, createdAt, members: [{ email, name, userId, status: 'active'|'pending', isCreator, addedAt }] }
```

Postgres: `public.groups` (`id`, `name`, `created_by` uuid → `users.id`,
`created_at`) + `public.group_members` (`group_id`, `email`, `user_id`
nullable, `added_at`). Members are still keyed by **email** (not just
`user_id`) so inviting someone who hasn't registered yet works, same as
before. Two DB triggers keep pending → active resolution live in both
temporal directions: `link_group_members_on_signup` (fires on new
`auth.users`, links any pending `group_members` rows with a matching email)
and `link_new_group_member` (fires BEFORE INSERT on `group_members`, links to
an already-existing account) — inviting someone before or after they sign up
both resolve correctly, with nothing to migrate.

**Expense**

```
{
  id, groupId, description, amount (dollars, Number),
  paidBy (email), participants: [email],
  splitMode: 'equal' | 'manual',
  splits: [{ email, amountCents }],   // always written out explicitly, even for equal splits
  category (string, defaults to 'Other'),
  date (YYYY-MM-DD), createdBy (email), createdAt,
  isDeleted (bool), deletedAt?, deletedBy?,
}
```

Postgres: `public.expenses` (`amount` is `numeric(12,2)` — comes back from
PostgREST as a **string**, cast with `Number(...)` in `storage.js`'s row
mapper; `created_by`/`deleted_by` are `uuid` → `users.id`, resolved back to an
email in the JS shape via an in-memory `userId -> email` index) +
`public.expense_splits` (`expense_id`, `email`, `amount_cents`), one row per
entry in `splits`.

- Deletes are **soft**: `deleteExpense` just flags `isDeleted` (`is_deleted`
  in Postgres); `listExpenses` filters deleted rows out both in the query
  (`.eq('is_deleted', false)`) and again client-side. Nothing is ever
  hard-removed — there's no DELETE RLS policy on `expenses` at all, so a hard
  delete is refused at the database level even if some future code tried.
- `createExpense` **throws** if `splits` don't sum to `amount` in cents —
  this check stays fully synchronous (pure computation, no network) and is
  the one integrity check protecting every balance calculation downstream.
- Balances (`utils/balances.js`) are never stored — they're recomputed from
  the live expense list on every read, so a delete or edit can never leave a
  stale total behind.

**Session**: Supabase Auth's session (JWT), not app-controlled — persisted by
`supabase-js` under a `sb-<project-ref>-auth-token` key in `localStorage`
(the one remaining `localStorage` use in the app, and it's Supabase's, not
ours). `AuthContext` mirrors it into `{ id, name, email }` via `useAuth()`.

**Row Level Security is the real security boundary.** Every table
(`users`, `groups`, `group_members`, `expenses`, `expense_splits`) has RLS
enabled, scoped to "rows for groups the current `auth.uid()` belongs to" —
`storage.js`'s own email/groupId filtering on top of that is defensive, not
the actual boundary. `anon` has zero grants on any of these tables; nothing
works without a real session.

## Routes (`src/App.jsx`)

| Path               | Page             | Auth          |
| ------------------ | ---------------- | ------------- |
| `/`                | `Landing`        | public        |
| `/login`           | `Login`          | public        |
| `/register`        | `Register`       | public        |
| `/forgot-password` | `ForgotPassword` | public        |
| `/reset-password`  | `ResetPassword`  | public        |
| `/dashboard`       | `Dashboard`      | `RequireAuth` |
| `/group/new`       | `CreateGroup`    | `RequireAuth` |
| `/group/:id`       | `GroupDetail`    | `RequireAuth` |
| `*`                | redirect to `/`  | —             |

`RequireAuth` redirects to `/login` (preserving the intended path in router
state) when `useAuth().isAuthenticated` is false.

`/reset-password` is public but only functional when reached from the emailed
"forgot password" link: `supabaseClient.js` has `detectSessionInUrl: true`
specifically so that link's token turns into a real (short-lived,
single-purpose) session automatically. Visiting it directly with no valid
token still renders the form; submitting shows
`content.auth.resetLinkExpiredError` instead of crashing.

## Key conventions

**Centralized copy.** Every piece of user-facing text — labels, placeholders,
button text, errors, toasts, aria-labels — lives in `src/constant.js`, grouped
by feature (`content.login`, `content.groupDetail`, `content.addExpenseModal`,
etc.). Components import `content` and never hardcode a string. Entries that
depend on a count or interpolated value are **functions**, not strings — e.g.
`copy.personCount(count)`, `copy.removeAria(name)` — call them, don't template
around them. When adding a feature with new UI text, add the copy to
`constant.js` first, then reference it — do not inline text in a component.

**Money in integer cents.** All arithmetic goes through `utils/money.js`
(`toCents`, `splitEqually`, `formatMoney`). Never do float math on dollar
amounts directly — floating point loses cents when splitting unevenly.
`splitEqually` hands any remainder cents to the first participants in a
**stable sort order**, so callers must pass participants pre-sorted (usually
by email) for reproducible results.

**Storage is the only data boundary.** Pages and components never call
Supabase directly — everything goes through `src/data/storage.js` (and, for
auth, `useAuth()`/`AuthContext.jsx`). Every write updates the in-memory cache
and calls `bump()`, which increments a version counter that
`useStoreVersion()` (via `useSyncExternalStore`) subscribes to, so any
component reading storage inside a `useMemo` keyed on that version re-renders
automatically after a write anywhere in the app. There is currently **no
cross-tab/cross-device live sync** — the old `storage` event listener doesn't
apply anymore (data isn't in `localStorage`), and no Supabase Realtime
subscription has replaced it. A second tab/device only sees a change after
its own next login or write-triggered resync.

**`login`/`register`/`requestPasswordReset`/`updatePassword` are `async`**
(real network calls now, not synchronous `localStorage` reads) — callers must
`await` them. `logout()` stays synchronous by design: it clears local state
immediately, then fires `supabase.auth.signOut()` in the background, so a
caller that navigates right away (`AppShell` does) doesn't race a
still-"authenticated" render. `createGroup`/`createExpense`/`deleteExpense`
also stay fully synchronous from the caller's perspective (optimistic
cache update returned immediately; the real Supabase write happens after, in
the background — see Data models).

**Toasts + confirm modals for actions.** Success paths (sign in, register,
create group, add/delete expense, sign out) call `toast.success(...)` from
`react-toastify`; copy comes from `content.*`. Toast look/position/duration
are themed in `src/toast-theme.css` and configured once via
`content.toast` in `App.jsx`'s single `<ToastContainer>` — don't add a second
one. Destructive actions (deleting an expense) go through
`components/ConfirmModal.jsx` rather than an inline confirm state.

**Design tokens, not literal colors.** All colors, radii, and type sizes are
CSS variables in the `@theme` block of `src/index.css` (`--color-primary`,
`--color-pos-fg`/`--color-neg-fg` for financial state, `--radius-card`, etc.).
Reuse an existing token for a new UI element instead of introducing a new
color — e.g. `CategoryTag` reuses `--color-flat-bg`/`--color-flat-fg` rather
than inventing a per-category palette. The app deliberately has no shadows
anywhere; depth comes from `border-line` + background contrast only.

**Modals** (`AddExpenseModal`, `ConfirmModal`) are hand-rolled dialogs, not a
library: `role="dialog"`/`role="alertdialog"`, focus trapped via a manual
`Tab`/`Shift+Tab` handler, Escape closes, focus restored to the previously
focused element on unmount, background scroll locked via `document.body.style.overflow`.
Follow this pattern for any new modal rather than reaching for a dependency.

**Shared UI primitives** live in `src/components/ui.jsx` (`Button`, `Field`,
`TextInput`, `FormError`, `StatusBadge`, `CategoryTag`, `Money`, `BalancePill`,
`Avatar`, `EmptyState`). Prefer these over ad hoc markup for a new field or
badge.

**Supabase RLS gotchas** (discovered the hard way — don't reintroduce these):

- A policy's `WITH CHECK`/`USING` can't safely do a plain subquery against
  another RLS-protected table if that table's own SELECT policy depends on
  the row you're in the middle of creating — classic circular dependency
  (e.g. inserting a group's first `group_members` row needs to check
  `groups.created_by`, but `groups`' SELECT policy requires already being a
  `group_members` row). Fix: wrap the cross-table check in its own
  `SECURITY DEFINER` helper function (see `is_group_creator`,
  `is_group_member`, `shares_group_with`) so it bypasses that table's RLS for
  just that one check, and `grant execute ... to authenticated` on it
  (`SECURITY DEFINER` still requires an EXECUTE grant to be callable at all).
- Don't chain `.select()` after a Supabase `.insert(...)` for a row whose
  visibility depends on itself existing (e.g. a brand-new group's first
  member row). That sends `Prefer: return=representation`, which makes
  PostgREST also apply the table's SELECT policy to the row it just
  inserted — which can fail even when the INSERT's own `WITH CHECK` is
  perfectly correct. `storage.js`'s writes never chain `.select()` for this
  reason.
- Revoking `EXECUTE` on a `SECURITY DEFINER` function only works if you name
  the actual role (`revoke ... from anon, authenticated`) — Supabase's
  default privileges grant functions to those roles directly, not via the
  `PUBLIC` pseudo-role, so `revoke ... from public` is a silent no-op there.
- Supabase Auth rejects signups (and password resets) for `@example.com` /
  `@example.org` (RFC 2606 reserved domains) — use a real-looking domain for
  any _new_ test account created through the actual UI. Doesn't affect
  accounts inserted directly via SQL (bypasses that validator), which is how
  the seeded test accounts exist.

## Environment and config

- `.env` (gitignored) / `.env.example` (committed): `VITE_SUPABASE_URL`,
  `VITE_SUPABASE_PUBLISHABLE_KEY`. `src/data/supabaseClient.js` throws at
  import time if either is missing.
- `.gitignore` also excludes `.playwright-mcp/` (snapshot/console-log output
  from ad hoc Playwright MCP testing — not a durable project artifact).
- This project's Supabase email sending is on the low-volume default sender
  (no custom SMTP configured) — repeated signup/password-reset testing can
  trip "email rate limit exceeded." Not a code bug; either wait it out or add
  custom SMTP in Supabase Studio.

## Known issues

- **Mobile (~375px) dashboard**: a group card's subtitle line (person/pending/
  expense count) wraps awkwardly instead of truncating, because the balance
  pill next to it claims a fixed width. `Dashboard.jsx`'s `GroupRow` — the
  title has `truncate`, the subtitle doesn't. Not fixed yet.
- **`CreateGroup`'s pending/active preview** can show "pending" for an
  invited email that's actually already registered, if you don't already
  share a group with them — RLS deliberately won't let the client check an
  arbitrary email's account status (anti-enumeration). Resolves correctly to
  "active" the moment the group is actually created.
- **Background write failures are silent.** `createGroup`/`createExpense`/
  `deleteExpense` roll back their optimistic cache update on a failed
  Supabase write and `console.error` it, but nothing shows the user a toast —
  there's no `await`able call site left for that. Would need those three
  call sites in `CreateGroup.jsx`/`GroupDetail.jsx` to go `async` to fix.
- One unconfirmed real auth account exists from manual testing:
  `covbnffseyzomobebm@vtmpj.com` — stuck pending email confirmation because
  that confirmation email got rate-limited. Harmless, left as-is.
