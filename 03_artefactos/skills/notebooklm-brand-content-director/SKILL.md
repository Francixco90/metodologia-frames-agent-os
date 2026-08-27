---
name: notebooklm-brand-content-director
description: Convert a content request and approved brand knowledge pack into a channel-specific, source-bounded brief for NotebookLM chat or Studio without generating, approving, or publishing it.
metadata: {owner: MetodologIA, lifecycle_state: candidate, execution_scope: local-briefing}
---

# NotebookLM Brand Content Director

## Trigger

Use at N07 when an approved profile and bounded source sets must become a content brief.

## Inputs

Content intent, profile digest and source sets. Select exactly one entry from
[assets/prompt-templates/prompt-registry.json](assets/prompt-templates/prompt-registry.json); for
selection and idempotency, read [references/briefing-policy.md](references/briefing-policy.md).

## Outputs

Compile `BrandContentBriefV1` through `buildBrandContentBrief`; compile Studio through
`buildBrandStudioBrief`, which revalidates the active profile, approved source set and parent brief.
The result carries locale, channel, audience, objective, explicit `source_ids`, `claim_ids`,
`asset_ids`, exclusions, acceptance and source-set digest. Preserve names
and citations. Studio-native kinds hand a bounded brief to `notebooklm-studio-director`.

## Stop rules

Block empty/all-sources sets, unsupported claims, unknown asset rights, mixed brands, wrong template
or unavailable locale rules. A style sample is not a universal rule.

## Done contract

The result is an executable, testable and idempotent brief—not content, generation or approval.
