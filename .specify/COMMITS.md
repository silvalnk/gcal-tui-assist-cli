# Conventional commits + emoji

Fonte da verdade para **mensagens de git** neste repo.  
Skill: `.cursor/skills/conventional-commits/SKILL.md`.

## Format

```
<emoji> <type>: <subject>

[optional body — why, not a file dump]
```

- Language: **English**
- Subject: imperative, no trailing period, ~72 chars

## Types and emoji

| Type | Emoji | Use when |
|------|-------|----------|
| `feat` | ✨ | New CLI behavior |
| `fix` | 🐛 | Bug fix |
| `docs` | 📝 | spec, CONTEXT, README, steering |
| `chore` | 🙈 | gitignore, tooling |
| `chore` | 🔒 | lockfile |
| `chore` | 🤖 | `.cursor/skills/` |
| `chore` | 📦 | package.json / tsconfig only |
| `refactor` | ♻️ | Same behavior, clearer code |
| `test` | ✅ | Tests only |

## Never

- Commit `node_modules/`, `dist/`, `.env`, real `config.json`, secret ICS URLs
- `--no-verify` unless the user asks
- Push unless the user asks
