# Implementation Plan: GCal TUI

## Overview

Implementar a agenda CLI TypeScript ICS-first seguindo requirements.md e design.md. Ordem: domínio testável → parser ICS → stdout → TUI → CLI/config → docs.

## Tasks

- [x] 1. Scaffold
  - [x] 1.1 `package.json`, `tsconfig.json`, `vitest.config.ts`, `.gitignore`, `LICENSE`
  - [x] 1.2 Bin `gcal-tui`, scripts `dev` / `build` / `test`
  - _Requirements: 9.1, 10.2_

- [x] 2. Domain
  - [x] 2.1 `sanitize.ts` + testes ANSI/OSC/bidi
  - [x] 2.2 `calendar.ts` modelo, category, dedupe, sort
  - [x] 2.3 `theme.ts` paletas RGB
  - _Requirements: 5.1–5.7, 7.4_

- [x] 3. ICS
  - [x] 3.1 `ics.ts` parse string, all-day, cancelled, RRULE/EXDATE/RDATE
  - [x] 3.2 Fetch HTTP/file com teto e erros redigidos
  - [x] 3.3 `demo.ts`
  - [x] 3.4 `fixtures/sample.ics`
  - _Requirements: 2.1–2.8, 4.1–4.9_

- [x] 4. Stdout
  - [x] 4.1 `display.ts` labels, cores, `--details`, `NO_COLOR`
  - _Requirements: 6.1–6.6, 7.1–7.3_

- [x] 5. TUI
  - [x] 5.1 `ui.ts` `buildBodyPlan`, more/top, truncate width
  - [x] 5.2 Loop raw mode + alternate screen
  - _Requirements: 8.1–8.7_

- [x] 6. CLI + config
  - [x] 6.1 `cli.ts` commander + resolve sources/theme
  - [x] 6.2 `config.ts` XDG + `--config`
  - [x] 6.3 `index.ts` entry
  - _Requirements: 1.1–1.5, 3.1–3.5_

- [x] 7. Docs SDD
  - [x] 7.1 `AGENTS.md`, steering, README, CONTEXT, COMMITS, Cursor skills
  - _Requirements: 9.1–9.5, 10.3_

- [x] 8. Checkpoint
  - `npm test` verde (27 testes) e `npx tsx src/index.ts --demo` mostra agenda.
