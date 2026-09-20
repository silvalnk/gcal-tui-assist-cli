---
inclusion: always
---

# Security

URLs ICS do Google (`.../basic.ics` secret address) são **bearer read**.

- Nunca commitar `config.json` real, `.env`, ou URLs secretas
- Nunca `console.log` da URL completa
- Erros HTTP: `ICS #n returned HTTP 403`, nunca a URL
- `fixtures/sample.ics` é público e local
- Se uma URL vazar: o usuário reseta o endereço secreto no Google Calendar

Read-only: nenhum POST/PUT/DELETE para APIs de calendário.
