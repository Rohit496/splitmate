---
name: update-claude
description: Update CLAUDE.md with what was built or decided in this session. Patches only — does not rewrite the file.
---

# Update CLAUDE.md

Update CLAUDE.md with what changed in this session. Patch only — do not rewrite the whole file.

## Process

1. Read the current CLAUDE.md in full so you understand what's already there
2. Look through this conversation — what was built, changed, decided, or discovered?
3. For each piece of new information, find the right section in CLAUDE.md and update it in-place
4. If something new has no matching section, add it in the right place in the file
5. Never duplicate information already in the file
6. Never remove a section unless it's completely wrong or no longer relevant

## What to look for and where to put it

**Status checklist**

- Mark any features as done [x] that were completed this session
- Add any new planned items as [ ] if they came up in conversation
- Remove items that were planned but then cancelled or changed

**Data models**

- Update if any field was added, renamed, removed, or its type changed
- Update if a new data model was introduced (e.g. a new localStorage key)
- Fix any field descriptions that are now inaccurate

**Storage API / functions**

- Add any new functions that were created in storage.js
- Update signatures if a function's parameters or return value changed
- Remove functions that were deleted or renamed

**Routes**

- Add any new pages and their routes
- Update route descriptions if the page purpose changed
- Mark any routes that were removed

**Key rules and conventions**

- Add any new "always do X" or "never do Y" rules that were established
- Add project-specific patterns that Claude should follow when generating code
- Add warnings about gotchas discovered during this session

**Anti-patterns**

- Add anything that was tried and caused a bug or bad outcome
- Useful phrasing: "Never do X — it causes Y"

**Known issues**

- Add new bugs discovered this session with a brief description
- Remove issues that were fixed this session
- Add workarounds if a bug is known but not yet fixed

**Tech stack or dependencies**

- Update if a new package was installed (add it with its purpose)
- Update if a package was removed or replaced

**Environment and config**

- Add any new environment variables that were created
- Update if config files (vite.config.js, tailwind.config.js) were changed in a meaningful way

**Folder structure**

- Add any new folders or files that are now part of the project structure
- Update descriptions if existing folders changed purpose

## What NOT to do

- Don't rewrite sections that are still accurate
- Don't add vague summaries ("improved the codebase")
- Don't add things you're uncertain about
- Don't change the file's section order or heading names
- Don't add information that's already there in slightly different wording

## Output

After updating, print exactly:
Added: [bullet list — what new information was added]
Updated: [bullet list — what existing information was changed]
Checked off: [bullet list — tasks marked as complete]
Removed: [bullet list — anything removed or cleaned up]
