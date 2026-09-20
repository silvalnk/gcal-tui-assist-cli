# Context (snapshot)

Atualize este arquivo no mesmo turno em que o comportamento mudar.

## Estado

v1 implementada e verificada. Agenda CLI TypeScript ICS-first, SDD Kiro.

GitHub: [silvalnk/gcal-tui-assist-cli](https://github.com/silvalnk/gcal-tui-assist-cli) · pasta local: `gcal_tui_cli/`

`npm test`: 27 testes. `npx tsc --noEmit` limpo. `--demo` e `--ics fixtures/sample.ics` imprimem a agenda.

Eventos cujo fim já passou são omitidos (ex.: Standup 09:00 some depois das 09:30).

## Como rodar

```bash
npm test
npx tsx src/index.ts --demo
npx tsx src/index.ts --ics fixtures/sample.ics
npx tsx src/index.ts --tui --demo
```

## Contrato vivo

Fonte da verdade: `.kiro/specs/calendar-cli/requirements.md`.

- Stdout colorido por padrão; `--tui` para vista `more`
- Sources: `--ics` (URL ou arquivo), `--demo`, ou `~/.config/gcal-tui/config.json`
- Temas: `default`, `evangelion`, `nerv`
- Sem GOA / OAuth na v1
- URLs ICS nunca aparecem em erros (rótulo `ICS #n`)
- RDATE extra é mesclado depois do `expandRecurringEvent` do node-ical

## Última mudança

README com print da CLI (`docs/images/cli.png`) e descrição alinhada ao GitHub: ICS-first, one-shot, stdout + TUI, sem OAuth.
