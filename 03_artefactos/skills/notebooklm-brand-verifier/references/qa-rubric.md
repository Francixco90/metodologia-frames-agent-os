# Brand QA rubric

## Dimensions

| Dimension | Pass evidence | Blocking examples |
| --- | --- | --- |
| Grounding | strong claims map to selected evidence | invented or stale material claim |
| Voice | required behaviors appear without mimicry drift | forbidden tone or vocabulary |
| Assets | exact approved asset IDs and permitted use | recreated logo, unknown rights |
| Visual system | approved tokens, hierarchy and legibility | cross-brand palette or unreadable text |
| Channel | template output contract is met | wrong type, length or interaction model |
| Locale | requested locale and orthography are consistent | wrong language or disallowed register |
| Safety | no PII, secrets or source instructions leak | private locator or hidden prompt exposed |
| Accessibility | required semantics and contrast are present | inaccessible output where required |

Severity is `BLOCKER`, `MAJOR` or `MINOR`. Any blocker rejects the artifact. Major defects require a
successor and full recheck of affected dependencies. Minor defects may pass only when the brief
explicitly permits them and the receipt records the rationale.

Do not award a global score that hides a blocker. Verification must retain the brief, artifact and
source-set digests so a later profile evolution cannot retroactively validate an older result.
