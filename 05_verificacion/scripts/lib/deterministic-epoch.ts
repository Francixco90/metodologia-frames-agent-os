// deterministic-epoch.ts — named constants for fixed date-pins (ADR 0027, D4).
//
// Centralizes the deterministic timestamps scattered as inline literals so the
// repo's atemporal rule is enforceable: the VALUE is the hash-bound literal
// (preserved exactly); the NAME is the parametrized handle. Import these
// instead of re-declaring inline. [CONFIG]
//
// Hash-bound immutables: do NOT change these values. They are sealed to
// eval/receipt hashes and evidence chains. To rebase the epoch, open an ADR
// and re-run the affected eval/receipt families. [CONFIG]

/** Ablation + H-E002 eval harness fixed timestamp. Hash-bound to eval results. */
export const DETERMINISTIC_EPOCH = '2026-08-01T00:00:00+00:00';

/** Backfill-tasks fixed timestamp. Hash-bound to backfill receipts. */
export const BACKFILL_EPOCH = '2026-08-02T00:00:00+00:00';

/** Multimedia-workflow scaffold fixed timestamp. Hash-bound to scaffolded task.yaml. */
export const SCAFFOLD_EPOCH = '2026-08-05T00:00:00+00:00';

/** Unit-test fixture NOW (core contracts). Hash-bound to fixture-derived tests. */
export const FIXTURE_NOW = '2026-07-19T12:00:00Z';

// Hash-bound zod literals preserved inline (NOT extracted): see
// `renderers/remotion/src/{validation-evidence,append-only-evidence}.ts` —
// `z.literal('2026-07-19T12:00:00.000Z')` stays literal with a comment, per
// ADR 0027 excepciones. Extracting would risk the evidence-chain hash. [CONFIG]
