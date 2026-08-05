# A09/A10 Cross-Package Rights, Accessibility and Security Review

## Scope and independence

This review covers only packages the verifier did not produce: A02 sources and NotebookLM, A05
Skill Foundry, A06 Web, and A11 n8n. [CONFIG]

A03 and A04 are explicitly excluded from an independent verdict because this verifier produced
them. A07 and A08 remain explicitly deferred from this independent round; their current filesystem
state does not expand this verifier's assigned scope. [CONFIG]

The overall verdict is **BLOCKED**. This review does not grant human approval, `READY`, release or
publication. [CONFIG]

## Artifact verdicts

| Package / artifact                       | Rights and license                                                                                                                                                                                     | Accessibility                                                                                                                                                                                                                                                                                  | Security and integrity                                                                                                                                                                                                                                                 | Verdict                                  |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| A02 source registry, receipts and claims | The synthetic first-party fixture is limited to local contract testing. Remote methodology references retain unresolved rights and authority. The canonical corpus remains 0-of-4. [DOC]               | Source records are machine-readable; end-user accessibility is not applicable to this registry review. [INFERENCIA]                                                                                                                                                                            | Lifecycle, raw/normalized hashes, dedupe, receipts, provenance and portable versioned paths pass. `source_locked` remains false. [CÓDIGO]                                                                                                                              | `PASS_CONTROLLED_FIXTURE_ONLY`           |
| A02 NotebookLM adapter                   | No notebook content, locator, cookie or token was read or persisted. Binding remains `none`. [DOC]                                                                                                     | No user-facing NotebookLM artifact was evaluated. [INFERENCIA]                                                                                                                                                                                                                                 | The initial five adversarial failures were returned to the producer. The strict resubmission now rejects undeclared locators, mutation instructions, malformed timestamps, digest material in `none` mode and empty grounding mappings; 10/10 negatives pass. [CÓDIGO] | `PASS_READ_ONLY_CONTRACT`                |
| A05 canonical Remotion skill             | Local evaluation is permitted by the program record. Commercial or production eligibility and reference content license remain explicit gaps; the legacy wrapper stays quarantined and uncopied. [DOC] | The router requires captions, rights and accessibility, but the complete executable audiovisual edge-case fixture matrix is not present in the available A05 package. [CÓDIGO]                                                                                                                 | Lineage, content hash, checks and quarantine pass. The published pattern now accepts all three portable fixtures and rejects all 12 traversal, absolute, URI, backslash and empty-segment fixtures. [CÓDIGO]                                                           | `PASS_PORTABILITY_CONTRACT`              |
| A06 checked-in Web artifact              | All visible claims resolve to the synthetic local-only source. This does not authorize external distribution. [CÓDIGO]                                                                                 | Static WCAG 2.2 AA checks pass for language, landmarks, one H1, skip link, reduced motion and declared text contrast. Desktop/mobile screenshots show readable hierarchy without recorded overflow. Keyboard and screen-reader testing remain a gap, so no conformance claim is made. [CÓDIGO] | Current HTML is deterministic, offline, script-free and escapes hostile copy. The strict model rejects undeclared fields, orphan claim IDs and blocked material claims. Its receipt binds both model and renderer implementation hashes. [CÓDIGO]                      | `PASS_CURRENT_ARTIFACT_AND_STRICT_MODEL` |
| A11 n8n adapter                          | No live destination or release right was exercised. The H01 approval used by regression is synthetic and does not approve the project artifact. [CONFIG]                                               | No user-facing interface is in scope. [INFERENCIA]                                                                                                                                                                                                                                             | Version 2 resolves and hash-checks artifact, render receipt, props, assets, H01 approval and all three policies. Default deny-all, H02 impersonation, hash drift, missing evidence and replay drift all fail closed. Workflow remains inert. [CÓDIGO]                  | `PASS_DRY_RUN_V2_CONTRACT`               |

## Accessibility method and limits

The accessibility strategy targeted WCAG 2.2 AA for the available Web artifact. It combined static
structure assertions, measured contrast ratios, the existing desktop/mobile browser smoke receipt,
and verifier visual inspection of both screenshots. [CÓDIGO]

The current artifact retains a skip link, Spanish language metadata, one main landmark, one H1,
descriptive section labels, no horizontal overflow at the recorded viewports, and a reduced-motion
override. All tested foreground/background pairs exceed 4.5:1. [CÓDIGO]

`coverage_gap`: no live-browser keyboard traversal, focus-order recording, VoiceOver/NVDA session,
zoom/reflow at 200–400%, or user testing was performed. Automated and screenshot evidence is
insufficient for a WCAG conformance claim. [CONFIG]

## Open risks and evidence

The authoritative defect list is
`quality/reports/a09-a10-defect-ledger.yml`. All previously open A05/A06/A11 defects, plus the H01
and replay regressions discovered in this round, are producer-remediated and independently
verified. There are no open defects in the scoped packages. Command results, production hashes and
visual evidence are recorded in `quality/reports/a09-a10-test-evidence.yml`. [CÓDIGO]

The overall verdict remains `BLOCKED` because the canonical corpus is 0-of-4, Remotion production
license eligibility is unresolved, live accessibility coverage is incomplete, H01 has not approved
the real project artifact, n8n remains inert, and A07/A08 are deferred. This is not a release denial
caused by an open scoped code defect; it is a conservative gate on unresolved evidence and excluded
packages. [CONFIG]

No producer artifact was modified by this verifier. Adversarial assertions were inverted only after
the corresponding production changes and all are retained as fail-closed regression evidence. This
review grants neither human approval, `READY`, release nor publication. [CONFIG]
