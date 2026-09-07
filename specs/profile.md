# Profile

A new protected page at `/profile` where a signed-in user manages their own
account: see their name, email, join date, and profile photo; change the name;
change the password; and upload or remove a photo. It's the account-settings
counterpart to `GroupSettings` (which manages a _group_) — same visual
language, same form patterns, scoped to the one signed-in user instead of a
group.

This is a spec only. Nothing here is built yet — there is no `/profile` route,
no `content.profile` copy block, no `avatar` column, and no Supabase Storage
bucket today.

## Non-goals (v1)

- **No editing the email address.** Email is display-only, always — see
  [Email (read-only)](#email-read-only) for why. There is no "change email"
  flow, no email-verification round trip, nothing.
- **No account deletion / deactivation.** Splitmate has no delete-account flow
  anywhere yet (expenses are soft-deleted, members can't be removed once they
  have expenses); deleting a user would orphan `created_by`/`paid_by`/split
  rows across every group. Out of scope — a separate, carefully-designed
  feature if ever.
- **No other people's photos across the app (v1).** The uploaded photo shows on
  the Profile page and in the signed-in user's own navbar identity only. Group
  member lists (`GroupDetail`, `GroupSettings`), the `Avatar` in expense rows,
  etc. keep showing **initials** for everyone, same as today. Threading a photo
  URL through the `group_members … users(name)` join so co-members see each
  other's photos is a deliberate follow-up, called out in
  [Backend changes](#backend--data-changes).
- **No email/2FA/session management.** No "sign out everywhere," no active-
  session list, no MFA. Changing the password does not revoke other sessions
  (Supabase's default) — noted, not solved, in
  [Change password](#change-password).
- **No preferences.** No theme, notification, currency, or locale settings —
  the app is USD-only and single-theme by design.

## Entry point & routing

A new route, `/profile`, gated by `RequireAuth` exactly like `/dashboard` and
`/reports`:

```jsx
<Route
  path="/profile"
  element={
    <RequireAuth>
      <Profile />
    </RequireAuth>
  }
/>
```

Because `RequireAuth` guarantees a session and `AuthProvider` holds all
rendering until the persisted session has been read (`if (!initialized) return
null`), `Profile` can assume `useAuth().user` is non-null — no loading or
null-guard state needed on the page itself.

**Reached from the navbar.** Today `AppShell`'s right-hand identity block is a
non-interactive `<span>` (`<User /> {user.name}`). Turn that span into a
`<Link to="/profile">` — clicking your own name/photo is the natural way into
your account settings, and it mirrors the existing `/reports` link's active
treatment:

```jsx
<Link
  to="/profile"
  aria-current={location.pathname === '/profile' ? 'page' : undefined}
  className="inline-flex items-center gap-2 text-sm text-ink-soft transition-colors hover:text-ink"
>
  <Avatar name={user.name} src={user.avatarUrl} />
  {user.name}
</Link>
```

Swap the generic `<User size={16} />` icon for the shared `Avatar` (extended to
take an optional photo — see [Profile photo](#profile-photo)) so the navbar
shows the actual photo when there is one and initials when there isn't. The
"Sign out" button stays exactly as-is beside it.

`Profile` sets its own tab title via `useDocumentTitle(content.pageTitles.profile)`
at the top of the component (new entry — `content.pageTitles` has none today),
following the per-route-title convention.

## Page layout

Rendered inside `AppShell` (sticky navbar + warm canvas + footer), like every
signed-in page. Content is a single column capped at `max-w-2xl` and centered
(`mx-auto`) — narrower than `AppShell`'s full `PAGE` width, matching the app's
"a list of numbers, not a workspace" narrow ethos (DESIGN.md → Layout) so a
short password form never stretches to a 1150px-wide field. Three stacked
cards, `mt-8` apart, same rhythm as `GroupSettings`.

No back link — `/profile` is a top-level destination reached from the navbar
(like Dashboard and Reports, which also have no back link); the wordmark
remains the route home to `/dashboard`.

### Desktop (≥ 640px)

```
┌──────────────────────────────────────────────────────────────┐
│  🧡 Splitmate   Reports                     (PS) Priya Sharma  [Sign out] │  ← navbar identity now links to /profile
└──────────────────────────────────────────────────────────────┘

  Profile
  Your account details.

  ┌ Your details ─────────────────────────────────────────────┐
  │                                                            │
  │   ┌────────┐   Email                                       │
  │   │        │   priya.sharma@example.com   🔒 can’t change  │
  │   │  (PS)  │                                               │
  │   │        │   Member since                                │
  │   └────────┘   12 Mar 2026                                 │
  │                                                            │
  │   [ Change photo ]   [ Remove photo ]                      │
  └────────────────────────────────────────────────────────────┘

  ┌ Name ──────────────────────────────────────────────────────┐
  │  Name                                                      │
  │  [ Priya Sharma                          ]  [ 💾 Save ]     │
  └────────────────────────────────────────────────────────────┘

  ┌ Change password ───────────────────────────────────────────┐
  │  Current password    [ •••••••• ]                          │
  │  New password        [ •••••••• ]   At least 6 characters. │
  │  Confirm new password[ •••••••• ]                          │
  │                                        [ 🔑 Update password ]│
  └────────────────────────────────────────────────────────────┘
```

### Mobile (< 640px)

Cards stay full-width and stacked (they already are — single column). Within
the "Your details" card, the avatar sits **above** the read-only rows instead
of beside them (`flex-col sm:flex-row`). The Name card's input and Save button
**stack** (`flex-col sm:flex-row`) so the button isn't crushed at ~375px — an
improvement over `GroupSettings`, which keeps them inline. Password fields are
full-width stacked with a full-width Save button on both breakpoints, exactly
like `Register`/`ResetPassword`. Photo action buttons wrap (`flex-wrap`).

```
🧡 Splitmate  Reports    (PS) Priya  [Sign out]

Profile
Your account details.

┌ Your details ─────────────┐
│        ┌────────┐          │
│        │  (PS)  │          │
│        └────────┘          │
│  [Change photo][Remove]    │
│                            │
│  Email                     │
│  priya.sharma@example.com  │
│  🔒 can’t be changed        │
│                            │
│  Member since              │
│  12 Mar 2026               │
└────────────────────────────┘

┌ Name ──────────────────────┐
│  Name                      │
│  [ Priya Sharma          ] │
│  [ 💾 Save              ]   │
└────────────────────────────┘

┌ Change password ───────────┐
│  Current password          │
│  [ ••••••••              ] │
│  New password              │
│  [ ••••••••              ] │
│  At least 6 characters.    │
│  Confirm new password      │
│  [ ••••••••              ] │
│  [ 🔑 Update password    ] │
└────────────────────────────┘
```

Uses the existing visual language throughout — `cardClass` for every card,
`Field`/`TextInput`/`FormError`/`Button`/`TextButton`/`Avatar` from
`components/ui.jsx`, `--color-*` tokens only, no new colors, no shadows. Money
tokens don't apply here (nothing on this page is money).

## What's shown

All four read from `useAuth().user`, which is `{ id, name, email, joinedAt,
avatarUrl }` after the additions below (`joinedAt` and `avatarUrl` are new —
see [Backend changes](#backend--data-changes)). Nothing on this page reads the
`storage.js` group/expense caches, so it doesn't need `useStoreVersion()`; it
re-renders when the auth user changes, which is exactly what every edit here
triggers (see [How the navbar updates](#how-the-navbar-updates-when-the-name-changes)).

### Profile photo

The signed-in user's uploaded image if there is one, otherwise the initials
`Avatar`. Rendered large on the Profile page (see [Profile photo](#profile-photo)
for the full upload spec).

### Name

`user.name` — shown in the identity area and pre-filled into the editable Name
field. This is the same `user.name` the navbar shows, sourced from Supabase
Auth user metadata (`user_metadata.name`), falling back to
`nameFromEmail(email)` when metadata has no name (via `toPublicUser` in
`AuthContext`).

### Email (read-only)

`user.email` — displayed as a plain, non-editable row (label + value in
`text-ink`, plus a muted hint "Your email can’t be changed."), **not** a
disabled `<input>`, so it never looks like a field you could focus and type
into. A small `Lock` (lucide) icon next to the value reinforces it.

Why read-only: the email is the join key for the whole pending→active member
system. `group_members` rows are keyed by **email**; two DB triggers
(`link_group_members_on_signup`, `link_new_group_member`) resolve an invited
email to an account by matching it. Changing a registered user's email would
silently detach them from every group that invited them by the old address and
strand those memberships. Email changes are therefore out of scope entirely
(see Non-goals) and the UI must not imply otherwise.

### Join date (read-only)

`user.joinedAt` — the account's creation timestamp, shown as e.g. **"Member
since 12 Mar 2026"**. Displayed with the existing `formatDate` helper by
slicing the ISO timestamp's date portion:

```js
formatDate(user.joinedAt.slice(0, 10)) // "12 Mar 2026"
```

`joinedAt` is Supabase's `auth.users.created_at` (an ISO timestamp), surfaced
through `toPublicUser` — see [Backend changes](#backend--data-changes). It
mirrors `public.users.created_at` (same row, created by the signup trigger).
Slicing the date portion (UTC) is consistent with the app's existing
date-as-string handling (`formatDate`/`todayISO` never do timezone math); a
"joined on" date doesn't need sub-day precision. Never editable.

## Edit name

A dedicated card, structurally identical to `GroupSettings`'s rename form.

**Field & control.** One `Field` (`label={copy.nameLabel}`, `id="profile-name"`)
wrapping a `TextInput` and a `Button type="submit"` with a `Save` icon. On
mobile they stack (`flex-col sm:flex-row`); on `sm:` up they're inline
(`sm:flex gap-2`, button `shrink-0`).

**Seeding.** Seed the input from `user.name` **once** via a `useEffect` + a
`nameSeeded` flag, the same one-time-seed pattern `GroupSettings` uses — so a
reactive re-render from an auth event (e.g. the `USER_UPDATED` fired by the
save itself, or a token refresh) doesn't clobber whatever the user is mid-edit.

**Validation** (client-side, before any network call):

- Trim the value. Empty/whitespace-only → inline error `copy.nameRequiredError`
  ("Enter your name."), no write.
- Longer than **60 characters** (after trim) → `copy.nameTooLongError`. This
  caps navbar overflow (see the known-issue note below) and is a sane sanity
  limit; 60 comfortably fits any real name.

**Save.** Call a new `updateName(name)` on the auth context (see below). Unlike
`storage.js`'s optimistic, silent, non-awaitable writes, this one is **awaited**
so the page can react to success and failure honestly:

```js
async function handleRename(event) {
  event.preventDefault()
  const trimmed = name.trim()
  if (!trimmed) return setNameError(copy.nameRequiredError)
  if (trimmed.length > 60) return setNameError(copy.nameTooLongError)

  setSaving(true)
  const result = await updateName(trimmed)
  setSaving(false)
  if (!result.ok) return setNameError(result.error)

  toast.success(copy.nameSavedToast)
  setNameError('')
}
```

Disable the Save button while `saving` is true (`disabled:opacity-50` is
already baked into `buttonClass`). On success, `toast.success(copy.nameSavedToast)`.
On failure, show `result.error` in the `Field`'s `error` slot (an inline
message under the field, matching the rest of the app).

**What `updateName` must do (the load-bearing part).** The name lives in **two**
backend places and both must be written, or the user's name goes inconsistent:

1. **Supabase Auth user metadata** — `supabase.auth.updateUser({ data: { name }
   })`. This is what `toPublicUser` reads (`user_metadata.name`), so it drives
   the Profile display **and the navbar**, and it's what makes the update
   reactive (see next section).
2. **`public.users.name`** — the `groups` query joins `group_members … users
   ( name )`, so **this** column is what every _other_ member sees as your name
   in their group lists, and what the current user sees for themselves in their
   own group member lists (`mapGroupRow` sets `member.name = m.users?.name`).
   Updating only auth metadata would leave your name stale everywhere a group
   member list is rendered.

Respecting the module boundary (`AuthContext` owns `auth.*`, `storage.js` owns
tables), split it:

```js
// AuthContext.jsx
const updateName = useCallback(async (name) => {
  const trimmed = String(name ?? '').trim()
  if (!trimmed) return { ok: false, error: copy.nameRequiredError }

  const { error } = await supabase.auth.updateUser({ data: { name: trimmed } })
  if (error) return { ok: false, error: content.profile.nameSaveFailedError }

  storage.updateCurrentUserName(trimmed) // writes public.users.name (below)
  return { ok: true }
}, [])
```

```js
// storage.js — new export, optimistic like every other write here
export function updateCurrentUserName(name) {
  const trimmed = String(name ?? '').trim()
  currentUserName = trimmed // keep the in-memory identity in sync immediately
  // optimistic cache patch: update this user's name in every group's member list
  groupsCache = groupsCache.map((group) => ({
    ...group,
    members: group.members.map((m) =>
      m.email === currentUserEmail ? { ...m, name: trimmed } : m,
    ),
  }))
  bump()
  ;(async () => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ name: trimmed })
        .eq('id', currentUserId)
      if (error) throw error
    } catch (error) {
      console.error('[storage] updateCurrentUserName failed', error)
      scheduleSync() // re-pull authoritative names on failure
    } finally {
      scheduleSync()
    }
  })()
}
```

The `public.users` UPDATE requires a new RLS policy (`id = auth.uid()`) —
today the table has no UPDATE policy, so it's default-deny (see
[Backend changes](#backend--data-changes)). The auth-metadata write in step 1
is the awaited one that gates the success toast; the `public.users` write is
optimistic-with-rollback like the rest of `storage.js`, since a co-member
seeing a one-sync-delayed name is not worth blocking the toast on.

## How the navbar updates when the name changes

**Automatically, with zero changes to `AppShell`'s render logic** — this falls
straight out of the existing auth plumbing:

1. `updateName` calls `supabase.auth.updateUser({ data: { name } })`.
2. supabase-js emits a `USER_UPDATED` event on the auth channel.
3. `AuthContext`'s existing `supabase.auth.onAuthStateChange((_event, session)
   => { setUser(toPublicUser(session.user)); … })` handler fires. `session.user`
   now carries the new `user_metadata.name`, so `toPublicUser` returns a user
   object with the new `name`, and `setUser` updates the context value.
4. Every consumer of `useAuth().user` re-renders — including `AppShell`, whose
   identity link renders `{user.name}`. The navbar shows the new name the
   instant the metadata write resolves.

That same handler also calls `storage.upsertUserProfile(publicUser)`, which
refreshes `currentUserName` and schedules a resync — so `listUsers()` /
`getUserByEmail()` and anything reading them stay consistent too. In short:
**the name flows navbar-ward through the auth context, not through any manual
prop or event.** No `AppShell` edit is needed for the update to appear; the
only `AppShell` change in this spec is making the identity a `Link` (entry
point) and swapping its icon for `Avatar`.

> **Known-issue interaction.** `AppShell`'s navbar already wraps awkwardly for a
> long signed-in name on ~390px viewports (documented in CLAUDE.md → Known
> issues — the header has a fixed height and no `flex-wrap` handling). Editing
> your name to something long can trigger that today-known bug. The 60-char cap
> above bounds it; actually fixing the navbar wrap is out of scope for this
> feature.

## Change password

A dedicated card with three password fields and one submit, modeled on
`ResetPassword` — but with a crucial addition: **the current password is
required and verified**, because a Profile-page change happens inside an
already-authenticated session, whereas `ResetPassword` runs against the
single-purpose session minted from an emailed link.

**Fields** (each a `Field` + `TextInput type="password"`):

| Field                | id                 | autoComplete       | Hint                     |
| -------------------- | ------------------ | ------------------ | ------------------------ |
| Current password     | `profile-current`  | `current-password` | —                        |
| New password         | `profile-new`      | `new-password`     | `copy.passwordHint` ("At least 6 characters.") |
| Confirm new password | `profile-confirm`  | `new-password`     | —                        |

All three are local component state, cleared to `''` on a successful change.
A single `FormError` banner sits above the submit button for errors that aren't
tied to one field, same placement as `ResetPassword`/`Register`.

**Validation rules** (checked in this order; first failure stops and shows a
message, no network call until all client-side checks pass):

1. **Current password empty** → `copy.currentPasswordRequiredError` ("Enter
   your current password.").
2. **New password too short** (`< 6`) → reuse `content.auth.passwordTooShortError`
   ("Use a password of at least 6 characters."), the same 6-char floor
   `register`/`updatePassword` already enforce.
3. **New ≠ Confirm** → `copy.mismatchError` ("Passwords don’t match.").
4. **New === Current** → `copy.samePasswordError` ("Choose a password different
   from your current one.") — reject a no-op change so the success toast never
   lies.

**Submit** calls a new `changePassword({ currentPassword, newPassword })` on the
auth context, which verifies the current password by re-authenticating, then
updates:

```js
// AuthContext.jsx
const changePassword = useCallback(
  async ({ currentPassword, newPassword }) => {
    if (!newPassword || newPassword.length < 6)
      return { ok: false, error: copy.passwordTooShortError }

    // Verify the current password. updateUser({ password }) alone does NOT
    // require it — any active session could otherwise change the password
    // without knowing the old one (e.g. a walk-up on an unlocked browser).
    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email: currentUserEmailFromContext, // user.email
      password: currentPassword,
    })
    if (reauthError)
      return { ok: false, error: content.profile.currentPasswordWrongError }

    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) return { ok: false, error: content.profile.passwordSaveFailedError }

    return { ok: true }
  },
  [user?.email],
)
```

The component:

```js
async function handleChangePassword(event) {
  event.preventDefault()
  if (!current) return setError(copy.currentPasswordRequiredError)
  if (newPass.length < 6) return setError(content.auth.passwordTooShortError)
  if (newPass !== confirm) return setError(copy.mismatchError)
  if (newPass === current) return setError(copy.samePasswordError)

  setSaving(true)
  const result = await changePassword({ currentPassword: current, newPassword: newPass })
  setSaving(false)
  if (!result.ok) return setError(result.error)

  toast.success(copy.passwordSavedToast)
  setCurrent(''); setNewPass(''); setConfirm(''); setError('')
}
```

**Notes & edge cases:**

- **Re-auth succeeds silently as the same user.** `signInWithPassword` with the
  already-signed-in email just refreshes the current session; it does not sign
  anyone else in or navigate. It's purely a password check.
- **Wrong current password** is reported as a field-agnostic banner
  (`currentPasswordWrongError`), not tied to the current-password `Field`, to
  match the app's anti-enumeration tone elsewhere (though enumeration isn't a
  concern here — you're already signed in).
- **Session stays valid; other sessions are not revoked.** Supabase keeps the
  current session after `updateUser({ password })`, so the user is _not_ kicked
  to `/login`. Any other device's session also stays valid (Supabase default) —
  a "sign out everywhere" is an explicit non-goal.
- **Rate limits.** Repeated wrong-password attempts and repeated updates can hit
  Supabase Auth rate limits (CLAUDE.md → Environment notes the low-volume
  default sender / rate limits). If `updateUser`/`signInWithPassword` returns a
  rate-limit error, surface `result.error` (Supabase's message) in the banner
  rather than a generic one — don't swallow it.
- Disable the submit button while `saving`.

## Profile photo

Entirely new — there is no `avatar` column and no Supabase Storage bucket
today. The photo shows on the Profile page (large) and in the navbar identity
(via `Avatar`), for the signed-in user only.

### Accepted files

- **Types:** JPEG, PNG, WebP only — `accept="image/jpeg,image/png,image/webp"`
  on the file input, **and** re-checked in JS against `file.type` (the `accept`
  attribute is a hint, not enforcement). GIF/SVG/HEIC and anything else →
  `copy.photoTypeError` ("Choose a JPEG, PNG, or WebP image."). SVG is
  excluded deliberately (script-in-SVG XSS surface).
- **Size:** at most **2 MB** (`file.size <= 2 * 1024 * 1024`). Over → 
  `copy.photoTooLargeError` ("Image must be under 2 MB."). No client-side
  downscaling/cropping in v1 — just accept a reasonable file or reject it.
- One file at a time (no `multiple`).

### Control & flow

A hidden `<input type="file">` triggered by a **"Change photo"** `Button`
(secondary), plus a **"Remove photo"** `TextButton` shown only when a photo
exists. The `<img>`/`Avatar` shows a subtle "uploading…" state (disable the
buttons, `disabled:opacity-50`) while a write is in flight.

On file selection:

1. Validate type and size (above); bad file → inline error, stop.
2. Upload to Supabase Storage under a per-user path (below).
3. On success, persist the new path and refresh the UI (below).
4. `toast.success(copy.photoUpdatedToast)`. On any failure,
   `copy.photoUploadFailedError` ("Couldn’t upload your photo. Try again.")
   as an inline error; leave the old photo in place.

### Where it's stored

- A **public** Supabase Storage bucket named `avatars`.
- Object path: **`{userId}/{uuid}.{ext}`** — e.g.
  `a1b2…/9f3c…​.webp`. Foldering by `userId` is what the storage RLS policy
  keys on (a user may only write within their own folder). Using a fresh `uuid`
  filename per upload (rather than a fixed `avatar.ext`) sidesteps CDN caching
  of a stale image.
- After a successful upload, **best-effort delete** the previous object (read
  the old path from `user.avatarUrl`/the stored path before overwriting) so the
  bucket doesn't accumulate orphans. A failed delete is logged, not surfaced —
  the new photo is already live.
- The canonical pointer is a new **`public.users.avatar_path`** column (the
  storage object path, nullable). The public URL is derived at read time with
  `supabase.storage.from('avatars').getPublicUrl(path)` — no need to store the
  full URL.
- Mirror `avatar_path` into **Auth user metadata** too (`updateUser({ data: {
  avatar_path } })`), for the same reason `name` is mirrored there: it's what
  `toPublicUser` reads to build `user.avatarUrl`, which drives the navbar and
  makes the change reactive via `USER_UPDATED` (identical mechanism to
  [name updates](#how-the-navbar-updates-when-the-name-changes)). `public.users
  .avatar_path` is the canonical/cross-user copy; the metadata copy is a
  denormalized cache for the current user's own chrome.

So a photo change is three writes, orchestrated by the context method:
`storage.upload` → `public.users.avatar_path` (via `storage.js`) → auth
metadata (via `AuthContext`). Model it the same way as `updateName`: the
awaited auth-metadata write gates the toast; the table write is optimistic.

### Fallback when none uploaded

The existing initials `Avatar` (`components/ui.jsx`) — the two-letter initials
derived from `user.name`, on the neutral Ash/Slate-Stone pill. This is already
the app-wide treatment for every person, so "no photo" is visually identical to
how the user appears everywhere else. Extend `Avatar` to accept an optional
photo:

```jsx
export function Avatar({ name, src, size = 'sm', className = '' }) {
  const initials = /* …unchanged… */
  const dims = size === 'lg' ? 'size-20 text-2xl' : 'size-7 text-[11px]'
  if (src) {
    return (
      <img
        src={src}
        alt=""              // decorative; the name is always adjacent as text
        className={`${dims} shrink-0 rounded-full object-cover ${className}`}
      />
    )
  }
  return (
    <span aria-hidden="true" className={`${dims} … existing initials markup …`}>
      {initials || '?'}
    </span>
  )
}
```

- `object-cover` + `rounded-full` so any aspect ratio crops to a circle.
- `alt=""` (decorative): the user's name is always rendered as adjacent text
  (navbar, profile), so the image adds no information a screen reader needs —
  don't double-announce it.
- A `size` prop so the Profile page can render it large (`size-20`) while the
  navbar keeps the existing `size-7`. Callers that pass no `src` (every
  existing call site) are unchanged — `src` is optional and defaults to
  initials, so this is a backward-compatible extension.
- **Broken image URL** (deleted object, transient CDN miss): add an `onError`
  handler that clears `src` so it falls back to initials rather than showing a
  broken-image glyph.

### Remove photo

"Remove photo" clears it: set `public.users.avatar_path = null` and auth
metadata `avatar_path = null` (→ `user.avatarUrl` becomes null → initials
everywhere, reactively), and best-effort delete the storage object. Confirm?
**No** — removal is trivially reversible (re-upload) and low-stakes, so it does
**not** use `ConfirmModal` (same reasoning the app applies to non-destructive
actions like recording a settlement). `toast.success(copy.photoRemovedToast)`.

## Error states (per field)

| Field                | Trigger                                  | Message (copy key)                          | Presentation                          |
| -------------------- | ---------------------------------------- | ------------------------------------------- | ------------------------------------- |
| **Name**             | empty / whitespace only                  | `profile.nameRequiredError` (or reuse `auth.nameRequiredError`) | inline under the field (`Field.error`) |
|                      | > 60 chars                               | `profile.nameTooLongError`                  | inline under the field                |
|                      | auth-metadata write fails                | `profile.nameSaveFailedError`               | inline under the field                |
| **Email**            | — (read-only, never editable)            | —                                           | —                                     |
| **Current password** | empty                                    | `profile.currentPasswordRequiredError`      | banner above submit (`FormError`)     |
|                      | doesn't match account                    | `profile.currentPasswordWrongError`         | banner above submit                   |
| **New password**     | < 6 chars                                | `auth.passwordTooShortError` (reused)       | banner above submit                   |
|                      | equals current password                  | `profile.samePasswordError`                 | banner above submit                   |
|                      | update fails / rate-limited              | `profile.passwordSaveFailedError` or Supabase's own message | banner above submit    |
| **Confirm password** | ≠ new password                           | `profile.mismatchError`                     | banner above submit                   |
| **Photo**            | wrong type                               | `profile.photoTypeError`                    | inline under the photo controls       |
|                      | > 2 MB                                    | `profile.photoTooLargeError`                | inline under the photo controls       |
|                      | upload / persist fails                   | `profile.photoUploadFailedError`            | inline under the photo controls; old photo kept |
|                      | image URL fails to load                  | — (silent; falls back to initials via `onError`) | initials shown                   |

Convention, matching the rest of the app: **field-level** validation (name,
photo) shows inline under its own control via `Field`'s `error` slot or a small
`FormError` beneath the photo controls; the **password form** uses one shared
`FormError` banner above its submit button (there are three interdependent
fields, so a single banner reads better than three inline messages — same
choice `ResetPassword` makes). Errors clear (`setError('')`) on the next
keystroke/selection in the relevant control, same as every other form.

Design reminder: form errors use **Deep Brick on Blush** (`FormError`'s
`bg-neg-bg`/`text-neg-fg`, and `Field`'s `text-danger` message) — never Signal
Red, which is reserved for destructive confirmations only (DESIGN.md → Do's and
Don'ts).

## Backend & data changes

Schema lives only in the remote Supabase project (no local migrations — see
CLAUDE.md); apply these via the Supabase MCP `apply_migration`:

1. **`public.users.avatar_path`** — `alter table public.users add column
   avatar_path text;` (nullable; the storage object path, not a URL).
2. **UPDATE RLS on `public.users`** — the table has RLS enabled and (per
   CLAUDE.md) only a SELECT policy today, so name/avatar updates are
   default-denied. Add:
   ```sql
   create policy users_update_self on public.users
     for update using (id = auth.uid()) with check (id = auth.uid());
   ```
   Scope the writable columns at the app layer (only `name`/`avatar_path` are
   ever sent); the policy just guarantees a user can only update **their own**
   row.
3. **`avatars` Storage bucket** — public bucket. Policies on `storage.objects`:
   - Public **read** (bucket is public → `getPublicUrl` needs no signing).
   - **Write** (insert/update/delete) only within the user's own folder:
     ```sql
     -- for insert / update / delete, bucket_id = 'avatars'
     -- and (storage.foldername(name))[1] = auth.uid()::text
     ```
     `anon` gets no write grant (consistent with the app's "nothing works
     without a real session" stance).
4. **`toPublicUser` (AuthContext)** — extend the returned shape:
   ```js
   function toPublicUser(authUser) {
     if (!authUser) return null
     const email = storage.normalizeEmail(authUser.email)
     const avatarPath = authUser.user_metadata?.avatar_path
     return {
       id: authUser.id,
       name: authUser.user_metadata?.name || storage.nameFromEmail(email),
       email,
       joinedAt: authUser.created_at, // ISO timestamp; sliced to a date for display
       avatarUrl: avatarPath
         ? supabase.storage.from('avatars').getPublicUrl(avatarPath).data.publicUrl
         : null,
     }
   }
   ```
   `authUser.created_at` is always present on a Supabase auth user, so
   `joinedAt` needs no extra query. Existing consumers of `user` are unaffected
   (only new fields added).
5. **New context methods** on `AuthContext`'s value: `updateName(name)`,
   `changePassword({ currentPassword, newPassword })`, `updatePhoto(file)`,
   `removePhoto()` — all `async`, all returning `{ ok, error? }` like the
   existing `register`/`login`/`updatePassword`.
6. **New `storage.js` exports**: `updateCurrentUserName(name)` and
   `updateCurrentUserAvatar(path | null)` — both patch the in-memory
   `currentUser*` + `groupsCache` and write `public.users`, following the
   optimistic-write-with-rollback pattern of every other mutation there. (These
   keep `AuthContext` from importing the tables directly, preserving the
   "`storage.js` is the only table boundary" convention.)

**Cross-user photos (explicit follow-up, not v1):** to have co-members see each
other's photos, add `avatar_path` to the `GROUP_SELECT`'s `users ( name )`
sub-select (→ `users ( name, avatar_path )`), carry it into `mapGroupRow`'s
member shape, derive a URL there, and pass it as `Avatar`'s `src` in
`GroupDetail`/`GroupSettings`/expense rows. Deliberately deferred to keep v1
scoped to the account owner's own view.

## Copy (new `content.profile` block)

Per the centralized-copy convention — every string in `constant.js`, grouped by
feature, count/name-dependent entries as functions (none needed here). Also add
`pageTitles.profile` and, if not reusing the shared ones, the auth-error keys.

```js
profile: {
  heading: 'Profile',
  intro: 'Your account details.',

  // Your details card
  detailsHeading: 'Your details',
  emailLabel: 'Email',
  emailReadonlyHint: 'Your email can’t be changed.',
  joinedLabel: 'Member since',

  // Photo
  changePhoto: 'Change photo',
  removePhoto: 'Remove photo',
  photoUpdatedToast: 'Photo updated',
  photoRemovedToast: 'Photo removed',
  photoTypeError: 'Choose a JPEG, PNG, or WebP image.',
  photoTooLargeError: 'Image must be under 2 MB.',
  photoUploadFailedError: 'Couldn’t upload your photo. Try again.',

  // Name
  nameHeading: 'Name',
  nameLabel: 'Name',
  save: 'Save',
  nameSavedToast: 'Name updated',
  nameRequiredError: 'Enter your name.',
  nameTooLongError: 'Keep your name under 60 characters.',
  nameSaveFailedError: 'Couldn’t save your name. Try again.',

  // Password
  passwordHeading: 'Change password',
  currentPasswordLabel: 'Current password',
  newPasswordLabel: 'New password',
  confirmPasswordLabel: 'Confirm new password',
  passwordHint: 'At least 6 characters.',
  passwordPlaceholder: '••••••••',
  updatePassword: 'Update password',
  passwordSavedToast: 'Password updated',
  currentPasswordRequiredError: 'Enter your current password.',
  currentPasswordWrongError: 'That doesn’t match your current password.',
  mismatchError: 'Passwords don’t match.',
  samePasswordError: 'Choose a password different from your current one.',
  passwordSaveFailedError: 'Couldn’t update your password. Try again.',
},
```

```js
// content.pageTitles — add:
profile: 'Profile | Splitmate',
```

Reuse `content.auth.passwordTooShortError` ("Use a password of at least 6
characters.") for the new-password length rule rather than duplicating it, so
the 6-char floor stays defined in exactly one place.

## Accessibility

- The file input is a real, focusable `<input type="file">` visually hidden but
  reachable — trigger it from the "Change photo" button via a ref/label so
  keyboard and screen-reader users can invoke it (don't fake it with a
  `div`).
- Read-only email/join-date are plain text with visible labels — not disabled
  inputs (a disabled input is skipped by some screen readers and reads as "you
  could have edited this but can't now," the wrong message for a permanently
  fixed value).
- Every input has an associated `<label htmlFor>` via `Field` (already the
  case).
- Password fields carry correct `autoComplete` (`current-password` /
  `new-password`) so password managers behave.
- The `:focus-visible` orange ring (from `index.css` base layer) applies to all
  controls automatically — don't suppress it.
- Run the `accessibility` skill against the finished page before marking it
  done, same bar as the rest of the app.

## Implementation pointers (non-binding)

- **New**: `src/pages/Profile.jsx`; a `content.profile` block + `pageTitles
  .profile` in `src/constant.js`; the `avatar_path` column, `users_update_self`
  RLS policy, and `avatars` bucket + storage policies in Supabase.
- **Changed**:
  - `src/App.jsx` — add the `/profile` route under `RequireAuth`.
  - `src/components/AppShell.jsx` — make the identity block a `<Link
    to="/profile">` with `aria-current`, swap `<User>` for `<Avatar name
    src>`.
  - `src/context/AuthContext.jsx` — extend `toPublicUser` (`joinedAt`,
    `avatarUrl`); add `updateName`, `changePassword`, `updatePhoto`,
    `removePhoto` to the context value.
  - `src/data/storage.js` — add `updateCurrentUserName` and
    `updateCurrentUserAvatar`.
  - `src/components/ui.jsx` — extend `Avatar` with optional `src` + `size`
    (backward-compatible; existing calls unchanged).
- **Reused as-is**: `RequireAuth`, `AppShell`, `useDocumentTitle`,
  `Field`/`TextInput`/`FormError`/`Button`/`TextButton` from `ui.jsx`,
  `formatDate` from `utils/money.js`, `react-toastify`, and the `USER_UPDATED`
  reactivity path already wired in `AuthContext`.
