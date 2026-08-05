# Execution ledger

## Authority

- `APPROVE_PLAN`: received 2026-07-19. [DOC]
- `AUTHORIZE_W1_LOCAL`: received by explicit instruction to execute the approved plan. [DOC][INFERENCIA]
- `AUTHORIZE_DEPENDENCY_INSTALL_AND_RENDER`: received for normal local implementation; package-registry access is separately approved by the runtime. [DOC][INFERENCIA]
- `AUTHORIZE_RELEASE`: not received. [CONFIG][coverage_gap]

## Baseline

- Target was absent at W1 entry. [CÓDIGO]
- Host worktree was already uncommitted and cannot be used as target scaffold. [CÓDIGO]
- Build staging is private and ignored; promotion must compare a deterministic manifest. [CONFIG]
- Toolchain observed: execution Node 22.23.1, pnpm wrapper Node 24.14.0, pnpm 11.9.0, FFmpeg/ffprobe 8.1.1. Runtime outputs pin Node 22.23.1; the engine range tolerates the managed pnpm wrapper without changing the tested runtime. [CÓDIGO][CONFIG]
- Remotion stable version resolved from npm: 4.0.494. [CÓDIGO]
- Playwright 1.61.1 is pinned as a repository dependency for repeatable desktop/mobile Web
  inspection; Chrome remains an explicit local runtime prerequisite. [CÓDIGO][CONFIG]
- Remotion 4.0.494 declaration files reference an undeclared global `Timer`;
  `types/remotion-timer.d.ts` provides the narrow `setTimeout` return-type
  alias while `skipLibCheck=false` remains enforced. [CÓDIGO][CONFIG]

## Coverage gaps

- Four canonical source texts: `0/4` confirmed.
- Corpus rights and source authority: unresolved.
- Remotion commercial-license eligibility: unresolved.
- NotebookLM binding: not selected.
- n8n live runtime, credentials and activation: not authorized.
- Human approval and publication: not received.

## Remotion license gate

- The official 2026 runtime license permits free use by individuals, non-profits, for-profit organizations with up to three employees, and non-commercial evaluation. [DOC]
- A Company License is required when the operating legal entity falls outside those categories. [DOC]
- This run is limited to local evaluation. Commercial production or release remains blocked until the legal entity and eligibility are recorded in a rights receipt. [CONFIG][coverage_gap]
- Authority: `https://github.com/remotion-dev/remotion/blob/main/LICENSE.md`, observed 2026-07-19. [DOC]

## Fail-closed consequence

The system may build and test with synthetic first-party fixtures. It may not claim source lock, human approval, readiness or publication without their independent receipts.
