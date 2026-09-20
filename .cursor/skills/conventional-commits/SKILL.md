---
name: conventional-commits
description: Create git commits for gcal-tui using conventional commits plus emoji, in English. Use when the user asks to commit.
---

# Conventional commits + emoji

Before committing, read [`.specify/COMMITS.md`](../../.specify/COMMITS.md) and follow it exactly.

```
<emoji> <type>: <subject>
```

English. Imperative subject. Optional body = **why**.

| Type | Emoji |
|------|-------|
| feat | ✨ |
| fix | 🐛 |
| docs | 📝 |
| chore (gitignore) | 🙈 |
| chore (lockfile) | 🔒 |
| chore (Cursor skills) | 🤖 |
| chore (package.json) | 📦 |
| refactor | ♻️ |
| test | ✅ |

Default: **one commit** for the related change (include matching markdown).

- Do not commit `node_modules/`, `dist/`, `.env`, secret ICS URLs
- Do not skip hooks
- Do not push unless asked
- HEREDOC for the message
