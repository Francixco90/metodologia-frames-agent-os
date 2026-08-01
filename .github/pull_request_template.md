## Folios and Certificates Checklist

If this PR creates or modifies folios or certificates, complete the following:

- [ ] This PR creates new folios or certificates
- [ ] Number of folios/certificates created: ___
- [ ] Contribution entries added under `registries/contributions/entries/`
- [ ] Each entry has a unique `registry_entry_id` (MFAO-REG-<UUIDv4>)
- [ ] No existing folio or certificate identifiers were modified
- [ ] No duplicate folio numbers were silently merged or discarded
- [ ] Technical identifiers contain no personal data (names, emails, GitHub users)
- [ ] `pnpm verify:contributions` passes

If this PR does NOT create folios or certificates, check this:

- [ ] N/A — no folios or certificates in this PR

## Privacy

- [ ] No PII (names, emails, cedulas, signatures) in committed files
- [ ] No secrets, tokens, or credentials in committed files
- [ ] `work/private/` content is NOT committed (gitignored)

## Quality Gates

- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm test` passes
- [ ] `pnpm format:check` passes
