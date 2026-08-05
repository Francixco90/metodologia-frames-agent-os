# Contribution Registry

This directory holds collaborative contribution entries for folios and certificates.

## Structure

Each contribution is a single YAML file under `entries/`:

```
registries/contributions/
├── README.md
├── schemas/
│   └── contribution-entry.ts
└── entries/
    └── MFAO-REG-<uuid>.yml
```

## How to add a contribution

1. Generate a UUIDv4: `node -e "console.log(crypto.randomUUID())"`
2. Create `entries/MFAO-REG-<uuid>.yml` with the contribution data.
3. Run `pnpm verify:contributions` to validate.
4. Commit and push.

## Rules

- Each entry is a **separate file** (reduces merge conflicts).
- `registry_entry_id` is globally unique (UUIDv4) — never reuse.
- `original_folio_id` and `original_certificate_id` are **business data**, not primary keys.
- Two entries MAY share the same `original_folio_id` (duplicates are preserved, not merged).
- `contributor_alias` is a pseudonym — never use real names, GitHub usernames, or emails.
- `content_hash` is SHA-256 of the artifact (integrity check, not identity).

## Validation

```bash
pnpm verify:contributions
```

This validates:

- All entries match the Zod schema.
- All `registry_entry_id` values are unique.
- No `contributor_alias` contains PII patterns.
- No `original_folio_id` was silently overwritten.
