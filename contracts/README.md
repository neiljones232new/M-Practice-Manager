# Entity Contract Schemas

This folder contains separate schema contracts for the core API/UI entities:

- `schemas/clients.schema.json`
- `schemas/services.schema.json`
- `schemas/tasks.schema.json`

Each schema defines:

- Prisma model source
- API interface source
- Web interface source
- Controller base route + required endpoints
- Explicit derived fields allowed outside direct DB/API mapping

Run contract validation:

```bash
pnpm contracts:check
```

The check fails when route coverage or field alignment drifts between DB, API, and web layers.
