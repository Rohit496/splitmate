---
name: react-component
description: Creates React components following Splitmate's conventions.
when_to_use: Use when creating any new JSX component — pages, cards, forms, layouts.
---

# React Component Skill

## Where files go

- Full pages (routed in `src/App.jsx`) → `src/pages/[PageName].jsx`
- Reusable UI pieces used by more than one page → `src/components/[ComponentName].jsx`
- Small primitive elements (a new badge, tag, button variant, form control) →
  add an export to the existing `src/components/ui.jsx` — don't start a new
  file or a `ui/` folder for these.

## Required structure

See `template.jsx` for the exact code structure — reactive storage reads,
copy from `constant.js`, and the empty/primitive patterns below.

## Rules

- Tailwind utility classes only — no `style={}` and no new `.css` files.
- Mobile-first: base classes target mobile, add `sm:`/`md:` for larger screens.
- Every piece of user-facing text — labels, placeholders, button text, errors,
  toasts, aria-labels — comes from `content` in `src/constant.js`. Add the
  copy there first, then import it; never inline a string. Entries that take
  a count or name are functions (`copy.removeAria(name)`) — call them, don't
  template around them.
- Every list-shaped component needs an `EmptyState` (from `ui.jsx`) for the
  zero-items case — never render nothing silently.
- No loading/spinner state needed: storage (`src/data/storage.js`) reads
  `localStorage` synchronously, there's no network round trip to wait on.
- Props destructured at the top of the function.
- No business logic in components — call `storage.js` functions or `utils/`
  helpers (`money.js`, `balances.js`) and keep the component to rendering.
- Never touch `localStorage` directly — go through `src/data/storage.js`.
- If the component reads storage data, subscribe with
  `useStoreVersion()` (`src/hooks/useStore.js`) and recompute the read inside
  a `useMemo` keyed on that version — this is how the component picks up
  writes made anywhere else in the app (including other tabs) without a
  manual refresh.
- Reuse the `ui.jsx` primitives instead of ad hoc markup: `Button`,
  `ButtonLink`, `TextButton`, `Card`, `Field`, `TextInput`, `FormError`,
  `StatusBadge`, `CategoryTag`, `Money`, `BalancePill`, `Avatar`, `EmptyState`.
- Pages are wrapped in `<AppShell>` (see any file in `src/pages/`); modals
  follow the hand-rolled dialog pattern in `AddExpenseModal.jsx` /
  `ConfirmModal.jsx` rather than a modal library.

## Styling reference

Colors, radii and type sizes are design tokens defined in the `@theme` block
of `src/index.css` — reuse one of these, never a literal Tailwind color
(`gray-500`, `green-600`, `shadow-sm`, etc.) or an inline style. The app has
**no shadows anywhere**; depth comes from `border-line` plus background
contrast only.

- Page background: `bg-canvas`
- Card / surface: `rounded-card border border-line bg-surface p-5` (this is
  `cardClass` / `<Card>` in `ui.jsx` — use the component, don't retype the
  string)
- Heading: `text-xl font-semibold text-ink`
- Secondary text: `text-sm text-ink-muted` (or `text-ink-soft` for slightly
  stronger secondary text)
- Primary action: `<Button variant="primary">` — never hardcode button
  styles; variants are `primary`, `secondary`, `danger`
- Money, positive (owed to the user): `<Money cents={c} tone="positive" />`
  → `text-pos-fg`
- Money, negative (user owes): `<Money cents={c} tone="negative" />` →
  `text-neg-fg`
- Pending member: `<StatusBadge status="pending" />` (uses `--color-warn-*`)
- Expense category: `<CategoryTag category={expense.category} />` — one
  neutral tone for every category, no per-category color coding

## Component size limits

If a component exceeds ~150 lines, split it. The parent renders layout,
child components handle the individual pieces.
