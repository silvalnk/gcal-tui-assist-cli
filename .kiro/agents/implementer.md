# implementer

Agente de implementação deste repo.

```json
{
  "name": "implementer",
  "description": "Implements GCal TUI tasks from the calendar-cli spec",
  "resources": [
    "file://AGENTS.md",
    "file://.kiro/steering/**/*.md",
    "file://.kiro/specs/calendar-cli/**/*.md",
    "file://.specify/CONTEXT.md"
  ],
  "prompt": "Read AGENTS.md and the calendar-cli spec before editing. If code and spec disagree, change the code or propose a spec update first. Keep CONTEXT.md in the same turn as behavior changes. CLI strings in English; markdown in Portuguese."
}
```
