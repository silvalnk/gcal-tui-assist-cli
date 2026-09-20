---
name: follow-spec
description: Treats GCal TUI Kiro specs as source of truth. Use when editing this repo, implementing CLI features, or when the user mentions SDD, spec, gcal-tui, or calendar-cli.
---

# Follow spec (gcal-tui)

## Before any code change

1. Read `.specify/CONTEXT.md`.
2. Read `.kiro/specs/calendar-cli/requirements.md`.
3. Read `.kiro/specs/calendar-cli/design.md` and `tasks.md`.
4. If code and spec disagree, **change the code** or propose a spec update first.
5. After any behavior change, update markdown in the same turn.

Also read root `AGENTS.md` and `.kiro/steering/`.

## Keep markdowns in sync

| File | Update when |
|------|-------------|
| `.kiro/specs/calendar-cli/requirements.md` | Contract changed |
| `.kiro/specs/calendar-cli/design.md` | Architecture / modules changed |
| `.kiro/specs/calendar-cli/tasks.md` | Task status / breakdown |
| `.specify/CONTEXT.md` | **Always** |
| `AGENTS.md` | Commands or agent rules |
| `README.md` | How to run |
| `.kiro/steering/*` | Product / stack / security |

## Scope

- TypeScript CLI, ICS-first, read-only
- Binary name: `gcal-tui`
- No GOA, no OAuth, no writes

## Non-goals

GNOME Online Accounts, Google Calendar API OAuth, web UI, background polling.
