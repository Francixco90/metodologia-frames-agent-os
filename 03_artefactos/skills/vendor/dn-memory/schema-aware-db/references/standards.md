# Industry-standard data-access rules

Apply these when writing the change (Phase 3) and when designing tables/collections.

## Query correctness (SQL)

- **Parameterize everything.** Never build SQL by string concatenation/f-strings with user input — use bound parameters (`%s`, `?`, `:name`) or the ORM. This prevents SQL injection and quoting bugs.
- **Joins**: join on an actual key relationship confirmed in Phase 1. Know the cardinality — a one-to-many join multiplies rows, so aggregate (`GROUP BY`, or fetch separately) instead of assuming one row back. Prefer explicit `INNER`/`LEFT JOIN ... ON` over implicit comma joins.
- **Select only needed columns** — avoid `SELECT *` in application code; it breaks when columns change and pulls unneeded data.
- **Filter soft-deletes / status** columns that the schema uses (`deleted_at IS NULL`, `is_active = true`).
- **Avoid N+1**: loading a list then querying per-item in a loop. Use a join, `IN (...)`, or the ORM's eager-load (`select_related`/`prefetch_related`, `joinedload`, `.populate()`).

## Connections, sessions, transactions

- **Lifecycle**: acquire from the pool, use, release. Use context managers / `try/finally` / framework-scoped sessions so a connection is never leaked on an exception. Don't open a new client per request in code that runs hot.
- **One session per unit of work.** Never share a session/connection across threads or async tasks.
- **Transactions**: wrap multi-statement writes that must succeed or fail together in one transaction; commit once, roll back on error. Don't leave a transaction open across an external/network call.
- **Pooling**: rely on the framework's pool (Django, SQLAlchemy, pg driver). Don't hand-roll one unless the project already does.

## Migrations

- Any schema change goes through a migration file, never a manual live-DB `ALTER`. Make it reversible. For big tables, prefer additive, backward-compatible steps (add nullable column → backfill → enforce) over a single locking change.

## Schema design to standard (SQL)

- Normalize to ~3NF by default: no repeating groups, every non-key column depends on the whole key. Denormalize only deliberately for a measured read pattern.
- Every table has a primary key. Use surrogate keys (auto-increment / UUID) unless a natural key is genuinely stable.
- Foreign keys with explicit `ON DELETE` behavior express real relationships — declare them.
- Index the columns you filter/join/sort on; add unique constraints for real-world uniqueness (email, slug). Don't over-index write-heavy tables.
- Choose correct types: money as `NUMERIC`/`DECIMAL` not float; timestamps as `timestamptz`; constrain enums via check constraints or an enum type. Prefer `NOT NULL` with sensible defaults.
- Consistent naming (pick snake_case or camelCase and hold to it), singular vs plural table names — match the existing codebase convention.

## NoSQL specifics

See `nosql.md` — design around access patterns, embed vs reference intentionally, create the needed indexes/GSIs, and enforce shape with a validator (Mongo `$jsonSchema`) or application-layer schema (Pydantic, Zod, mongoose) since the engine won't.

## Cross-cutting

- Match existing codebase patterns — if there's a repository/DAO layer, add to it rather than scattering raw queries through controllers.
- Handle DB errors explicitly (unique-violation, deadlock retry, not-found) rather than letting a raw driver exception surface to the user.
- Never log full connection strings or query results containing secrets/PII.
