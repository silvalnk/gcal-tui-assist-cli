---
inclusion: always
---

# Structure

```
gcal-tui-assist-cli/
  AGENTS.md
  README.md
  .kiro/steering/          # contexto persistente (Kiro)
  .kiro/specs/calendar-cli/  # requirements, design, tasks
  .specify/CONTEXT.md      # snapshot da sessão
  .specify/COMMITS.md
  src/                     # TypeScript; testes colados (*.test.ts)
  fixtures/sample.ics
```

Módulos em `src/`:

| File | Role |
|------|------|
| `index.ts` | entry |
| `cli.ts` | flags + orquestração |
| `config.ts` | XDG config |
| `ics.ts` | fetch/parse |
| `calendar.ts` | domínio |
| `sanitize.ts` | texto seguro p/ terminal |
| `theme.ts` | paletas |
| `display.ts` | stdout |
| `ui.ts` | TUI `more` |
| `demo.ts` | agenda fake |

Se código e spec divergirem, a spec em `.kiro/specs/calendar-cli/` manda.
