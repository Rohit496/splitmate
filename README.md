# Splitmate

An expense-sharing app for groups of friends. Record who paid for what, and Splitmate
works out the fewest transfers that settle everyone up.

Everything runs in the browser — there is no backend. All data is kept in `localStorage`
and is scoped to whichever browser you open the app in.

## Running locally

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually http://localhost:5173).

```bash
npm run build     # production build into dist/
npm run preview   # serve the production build
```

## Test accounts

Four accounts are created the first time the app runs in a browser. They all use the
password `password`:

| Email | Name |
| --- | --- |
| shubham@test.com | Shubham |
| bob@test.com | Bob |
| rahul@test.com | Rahul |
| eva@test.com | Eva |

The sign-in page lists them as one-click fills. To start over, clear the `splitmate.*`
keys from `localStorage` and reload.

## Project structure

```
src/
├── data/storage.js       # the only module that touches localStorage
├── context/              # AuthContext — the only module that handles credentials
├── hooks/useStore.js     # re-renders components when storage changes
├── utils/                # money (integer cents) and balance calculation
├── components/           # shell, modal, balance bar, shared UI
└── pages/                # landing, login, register, dashboard, group pages
```

Routes: `/` landing, `/login`, `/register`, `/dashboard`, `/group/new`, `/group/:id`.
Adding an expense is a modal inside the group page, not a route.

## How it works

**Storage.** `src/data/storage.js` is the single boundary. Nothing else reads or writes
`localStorage`, so moving to Supabase later means rewriting one file. Records live under
four keys: `splitmate.users`, `splitmate.groups`, `splitmate.expenses`, and
`splitmate.session`.

**Auth.** All credential handling lives in `AuthContext`. Passwords are stored in plain
text — fine for local testing, and the first thing to change when there is a real backend.

**Members.** Groups store members by email, because that is the one identifier that exists
whether or not someone has signed up. A member with no matching account shows as *pending*
and is still counted in every split; they turn active automatically the moment they
register with that email.

**Money.** All arithmetic runs in integer cents, so splitting $10 three ways gives
$3.34 / $3.33 / $3.33 rather than a floating-point remainder.

**Balances.** Every balance is recomputed from the surviving expenses on read — nothing is
cached. Deleting an expense is a soft delete (`isDeleted: true`); the record stays, it just
stops counting. Debts are then collapsed by repeatedly matching the largest debtor against
the largest creditor, which settles a group of *n* people in at most *n − 1* payments: if
Shubham paid for dinner and Bob paid for the cab, you get one transfer, not two.

## Status

Feature-complete against the local-storage brief. Next step is moving persistence to
Supabase behind the existing `storage.js` interface.
