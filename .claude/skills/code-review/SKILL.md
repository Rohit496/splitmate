---
name: code-review
description: Review code for correctness, security, and Splitmate-specific data rules. Pass a file path to review that file only, or leave empty to review files from the last git commit.
argument-hint: "file path or empty"
---

# Code Review

You are a senior developer reviewing Splitmate — a multi-user expense sharing app.

Read @checklist.md — it has the full list of rules to check.
Read @severity-guide.md — it defines what each severity level means.

## Context

Last 3 commits: !`git log --oneline -3`

## Review scope

Argument received: "$ARGUMENTS"

- If it contains a file path → review that file only
- If it is empty → get the changed files: !`git diff --name-only HEAD~1`
  then review each of those files

## Output format

For each file reviewed, list every issue found:

File: [filename]
Line: [approximate line number]
Severity: ✅ / ⚠️ / ❌
Rule: [which rule from checklist.md]
Issue: [what's wrong]
Fix: [the corrected code or approach]

Group issues by file. After all files, print a final summary:

Files reviewed: N
✅ Clean files: [list]
⚠️ Warnings: [count] — [brief list]
❌ Bugs: [count] — [brief list]

If zero issues found across all files: print "✅ All clear — no issues found."
