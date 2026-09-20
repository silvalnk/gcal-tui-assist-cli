# Requirements Document

## Introduction

**GCal TUI** (`gcal-tui`) é uma agenda **somente leitura** para o terminal, em TypeScript. Inspirada em [google-calendar-tui](https://github.com/akitaonrails/google-calendar-tui), busca compromissos **uma vez**, imprime (ou renderiza) e **sai**. Não faz polling em background.

O original usa GNOME Online Accounts (D-Bus) por padrão. Este projeto é **ICS-first**: o ambiente alvo inclui WSL e máquinas sem GNOME. Fontes são URLs iCal privadas, arquivos `.ics` locais, um arquivo de config, ou `--demo`.

## Glossary

- **Agenda_CLI**: o binário `gcal-tui`.
- **ICS_Source**: URL `http(s)`, caminho de arquivo, ou `file://` que aponta para um calendário iCal.
- **CalendarEvent**: compromisso normalizado (título, início, fim, all-day, origem, categoria).
- **Stdout_Mode**: saída colorida em texto, padrão.
- **TUI_Mode**: vista Ratatui-like com `more`, ativada por `--tui`.
- **Secret_ICS**: URL secreta do Google Calendar (bearer read). Tratar como senha.
- **Theme**: paleta `default` | `evangelion` | `nerv`.

## Requirements

### Requirement 1: One-shot read-only agenda

**User Story:** Como usuário de terminal, quero ver os próximos compromissos numa única execução, para não deixar um daemon rodando nem autenticar OAuth.

#### Acceptance Criteria

1. WHEN the user runs `gcal-tui` with at least one reachable ICS_Source, THE Agenda_CLI SHALL fetch events once, print or render them, and exit.
2. THE Agenda_CLI SHALL NOT persist Google tokens, cookies, or ICS bodies to disk.
3. THE Agenda_CLI SHALL NOT create, update, or delete calendar events.
4. WHEN there are no upcoming events in the fetch window, THE Agenda_CLI SHALL print `No upcoming appointments.` and exit 0.
5. WHEN every ICS_Source fails, THE Agenda_CLI SHALL print a redacted error to stderr and exit non-zero.

### Requirement 2: ICS sources (WSL / headless)

**User Story:** Como usuário em WSL ou sem GNOME, quero passar URLs ou arquivos iCal, para ver a agenda sem D-Bus.

#### Acceptance Criteria

1. WHEN `--ics <source>` is passed (repeatable), THE Agenda_CLI SHALL treat each value as an ICS_Source.
2. WHEN a source is an `http` or `https` URL, THE Agenda_CLI SHALL GET it with connect timeout 10s, request timeout 30s, and a 10 MiB body cap.
3. WHEN a source is a filesystem path or `file://` URL, THE Agenda_CLI SHALL read that file.
4. WHEN `--demo` is passed, THE Agenda_CLI SHALL include built-in sample events around the current local date.
5. WHEN no `--ics` is passed, THE Agenda_CLI SHALL load sources from the config file if it exists and lists `ics`.
6. WHEN no sources remain after flags and config, THE Agenda_CLI SHALL print how to pass `--ics`, `--demo`, or a config file, then exit non-zero.
7. THE Agenda_CLI SHALL label sources as `ICS #1`, `ICS #2`, … in errors, details, and account fields.
8. THE Agenda_CLI SHALL NEVER print or log the full Secret_ICS URL (including in stack traces and HTTP error messages).

### Requirement 3: Config file without leaking secrets into shell history

**User Story:** Como usuário, quero guardar URLs ICS num arquivo de config, para não deixá-las no histórico do shell.

#### Acceptance Criteria

1. THE Agenda_CLI SHALL read `$XDG_CONFIG_HOME/gcal-tui/config.json`, falling back to `~/.config/gcal-tui/config.json`.
2. WHEN `--config <path>` is passed, THE Agenda_CLI SHALL use that path instead.
3. THE config file SHALL accept `{ "ics": string[], "theme"?: string, "fetchDays"?: number, "details"?: boolean }`.
4. WHEN the config file is missing, THE Agenda_CLI SHALL continue with CLI flags only.
5. WHEN the config file is invalid JSON, THE Agenda_CLI SHALL fail with a message that does not dump `ics` values.

### Requirement 4: Fetch window, parse, and normalize

**User Story:** Como usuário, quero os próximos N dias (60 por padrão), incluindo all-day e recorrências limitadas.

#### Acceptance Criteria

1. THE Agenda_CLI SHALL default `--fetch-days` to 60 and clamp values below 1 to 1.
2. THE Agenda_CLI SHALL parse timed events, all-day events, and bounded `RRULE` / `RDATE` / `EXDATE` expansion.
3. WHEN an event has `STATUS:CANCELLED`, THE Agenda_CLI SHALL skip it.
4. WHEN a title is empty after sanitization, THE Agenda_CLI SHALL use `(untitled)`.
5. WHEN a datetime is floating (no TZ), THE Agenda_CLI SHALL interpret it in the local timezone.
6. WHEN all-day `DTEND` is missing, THE Agenda_CLI SHALL treat the event as one exclusive day (`end = start + 1 day`).
7. THE Agenda_CLI SHALL drop events whose effective end is before fetch time.
8. THE Agenda_CLI SHALL cap each source at 10_000 events and each recurrence at 10_000 occurrences.
9. WHEN an unbounded high-frequency rule (`SECONDLY` / `MINUTELY` / `HOURLY` without `COUNT`/`UNTIL` in the past window) started more than 366 days ago, THE Agenda_CLI SHALL skip that event rather than hang.

### Requirement 5: Dedup, sanitize, and categories

**User Story:** Como usuário com vários calendários, quero uma lista limpa, sem duplicatas nem sequências de controle no terminal.

#### Acceptance Criteria

1. THE Agenda_CLI SHALL strip ANSI, OSC, other C0/C1 controls, and bidi marks from titles, locations, calendar names, and error snippets before printing.
2. THE Agenda_CLI SHALL collapse internal whitespace in sanitized text.
3. THE Agenda_CLI SHALL dedupe by `ical UID + start + end` when UID exists, otherwise by normalized title + start + end.
4. WHEN duplicates exist, THE Agenda_CLI SHALL keep the higher-ranked event (confirmed > has video or location > non-empty title).
5. THE Agenda_CLI SHALL classify events in this order: holiday, birthday, out-of-office, focus, travel, meeting (video link), all-day, other.
6. Holiday detection SHALL use calendar id/name terms (`holiday`, `feriado`, `festivo`, …) plus common all-day title terms including `holiday`, `feriado`, `natal`.
7. WHEN DESCRIPTION, LOCATION, or URL contains `meet.google.com`, `zoom.us`, or `teams.microsoft.com`, THE event SHALL be marked as having a video link.

### Requirement 6: Colored stdout agenda

**User Story:** Como usuário de shell, quero um stdout agrupado por dia, com cores por categoria, para um `gcal-tui` rápido.

#### Acceptance Criteria

1. WHEN `--tui` is absent, THE Agenda_CLI SHALL print day headers (`Today`, `Tomorrow`, or `Thu Sep 17`) then rows `  HH:MM    Title` (time column width 7).
2. All-day events SHALL print `all-day`; multi-day all-day events SHALL print `multi`.
3. WHEN `--details` is set, THE row SHALL append duration, `Meet` when a video link exists, `ICS #n · calendar name`, and location when present.
4. Appointment rows SHALL use category colors from the selected Theme.
5. `--no-color` and a set `NO_COLOR` environment variable SHALL disable ANSI in stdout mode.
6. TUI colors SHALL still follow Theme even when stdout colors are disabled.

### Requirement 7: Themes

**User Story:** Como usuário, quero as paletas `default`, `evangelion` e `nerv`, para combinar com o original e com `clock-tui`.

#### Acceptance Criteria

1. `--theme` SHALL accept `default`, `evangelion`, `nerv` and reject unknown names.
2. WHEN `--theme` is omitted, THE Agenda_CLI SHALL use `TCLOCK_WIDGET_THEME` if it is one of those names, else config `theme`, else `default`.
3. Explicit `--theme` SHALL win over the environment variable and config.
4. Palettes SHALL match the RGB values of [google-calendar-tui](https://github.com/akitaonrails/google-calendar-tui) for the same theme names.

### Requirement 8: Interactive TUI with `more`

**User Story:** Como usuário, quero uma vista que cabe no terminal e revela o resto com `m`, para agendas longas.

#### Acceptance Criteria

1. WHEN `--tui` is set, THE Agenda_CLI SHALL enter an alternate screen and render only what fits.
2. `q` or Esc SHALL quit.
3. `m`, Space, or Down SHALL reveal the next hidden chunk when hidden appointments remain (same day → same week → later).
4. `0` or Home SHALL return to the first page.
5. Titles SHALL stay mostly neutral; a colored marker `▏ ` SHALL show category when width ≥ 20.
6. WHEN stdout is not a TTY, `--tui` SHALL fail with `TUI requires a terminal.`
7. Truncation SHALL use display width (Unicode), not byte length.

### Requirement 9: Spec-driven project (Kiro SDD)

**User Story:** Como desenvolvedor (e como agente), quero requirements, design, tasks, steering e AGENTS.md versionados, para implementar sem reinventar o contrato.

#### Acceptance Criteria

1. THE repository SHALL contain `.kiro/specs/calendar-cli/{requirements,design,tasks}.md`.
2. THE repository SHALL contain `.kiro/steering/{product,tech,structure,security}.md`.
3. THE repository SHALL contain root `AGENTS.md` that points agents at the spec before code.
4. WHEN code and spec disagree, THE implementation SHALL change or a spec update SHALL be proposed first — silent drift is a defect.
5. Markdown for humans SHALL be Portuguese; CLI strings, identifiers, and git messages SHALL be English.

### Requirement 10: Quality bar

**User Story:** Como mantenedor, quero testes unitários no parser, cores, dedupe, sanitização e o plano do TUI `more`.

#### Acceptance Criteria

1. `npm test` SHALL cover sanitization of ANSI/OSC/bidi, stdout labels, theme RGB, ICS timed/all-day/cancelled/RRULE, URL redaction, and TUI `more` advancing to later days.
2. THE project SHALL typecheck under TypeScript `strict`.
3. THE README SHALL document WSL ICS setup (Google Calendar secret iCal address), flags, themes, and the SDD layout.
