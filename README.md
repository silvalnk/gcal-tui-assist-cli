# GCal TUI

> Agenda **somente leitura** para o terminal, em TypeScript.  
> Inspirada em [google-calendar-tui](https://github.com/akitaonrails/google-calendar-tui), mas **ICS-first** (WSL / sem GNOME).  
> Busca uma vez, imprime, sai. Sem OAuth de app, sem daemon.

## SDD (comece por aqui)

Este repo segue [Spec Driven Development no estilo Kiro](https://kiro.dev/docs/specs/): requirements → design → tasks, mais steering e `AGENTS.md`.

| Arquivo | Papel |
|---------|--------|
| [`.kiro/specs/calendar-cli/requirements.md`](.kiro/specs/calendar-cli/requirements.md) | **O quê** (EARS / user stories) |
| [`.kiro/specs/calendar-cli/design.md`](.kiro/specs/calendar-cli/design.md) | **Como** |
| [`.kiro/specs/calendar-cli/tasks.md`](.kiro/specs/calendar-cli/tasks.md) | Tasks rastreáveis |
| [`.kiro/steering/`](.kiro/steering/) | Produto, stack, estrutura, segurança |
| [`AGENTS.md`](AGENTS.md) | Briefing fixo para o agente |
| [`.specify/CONTEXT.md`](.specify/CONTEXT.md) | Snapshot da sessão |
| Este README | Como rodar |

Se código e spec divergirem, a **spec manda**.

## Como rodar

Node 20+.

```bash
cd gcal_tui_cli   # clone: gcal-tui-assist-cli
npm install
npm test
npx tsx src/index.ts --demo
npx tsx src/index.ts --ics fixtures/sample.ics
npx tsx src/index.ts --ics fixtures/sample.ics --details --theme nerv
npx tsx src/index.ts --tui --demo
```

Saída stdout (exemplo):

```
Today
  09:00    Standup

Tomorrow
  14:00    Dentist
```

## Google Calendar no WSL

1. No Google Calendar: **Settings → Integrate calendar → Secret address in iCal format**.
2. Guarde a URL num config (não no histórico do shell):

`~/.config/gcal-tui/config.json`

```json
{
  "ics": ["https://calendar.google.com/calendar/ical/SEGREDO/basic.ics"],
  "theme": "default",
  "fetchDays": 60
}
```

3. `npx tsx src/index.ts`

Essa URL é acesso de leitura: se vazar, resete o endereço secreto nas configurações do Google.

`--ics` na linha de comando também funciona, mas pode ir para o histórico do shell.

## Flags

| Flag | Descrição |
|------|-----------|
| `--ics <source>` | URL ou arquivo `.ics` (repetível) |
| `--demo` | Agenda de exemplo em torno de hoje |
| `--details` | Duração, Meet, origem, calendário, local |
| `--tui` | Vista interativa (`m` more, `0` top, `q` quit) |
| `--theme` | `default`, `evangelion`, `nerv` |
| `--no-color` | Sem ANSI no stdout (`NO_COLOR` também) |
| `--fetch-days` | Janela futura (padrão 60) |
| `--config` | Path do JSON |

## TUI

- `q` / Esc: sair
- `m` / Space / Down: more
- `0` / Home: voltar ao topo

## Fora da v1

GNOME Online Accounts, OAuth da Google Calendar API, criar/editar eventos, polling.
