# Mapping usage and tracing the ripple

The second recurring failure is **local editing**: you change a query or field in one file and leave stale references elsewhere. Fix it by mapping usage *before* editing and reconciling *after*.

## Before editing — build the usage map

For each table/collection and field you'll touch, search the whole repo. Use ripgrep (`rg`) for speed.

```bash
rg -n "table_or_collection_name"      # raw name in SQL strings, configs
rg -n "ModelClassName"                # ORM model / mongoose model / entity
rg -n "old_field_name"                # every reference to a field you may rename
rg -n "\.objects\.|session\.query|db\.|find\(|aggregate\(|SELECT|INSERT|UPDATE"  # query sites
rg -n --glob '*migration*' "table_name"
```

Then note where the entity shows up across these layers:
- **Models / entities / schemas** (the definition)
- **Query sites** — every repository/DAO method, raw query, ORM call
- **Serializers / DTOs / GraphQL types / Pydantic models / TS interfaces** that mirror the fields
- **Migrations** (existing history + the new one you may need)
- **Tests and fixtures / seed data**
- **Any cache keys or denormalized copies** of the same data

Write a short list. This is your checklist for Phase 4.

## After editing — reconcile every site

Walk the map and update each one. Then verify nothing stale remains:

```bash
rg -n "old_field_name"    # must return zero (or only the migration that renames it)
```

If you renamed a column/field: the DB migration, the model, every query, every serializer/DTO/type, and the tests must all move together. A rename that lands in the model but not the serializer produces a runtime `KeyError`/`undefined`, which is exactly the class of bug this skill exists to prevent.

If you added a field: default value or nullability in the migration, model, any serializer that should expose it, and tests that construct the object.

If you changed a query's shape (columns returned, join added): every caller that consumes the result, plus type definitions.

## Verify

Prefer to run the project's own checks: the test suite, type checker (`mypy`, `tsc`), and linter. If a live DB is available, run the new query read-only against real data and confirm the columns come back as expected before considering it done.
