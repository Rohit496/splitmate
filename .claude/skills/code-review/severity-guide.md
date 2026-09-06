# Severity Guide

## ❌ Bug — must fix before shipping

The code is wrong. It will cause incorrect behaviour, data corruption,
or a security issue in production. Examples:

- Expense balance showing wrong amount
- A user can see another user's groups
- Password logged to console
- isDeleted not filtered → deleted expenses included in balance

## ⚠️ Warning — should fix soon

The code works today but is fragile or inconsistent. Will likely cause
a bug when the codebase grows or requirements change. Examples:

- Array index as key (breaks on reorder)
- Missing error handling (silent failure)
- Inline style instead of Tailwind (hard to maintain)
- useEffect with missing dependency (stale closure risk)

## ✅ Clean — nothing to flag

No issues in this file. Mention what's done well if there's something
worth calling out (good defensive check, clean pattern, etc.)
