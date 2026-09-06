# Splitmate

A local-only expense-splitting app (think Splitwise): create a group, add
shared expenses, and see the fewest payments needed to settle up. There is no
backend — every record lives in the browser's `localStorage`.

## Tech stack

- **React 19** + **React Router 7** (`BrowserRouter`, client-side routing only)
- **Vite 8** (`@vitejs/plugin-react`) — dev server and build
- **Tailwind CSS v4** via `@tailwindcss/vite` — no `tailwind.config.js`; all
  design tokens live in the `@theme` block in `src/index.css`
- **react-toastify** for toast notifications
- **lucide-react** for icons
- No test runner, no TypeScript, no state library (React context + `useSyncExternalStore` cover it)

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
  context/AuthContext.jsx  # auth state + register/login/logout
  data/storage.js        # the ONLY module that touches localStorage
  hooks/useStore.js      # useSyncExternalStore wrapper for storage changes
  utils/money.js         # cents<->dollars, formatting, date helpers
  utils/balances.js      # net balances + debt-simplification algorithm
```

## Data models

All records are plain JSON arrays under namespaced `localStorage` keys
(`splitmate.users`, `splitmate.groups`, `splitmate.expenses`,
`splitmate.session`), managed exclusively by `src/data/storage.js`.

**User** (`splitmate.users`)
```
{ id, name, email (normalized lowercase), password (plain text — local test data only), createdAt }
```

**Group** (`splitmate.groups`)
```
{ id, name, createdBy (email), createdAt, members: [{ email, addedAt }] }
```
Members are stored by email only. `storage.getGroup()` / `listGroupsForEmail()`
resolve each member at *read time* against the users table, adding
`{ name, userId, status: 'active'|'pending', isCreator }` — so inviting
someone who hasn't signed up yet ("pending") automatically becomes "active"
the moment they register with that email. Nothing needs to be migrated.

**Expense** (`splitmate.expenses`)
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
- Deletes are **soft**: `deleteExpense` just flags `isDeleted`; `listExpenses`
  filters deleted rows out. Nothing is ever hard-removed.
- `createExpense` **throws** if `splits` don't sum to `amount` in cents — this
  is the one integrity check protecting every balance calculation downstream.
- Balances (`utils/balances.js`) are never stored — they're recomputed from
  the live expense list on every read, so a delete or edit can never leave a
  stale total behind.

**Session**: `splitmate.session` holds just the logged-in user's `id`.

## Routes (`src/App.jsx`)

| Path | Page | Auth |
|---|---|---|
| `/` | `Landing` | public |
| `/login` | `Login` | public |
| `/register` | `Register` | public |
| `/dashboard` | `Dashboard` | `RequireAuth` |
| `/group/new` | `CreateGroup` | `RequireAuth` |
| `/group/:id` | `GroupDetail` | `RequireAuth` |
| `*` | redirect to `/` | — |

`RequireAuth` redirects to `/login` (preserving the intended path in router
state) when `useAuth().isAuthenticated` is false.

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

**Storage is the only data boundary.** Pages and components never read/write
`localStorage` directly — everything goes through `src/data/storage.js`. Every
write calls `bump()`, which increments a version counter that
`useStoreVersion()` (via `useSyncExternalStore`) subscribes to, so any
component reading storage inside a `useMemo` keyed on that version re-renders
automatically after a write anywhere in the app (including other browser
tabs, via the `storage` event listener).

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
