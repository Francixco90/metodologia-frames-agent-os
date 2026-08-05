# crawl4ai-skill vendor audit — Fase 1K

> Audit date: 2026-08-04 · Auditor: lead · 1 skill, MIT OR Apache-2.0 (dual) ·
> Per-file sha256 in [`source-lock.json`](./source-lock.json).
> **FAIL-CLOSED tool skill.**

## Scope

1 skill vendored text-only into `skills/vendor/crawl4ai-skill/crawl4ai/` as
**reference-only** input for the locally-authored `web-crawl4ai` homólogo
(expansion Fase 2Q, web-* family, H-03 path, **fail-closed**). 14 text files
copied (SKILL.md + 9 references + 5 evals), 0 binaries excluded. Source is
**dual-licensed MIT OR Apache-2.0** (LICENSE, LICENSE-MIT, LICENSE-APACHE all at
repo root, "Copyright (c) 2026 Brett Davies"). Homólogo derives under MIT for
attribution simplicity (both permissive, MIT-compatible with
`LicenseRef-MetodologIA-Internal`).

## Source resolution

| skill      | source repo                  | commit    | license                  | source path | files vendored                         |
| ---------- | ---------------------------- | --------- | ------------------------ | ----------- | -------------------------------------- |
| `crawl4ai` | `brettdavies/crawl4ai-skill` | `c696921` | MIT OR Apache-2.0 (dual) | `/` (root)  | 14 (SKILL.md + 9 references + 5 evals) |

- **crawl4ai** (web crawling/scraping tool): SKILL.md describes invoking the
  `crawl4ai` SDK/CLI for web crawling, content extraction, anti-detection, URL
  discovery. 9 reference docs (cli-guide, sdk-guide, complete-sdk-reference,
  anti-detection, content-filters, escalation, recipes, troubleshooting,
  url-discovery) + 5 evals (eval-01 through eval-04 + README). **TOOL skill** —
  invokes crawl4ai SDK/CLI for network crawling. Vendored as reference-only;
  homólogo `web-crawl4ai` is **fail-closed** (describes capability in prose, gates
  execution behind user confirmation, NO auto-execute network/install/binary).

## License

Source is **dual-licensed MIT OR Apache-2.0** (LICENSE, LICENSE-MIT,
LICENSE-APACHE all at repo root, "Copyright (c) 2026 Brett Davies"). Both are
OSI-approved permissive licenses. Homologue derives under **MIT** for
attribution simplicity (both permissive; MIT-compatible with
`LicenseRef-MetodologIA-Internal`). Attribution preserved in LINEAGE.yml. The
dual-license choice is noted in audit-report; the homólogo derivation contract
references MIT as the chosen permissive basis.

## Global audit findings

### 1. License — MIT OR Apache-2.0 (dual; 3 LICENSE files at root)

- Dual per LICENSE + LICENSE-MIT + LICENSE-APACHE at repo root
  ("Copyright (c) 2026 Brett Davies").
- Both OSI-approved, permissive. No source-available / NOT-OSI risk.
- Homologue derives under MIT (chosen permissive basis; both compatible).

### 2. Binaries excluded

None. `skills/vendor/crawl4ai-skill/crawl4ai/` contains SKILL.md (UTF-8 text) +
9 reference markdown files + 5 eval markdown files, all UTF-8 text. `file`
reports no binary/executable/image/font in the vendored set. 3 LICENSE files at
vendor root (all UTF-8 text).

### 3. Secrets / PII / private locators

None. SKILL.md + references + evals reference public concepts (crawl4ai SDK,
anti-detection techniques, public URLs in eval examples). No credentials,
tokens, internal hostnames, or PII. Eval example URLs are public test sites.

### 4. Network / execution surface

**Present but contained.** crawl4ai is a TOOL skill that invokes the crawl4ai
SDK/CLI for web crawling (network fetch, browser automation, content
extraction). Vendored as **reference-only** — no script execution, no network
fetch, no install invoked in vendor context. Homólogo `web-crawl4ai` (Fase 2Q,
web-* family) is **fail-closed**: `execution_boundary:
requires_user_confirmation`, describes the capability in prose, gates any
execution behind explicit user confirmation, NO auto-execute
network/install/binary. Matches MetodologIA "no activar conectores ni publicar".

### 5. Content-type verification

SKILL.md + 9 references + 5 evals + 3 LICENSE files are UTF-8 text. 0 binary
leaks.

## Per-skill checklist

### crawl4ai

- [x] License: MIT OR Apache-2.0 (dual; 3 LICENSE files at root)
- [x] Attribution: "Copyright (c) 2026 Brett Davies" preserved in copied LICENSEs
- [x] Source commit pinned: `c696921b133dd962f766f596655767c0b894d206`
- [x] Text-only: 14 files (SKILL.md + 9 references + 5 evals), 0 binaries
- [x] No secrets/PII/private locators
- [x] `execution_status: reference-only-no-auto-execution`
- [x] Per-file sha256 in `source-lock.json`:
      `SKILL.md = ac9eb874e2732fc1fb26d902cde1b0e1942982ffbf48d6ca248d53a8a0d694a4`
- [x] **Fail-closed homólogo required** (web-crawl4ai, Fase 2Q)
- [x] Homólogo derives under MIT (chosen permissive basis from dual license)

## Verdict

**PASS.** 1 skill, MIT OR Apache-2.0 (dual; 3 LICENSE files at root), 17 text
files vendored (SKILL.md + 9 references + 5 evals + 3 LICENSE files), 0 binaries,
0 secrets. TOOL skill contained as reference-only; fail-closed homólogo
required. Ready for `web-crawl4ai` homólogo (Fase 2Q, web-* family, H-03 path,
fail-closed, derives under MIT).
