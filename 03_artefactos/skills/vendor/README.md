# Vendor packs

Third-party skill packs whose files first-party skills cite as `authority_refs` stay tracked here
and are governed by the hash-bound skill registries (SKL-H03-004 / SKL-V2-008 `stat` every ref).
Packs nobody cites (`gsap-skills`) are not tracked: `pnpm vendor:sync <pack>` re-materializes one
from its `01_intencion/<pack>/source-lock.json` and `pnpm vendor:check` (part of `pnpm verify`)
verifies materialized, untracked packs against their locks, failing closed on drift. The byte
archive as of 2026-09-05 lives in the local repository `frames-vendor-archive`. [CONFIG]
