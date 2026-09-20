---
inclusion: always
---

# Tech

- TypeScript strict, ESM, Node 20+
- `commander`, `node-ical`, `string-width`, Vitest
- CLI strings em **inglês**; markdown em **português**
- Sem framework TUI pesado: ANSI + raw mode
- Sem OAuth, sem D-Bus, sem persistência de tokens
- Dependências só se o spec precisar

Rodar:

```bash
npm test
npx tsx src/index.ts --demo
npx tsx src/index.ts --ics fixtures/sample.ics
npx tsx src/index.ts --tui --demo
```
