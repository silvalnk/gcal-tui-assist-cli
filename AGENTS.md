# AGENTS.md

Briefing **independente de sessão** para Cursor, Kiro e qualquer agente. O histórico do chat é opcional; estes arquivos não.

## Sempre

1. Ler [`.specify/CONTEXT.md`](.specify/CONTEXT.md) (estado atual).
2. Ler [`.kiro/specs/calendar-cli/requirements.md`](.kiro/specs/calendar-cli/requirements.md) (fonte da verdade).
3. Ler [`.kiro/specs/calendar-cli/design.md`](.kiro/specs/calendar-cli/design.md) e [tasks.md](.kiro/specs/calendar-cli/tasks.md) antes de mudar *como* as coisas são construídas.
4. Ler steering em [`.kiro/steering/`](.kiro/steering/).
5. Se código e spec discordarem, **mude o código** ou proponha atualizar a spec primeiro. Nunca viole a spec em silêncio.
6. Seguir [`.cursor/skills/follow-spec/SKILL.md`](.cursor/skills/follow-spec/SKILL.md) em qualquer mudança de código.
7. **No mesmo turno da mudança de código:** atualizar `.specify/CONTEXT.md` e qualquer spec / README / steering que ficaria mentindo.
8. Quando o usuário pedir **commit**, seguir [`.specify/COMMITS.md`](.specify/COMMITS.md) (`✨ feat:` / `📝 docs:` / …, **mensagens em inglês**).

## Idioma

- Markdown (incluindo este arquivo): **português**
- Código, CLI, erros, identificadores, commits: **inglês**

## Produto

**GCal TUI** (`gcal-tui`) é uma agenda somente leitura no terminal. TypeScript, ICS-first (WSL / sem GNOME). Busca uma vez, imprime ou abre TUI, sai. Repo: `silvalnk/gcal-tui-assist-cli`. **GOA e OAuth estão fora da v1.**

## Comandos

```bash
npm test
npx tsx src/index.ts --demo
npx tsx src/index.ts --ics fixtures/sample.ics
npx tsx src/index.ts --ics fixtures/sample.ics --details --theme nerv
npx tsx src/index.ts --tui --demo
npx tsx src/index.ts --help
```

## Não adicionar na v1

GNOME Online Accounts, OAuth Google Calendar API, criar/editar eventos, daemon/polling, UI web, persistência de tokens.

## Segredos

URLs `--ics` podem ser endereços secretos do Google. Nunca logar a URL completa. Usar o rótulo `ICS #n`.
