# SQL schema discovery

Goal: get the **actual** column names, types, keys, and constraints — not what you assume they are.

## Step 1: Identify the engine and connection

Look, in this order, for: `DATABASE_URL` / `.env`, Django `settings.py` `DATABASES`, SQLAlchemy engine URL, `docker-compose.yml` service, `knexfile.js` / `ormconfig`, Prisma `schema.prisma` `datasource`. This tells you Postgres vs MySQL vs SQLite and whether a live DB is reachable.

## Step 2: Introspect live if you can (most reliable)

Only run **read-only** introspection. Never mutate a DB during discovery.

**PostgreSQL** (`psql`):
```
\d+ table_name          -- columns, types, nullability, defaults, indexes
\d                      -- list all tables
```
Or via SQL (works over any driver):
```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns WHERE table_name = 'table_name';

SELECT tc.constraint_type, kcu.column_name, ccu.table_name AS ref_table, ccu.column_name AS ref_col
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
WHERE tc.table_name = 'table_name';   -- PKs and FKs

SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'table_name';
```

**MySQL / MariaDB**:
```sql
DESCRIBE table_name;
SHOW CREATE TABLE table_name;         -- full DDL incl. keys, engine, charset
SHOW INDEX FROM table_name;
SELECT * FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_NAME='table_name' AND REFERENCED_TABLE_NAME IS NOT NULL;  -- FKs
```

**SQLite**:
```sql
PRAGMA table_info(table_name);        -- columns, types, notnull, pk
PRAGMA foreign_key_list(table_name);
PRAGMA index_list(table_name);
.schema table_name                    -- in the sqlite3 CLI
```

## Step 3: If no live DB, reconcile migrations + models

Models alone can lie — a later migration may have altered the table. Read the **migration history**, newest last, and let it override the model where they disagree.

- **Django**: read `<app>/migrations/*.py` in order; `AddField`/`RemoveField`/`RenameField`/`AlterField` are the truth. `python manage.py sqlmigrate <app> <num>` prints the real SQL. `python manage.py inspectdb` reflects a live DB into models.
- **SQLAlchemy / Alembic**: read `versions/*.py` op.add_column / op.drop_column / op.create_foreign_key.
- **Prisma**: `schema.prisma` is authoritative *if* `migrate` is in use; check `migrations/` folder matches.
- **TypeORM / Knex**: read entity decorators + the `migrations/` folder.

## Step 4: Record the facts

Note exact column names (watch snake_case vs camelCase), the PK, every FK and what it references, unique constraints, and which columns are indexed. You will reference these verbatim when writing queries — no paraphrasing from memory.

## Common traps

- Column is `username` not `user_name`; `created_at` not `createdAt` (or vice-versa) — copy the real casing.
- A "relationship" you assume exists may have no FK — verify before joining.
- Soft-delete columns (`deleted_at`, `is_active`) must be filtered or you return dead rows.
- Enum/check constraints restrict values — an insert that ignores them fails at runtime, not compile time.
