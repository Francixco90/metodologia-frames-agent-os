---
name: context-schema-aware-db
description: This skill should be used when the user wants to interact with a database in a schema-aware way, grounding queries and mutations in the live schema rather than assuming column or table names.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# Context Schema-Aware Database Work

## When to use

Activate this skill whenever a task involves reading from or writing to a database — SQL
(PostgreSQL, MySQL, SQLite) or NoSQL (MongoDB, DynamoDB, Redis) — including queries, ORM
models, migrations, repository layers, connection handling, column or field renames, joins,
or any change that touches a query. Even prompts like "add an endpoint", "save this to the
DB", or "add a field" count. The point is to stop guessing schemas and start from the real
structure before writing a single line of data code.

## What schema-awareness means

Schema-awareness is the discipline of introspecting the live database structure before
querying or mutating it. Acting on a guessed schema produces invented columns, broken
joins, mishandled connections, and stale ripple across the codebase. The fix is always the
same: look before you write, and trace after you write. Do not skip the introspection phase
even when the change feels trivial — "just add one field" is exactly the change that goes
stale in five other files.

## How to read the schema

Establish ground truth for every table or collection the task touches. Determine the engine
first (check config files, connection strings, ORM config), then introspect.

- SQL: get the actual column names, types, nullability, primary keys, foreign keys,
  indexes, and unique constraints. Prefer live introspection (`\d table`, `information_schema`,
  `PRAGMA table_info`) when the database is reachable; otherwise reconcile migrations and ORM
  models. Never trust a single model file if migrations may have altered it.
- NoSQL: schemas are implicit, so sample real documents to learn the actual field shape, and
  read validators, indexes, and access patterns. For DynamoDB, the partition key, sort key,
  and GSIs are the schema — know them before writing any access code.

Write down the exact field names and key relationships you will use. If you cannot confirm a
name, say so and find it — never fill it in from memory.

## How to ground queries

Once the schema is confirmed, map usage across the codebase before editing: find every place
the table or collection is referenced (grep for the name, the ORM model, raw query strings,
migrations, serializers, and repository methods). Then write the change using the confirmed
field names, following the patterns already established in the codebase. After writing, go
back to the map and update every affected site so zero stale references remain.

## Fail-closed on schema mismatch

If at any point a schema fact cannot be verified — no database access, ambiguous migrations,
no sample documents — do not proceed on an assumption. State what you need (a connection
string, a sample document, a read-only query) and stop there. An unverified schema fact is a
coverage gap, not a license to guess.

Derivada de schema-aware-db (DN-OpenSource/claude-skills, Apache-2.0).
