# schema-aware-db

Stop guessing database schemas. When Claude writes backend data code, the recurring failure isn't SQL syntax — it's acting on a **guessed** schema and a **local** view of the code: invented columns, broken joins, leaked connections, and a query updated in one file while three others go stale.

## What this does

Enforces a four-phase discipline for any task that touches a database — SQL (PostgreSQL, MySQL, SQLite, …) or NoSQL (MongoDB, DynamoDB, Redis, …):

1. **Discover the real schema** — determine the engine, then introspect. Live commands (`\d table`, `information_schema`, `PRAGMA table_info`) when a DB is reachable; migrations + ORM models reconciled otherwise. For NoSQL, sample real documents and read validators/indexes; for DynamoDB the partition/sort keys and GSIs *are* the schema.
2. **Map usage across the codebase** — find every reference (model, raw queries, migrations, serializers, DAO methods, tests) before editing anything.
3. **Write the change to industry standard** — parameterization, transactions, connection lifecycle, join correctness, N+1 avoidance, migration hygiene — matching the codebase's existing patterns.
4. **Trace the ripple and reconcile** — update every affected site from the Phase 2 map; re-search for any renamed field so zero stale references remain.

## When it fires

Any query, ORM model, migration, repository/DAO layer, connection/session, adding or renaming a column/field, joining tables — even when the ask is just "add an endpoint," "fix this query," "save this to the DB," or "add a field."

If a schema fact can't be verified (no DB access, ambiguous migrations, no sample documents), the skill stops and asks rather than guessing.

## References

Loaded on demand: `references/sql.md` (per-engine introspection + standards), `references/nosql.md` (sampling + access-pattern design), `references/standards.md` (query/connection/migration best practice), `references/ripple.md` (the codebase search recipe).

## Companion skills (optional)

- [`lsp`](../lsp/SKILL.md) — precise usage mapping via `references` on the ORM model instead of text grep.
- [`codebase-guardian`](../codebase-guardian/SKILL.md) — the general introspect → change → ripple loop this specializes for the data layer.
- [`memory`](../memory/SKILL.md) — confirmed schema facts and access patterns persist in `MEMORY.md`.

## Full workflow

See [SKILL.md](SKILL.md).
