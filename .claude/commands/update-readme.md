---
name: update-readme
description: Create README.md if it doesn't exist, or update it if it does. Reads CLAUDE.md and git log for context.
---

# README

First, check if CLAUDE.md exists. If it does, read it — it contains the project
conventions, data models, and current status. If it doesn't exist, infer what you
can from the src/ folder structure and package.json.

---

## If README.md does not exist

Create it from scratch. Explore the project and write a complete README
with the following sections in this order:

### Project title and description

One clear sentence explaining what Splitmate does and who it's for.

### Features

A bullet list of what the app actually does — from the user's perspective.
Not technical implementation. Things like:

- Create groups and add members by email (they can join before registering)
- Log shared expenses with equal or custom splits
- See who owes whom with auto-calculated settlements
- Soft-delete expenses without losing balance history
- Download monthly expense reports as CSV
- Group budget tracking with progress bar

### Tech stack

List the main technologies: React, Vite, Tailwind CSS, React Router, localStorage (Phase 1), Supabase (Phase 2).

### Getting started

Step-by-step from zero:

1. Clone the repo
2. Install dependencies (npm install)
3. Run the dev server (npm run dev)
4. Open http://localhost:5173

### Test accounts

List all pre-seeded accounts with credentials:

- shubham@test.com / password
- bob@test.com / password
- rahul@test.com / password
- eva@test.com / password

Explain that these are created automatically on first load.

### Project structure

A brief map of the src/ folders:

- components/ — reusable UI pieces
- context/ — AuthContext (useAuth hook)
- pages/ — one file per route
- hooks/ — useGroups, useExpenses, useGroupBalances
- utils/ — balance.js, formatters.js, csvExport.js
- data/ — storage.js (all localStorage access)

### Available routes

A table with columns: Route | Page | Auth required
Include every route in the app.

### Data storage

Explain Phase 1 (localStorage, keys: sm_users, sm_groups, sm_expenses)
and mention Phase 2 (Supabase migration — see MCP section).

### Important notes

- Why expenses are soft-deleted (isDeleted: true) instead of removed
- Why paidBy uses member record IDs not userIds
- The pending member flow (add by email before they register)

Use plain markdown. No emoji. Write clearly for a developer picking up the
project for the first time.

---

## If README.md already exists

1. Read the current README carefully
2. If CLAUDE.md exists, read it for the latest project status
3. Run `git log --oneline -10` to see what changed recently
4. Compare what the README says against what's actually in the project
5. Update ONLY sections that are outdated or missing
6. Do not change the tone, formatting style, or section order
7. Do not remove sections — only update or add

After finishing, print exactly:
Updated: [sections changed]
Added: [new sections]
Unchanged: [sections left as-is]
