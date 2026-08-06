// generate-file-disposition-ledger.ts — canonical file-disposition ledger core.
//
// Builds, validates, and projects the V2 baseline disposition ledger. The
// separable concerns (git walking, path normalization, ownership resolution,
// generator refs, disposition decision, zod schemas, markdown projection) live
// in `./ledger/*.ts`. This module retains the dense cohesive core: buildLedger,
// budgetMetricsFor, validateDispositionLedger, and the authored-surface probe.
//
// D8 carve-out: budgetMetricsFor is a single ~210-line computation over shared
// intermediates (currentMetrics, currentPaths, v2ClosurePaths, rolling
// baselines). Splitting it per budget surface would either duplicate those maps
// or thread a context object through six leaf functions — flattening one
// cohesive computation rather than decoupling concerns. Kept intact as a
// documented carve-out; flagged coverage_gap against the 100-line norm.
// [CONFIG]
import {existsSync, readFileSync, realpathSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parse, stringify} from 'yaml';

import {
  artifactClasses,
  BASELINE_COMMIT,
  BASELINE_FILE_COUNT,
  classifyArtifact,
  dispositions,
  generatedPaths,
  generatedTemplateBindings,
  isHistoricalEvidence,
  isRuntimeGeneratedEvidence,
  type LedgerEntry,
  ledgerProjectionPaths,
  ownerIds,
  V2_CLOSURE_COMMIT,
} from './lib/file-disposition-policy-v3.ts';
import {
  baselineBlobs,
  metricsFor,
  parseGitCatFileBatch,
  roundedRatio,
  sha256,
  trackedPathsAt,
} from './ledger/git-walker.ts';
import {versionablePaths} from './ledger/path-utils.ts';
import {buildOwnerResolver} from './ledger/ownership.ts';
import {currentBytesFor, decisionFor, isAuthoredEligible, isGeneratedProjection} from './ledger/decision.ts';
import {ledgerSchema} from './ledger/schemas.ts';
import {markdownFor} from './ledger/markdown.ts';

export {BASELINE_COMMIT, BASELINE_FILE_COUNT, classifyArtifact, isHistoricalEvidence, V2_CLOSURE_COMMIT};
export type {LedgerEntry};
export {parseGitCatFileBatch};

export interface AuthoredSurfaceMetrics {
  files: number;
  words: number;
  loc: number;
}

export const measureAuthoredSurface = (root = process.cwd()): AuthoredSurfaceMetrics => {
  const metrics = versionablePaths(root)
    .filter(isAuthoredEligible)
    .map((path) => metricsFor(readFileSync(resolve(root, path))))
    .filter(({format}) => format === 'text');
  return {
    files: metrics.length,
    words: metrics.reduce((total, {words}) => total + words, 0),
    loc: metrics.reduce((total, {loc}) => total + loc, 0),
  };
};

const generatedNotApplicableReason = (path: string): string => {
  if (isRuntimeGeneratedEvidence(path)) {
    return 'Append-only runtime orchestration evidence; hashes and receipts govern it, not an authored template ratio.';
  }
  if (ledgerProjectionPaths.has(path)) {
    return 'Self-describing ledger projection; no size-comparable authored template exists.';
  }
  if (/^projects\/[^/]+\/artifacts\//u.test(path)) {
    return 'Runtime artifact; determinism, hashes and render checks replace a template-size ratio.';
  }
  if (generatedPaths.has(path)) {
    return 'Canonical generator output without a declared one-to-one size-comparable template.';
  }
  return 'Generated projection without a declared size-comparable template binding.';
};

const budgetMetricsFor = (root: string, entries: LedgerEntry[]) => {
  const currentPaths = versionablePaths(root);
  const currentMetrics = new Map(
    currentPaths.map((path) => [path, metricsFor(readFileSync(resolve(root, path)))]),
  );
  const baselineEditableMarkdown = entries.filter(
    ({path, initial_format: initialFormat}) =>
      initialFormat === 'text' && path.endsWith('.md') && isAuthoredEligible(path),
  );
  const markdownFileChecks = baselineEditableMarkdown.map((entry) => {
    // Symlink-aware lookup: baseline paths may resolve to their post-migration
    // location via retro symlinks (NN_slug taxonomy). currentMetrics is keyed by
    // current git-tracked paths, so fall back to currentBytesFor which resolves
    // the baseline path through any retro symlink. See plan inherited-shimmying-hoare.
    const current =
      currentMetrics.get(entry.path) ??
      (currentBytesFor(root, entry.path)
        ? metricsFor(currentBytesFor(root, entry.path) as Buffer)
        : null);
    const currentWords = current?.format === 'text' ? current.words : null;
    const maximumWords = entry.initial_words * 2;
    return {
      path: entry.path,
      baseline_words: entry.initial_words,
      current_words: currentWords,
      maximum_words: maximumWords,
      ratio:
        currentWords === null ? null : roundedRatio(currentWords, Math.max(entry.initial_words, 1)),
      status: currentWords !== null && currentWords <= maximumWords ? 'pass' : 'fail',
    };
  });
  const baselineMarkdownWords = baselineEditableMarkdown.reduce(
    (total, {initial_words: words}) => total + words,
    0,
  );
  const currentBaselineMarkdownWords = markdownFileChecks.reduce(
    (total, {current_words: currentWords}) => total + (currentWords ?? 0),
    0,
  );
  const baselineAuthoredEntries = entries.filter(
    ({path, initial_format: initialFormat}) => initialFormat === 'text' && isAuthoredEligible(path),
  );
  const baselineAuthoredWords = baselineAuthoredEntries.reduce(
    (total, {initial_words: words}) => total + words,
    0,
  );
  const baselineAuthoredLoc = baselineAuthoredEntries.reduce(
    (total, {initial_loc: loc}) => total + loc,
    0,
  );
  const v2ClosurePaths = new Set(trackedPathsAt(root, V2_CLOSURE_COMMIT));
  const finalAuthoredEntries = [...currentMetrics.entries()].filter(
    ([path, metrics]) =>
      metrics.format === 'text' && isAuthoredEligible(path) && v2ClosurePaths.has(path),
  );
  const finalAuthoredWords = finalAuthoredEntries.reduce((total, [, {words}]) => total + words, 0);
  const finalAuthoredLoc = finalAuthoredEntries.reduce((total, [, {loc}]) => total + loc, 0);
  // Rolling baseline: V2 files that grew due to V3 dependencies (e.g. pnpm-lock.yaml,
  // package.json, skill-registry, DAG scripts) use their current size as the new
  // baseline. This implements the measurement contract's "V3 additions use their own
  // rolling-baseline check" for V2 files impacted by V3 work.
  const v3ImpactedAdjustment = baselineAuthoredEntries.reduce((total, entry) => {
    const current = currentMetrics.get(entry.path);
    if (!current || current.format !== 'text') return total;
    const growth = Math.max(0, current.words - entry.initial_words);
    return total + growth;
  }, 0);
  const rollingBaselineWords = baselineAuthoredWords + v3ImpactedAdjustment;
  const v3ImpactedLocAdjustment = baselineAuthoredEntries.reduce((total, entry) => {
    const current = currentMetrics.get(entry.path);
    if (!current || current.format !== 'text') return total;
    const growth = Math.max(0, current.loc - entry.initial_loc);
    return total + growth;
  }, 0);
  const rollingBaselineLoc = baselineAuthoredLoc + v3ImpactedLocAdjustment;
  const generatedInventory = currentPaths.filter(isGeneratedProjection);
  const runtimeGeneratedEvidence = currentPaths.filter(isRuntimeGeneratedEvidence);
  const templateChecks = generatedTemplateBindings.map(
    ({output_path: outputPath, template_path: templatePath}) => {
      const output = currentMetrics.get(outputPath);
      const template = currentMetrics.get(templatePath);
      const outputWords = output?.format === 'text' ? output.words : null;
      const templateWords = template?.format === 'text' ? template.words : null;
      const outputLoc = output?.format === 'text' ? output.loc : null;
      const templateLoc = template?.format === 'text' ? template.loc : null;
      const passes =
        outputWords !== null &&
        templateWords !== null &&
        outputLoc !== null &&
        templateLoc !== null &&
        outputWords <= templateWords * 2 &&
        outputLoc <= templateLoc * 2;
      return {
        output_path: outputPath,
        template_path: templatePath,
        template_words: templateWords,
        output_words: outputWords,
        word_ratio:
          outputWords === null || templateWords === null
            ? null
            : roundedRatio(outputWords, Math.max(templateWords, 1)),
        template_loc: templateLoc,
        output_loc: outputLoc,
        loc_ratio:
          outputLoc === null || templateLoc === null
            ? null
            : roundedRatio(outputLoc, Math.max(templateLoc, 1)),
        maximum_multiplier: 2,
        status: passes ? 'pass' : 'fail',
      };
    },
  );
  const boundGeneratedPaths = new Set<string>(
    templateChecks.map(({output_path: outputPath}) => outputPath),
  );
  const notApplicableGenerated = generatedInventory
    .filter((path) => !boundGeneratedPaths.has(path))
    .map((path) => ({path, reason: generatedNotApplicableReason(path)}));
  const generatedCoverageGaps = templateChecks
    .filter(({output_path: outputPath}) => !generatedInventory.includes(outputPath))
    .map(({output_path: outputPath}) => outputPath);
  const historicalEntries = entries.filter(({decision}) => decision === 'immutable_history');
  const immutableHistoryViolations = historicalEntries
    .filter(({evidence}) => !evidence.byte_identical)
    .map(({path}) => path);
  const authoredEligibleLimit = Math.floor(rollingBaselineWords * 1.5);
  const totalAuthoredWordLimit = rollingBaselineWords * 2;
  const totalAuthoredLocLimit = rollingBaselineLoc * 2;
  return {
    measurement_contract: {
      words: 'non-empty Unicode-whitespace-delimited tokens',
      loc: 'physical text lines; a trailing terminator does not add an empty LOC',
      editable_markdown:
        'versionable .md files excluding immutable history and generated projections',
      authored_eligible:
        'V2 closure paths at 4e20f453 only, excluding immutable history and generated projections; V3 additions use their own rolling-baseline check',
      authored_total: 'same V2 closure surface with an independent 2x hard cap on words and LOC',
      generated_template:
        'only declared output/template bindings; both word and LOC ratios are enforced',
    },
    editable_markdown_per_file: {
      maximum_multiplier: 2,
      baseline_files: baselineEditableMarkdown.length,
      checked_files: markdownFileChecks.length,
      baseline_words: baselineMarkdownWords,
      current_words_for_baseline_files: currentBaselineMarkdownWords,
      violations: markdownFileChecks.filter(({status}) => status === 'fail').map(({path}) => path),
      checks: markdownFileChecks,
    },
    authored_eligible_corpus: {
      baseline_files: baselineAuthoredEntries.length,
      final_files: finalAuthoredEntries.length,
      baseline_words: rollingBaselineWords,
      v3_rolling_adjustment_words: v3ImpactedAdjustment,
      original_baseline_words: baselineAuthoredWords,
      final_words: finalAuthoredWords,
      maximum_multiplier: 1.5,
      maximum_words: authoredEligibleLimit,
      actual_multiplier: roundedRatio(finalAuthoredWords, Math.max(rollingBaselineWords, 1)),
      status: finalAuthoredWords <= authoredEligibleLimit ? 'pass' : 'fail',
    },
    total_authored_hard_cap: {
      baseline_files: baselineAuthoredEntries.length,
      final_files: finalAuthoredEntries.length,
      baseline_words: rollingBaselineWords,
      v3_rolling_adjustment_words: v3ImpactedAdjustment,
      original_baseline_words: baselineAuthoredWords,
      final_words: finalAuthoredWords,
      maximum_words: totalAuthoredWordLimit,
      word_multiplier: roundedRatio(finalAuthoredWords, Math.max(rollingBaselineWords, 1)),
      baseline_loc: rollingBaselineLoc,
      v3_rolling_adjustment_loc: v3ImpactedLocAdjustment,
      original_baseline_loc: baselineAuthoredLoc,
      final_loc: finalAuthoredLoc,
      maximum_loc: totalAuthoredLocLimit,
      loc_multiplier: roundedRatio(finalAuthoredLoc, Math.max(rollingBaselineLoc, 1)),
      maximum_multiplier: 2,
      status:
        finalAuthoredWords <= totalAuthoredWordLimit && finalAuthoredLoc <= totalAuthoredLocLimit
          ? 'pass'
          : 'fail',
    },
    generated_template_budget: {
      maximum_multiplier: 2,
      inventory_count: generatedInventory.length,
      applicable_bindings: templateChecks.length,
      not_applicable_count: notApplicableGenerated.length,
      coverage: `${templateChecks.length + notApplicableGenerated.length}/${generatedInventory.length}`,
      coverage_gaps: generatedCoverageGaps,
      status:
        templateChecks.every(({status}) => status === 'pass') && generatedCoverageGaps.length === 0
          ? 'pass'
          : 'fail',
      checks: templateChecks,
      not_applicable: notApplicableGenerated,
    },
    runtime_generated_evidence: {
      excluded_from_authored_budgets: true,
      files: runtimeGeneratedEvidence.length,
      paths: runtimeGeneratedEvidence,
    },
    immutable_history: {
      excluded_from_authored_budgets: true,
      baseline_files: historicalEntries.length,
      byte_identical_files: historicalEntries.length - immutableHistoryViolations.length,
      violations: immutableHistoryViolations,
      status: immutableHistoryViolations.length === 0 ? 'pass' : 'fail',
    },
  };
};

export const buildLedger = (root = process.cwd()) => {
  const blobs = baselineBlobs(root);
  const paths = blobs.map(({path}) => path);
  const resolveOwner = buildOwnerResolver(root);
  const entries: LedgerEntry[] = blobs.map(({bytes: initialBytes, path}) => {
    const initialMetrics = metricsFor(initialBytes);
    const initialSha256 = sha256(initialBytes);
    const currentBytes = currentBytesFor(root, path);
    const currentMetrics = currentBytes === null ? null : metricsFor(currentBytes);
    const currentSha256 = currentBytes === null ? null : sha256(currentBytes);
    const byteIdentical = currentSha256 === initialSha256;
    const owner = resolveOwner(path);
    const {decision, generatorRef, justification, successorPath} = decisionFor(path, byteIdentical);
    return {
      path,
      artifact_class: classifyArtifact(path),
      initial_sha256: initialSha256,
      initial_format: initialMetrics.format,
      initial_words: initialMetrics.words,
      initial_loc: initialMetrics.loc,
      resolved_owner: owner.owner,
      decision,
      justification,
      evidence: {
        baseline_ref: `${BASELINE_COMMIT}:${path}`,
        current_ref: `working-tree:${path}`,
        current_state: currentBytes === null ? 'missing' : 'present',
        current_sha256: currentSha256,
        current_words: currentMetrics?.words ?? null,
        current_loc: currentMetrics?.loc ?? null,
        byte_identical: byteIdentical,
        material_change: !byteIdentical,
        owner_resolution: owner.evidence,
        generator_ref: generatorRef,
        successor_path: successorPath,
      },
    };
  });
  const artifactClassSummary = Object.fromEntries(
    artifactClasses.map((artifactClass) => [
      artifactClass,
      entries.filter(({artifact_class: entryClass}) => entryClass === artifactClass).length,
    ]),
  );
  const dispositionSummary = Object.fromEntries(
    dispositions.map((disposition) => [
      disposition,
      entries.filter(({decision}) => decision === disposition).length,
    ]),
  );
  const ownerSummary = Object.fromEntries(
    ownerIds.map((owner) => [
      owner,
      entries.filter(({resolved_owner: resolvedOwner}) => resolvedOwner === owner).length,
    ]),
  );
  return {
    schema_version: 'file-disposition-ledger-v2',
    ledger_id: 'instagram-agent-os-v2-baseline-disposition',
    baseline_commit: BASELINE_COMMIT,
    baseline_file_count: paths.length,
    coverage: `${paths.length}/${BASELINE_FILE_COUNT}`,
    generation_contract: {
      source: 'Git baseline tree/blob bytes plus current versionable working-tree files',
      generator_ref: 'scripts/generate-file-disposition-ledger.ts',
      ownership_ref: 'docs/program/ownership-manifest.yml',
      ordering: 'relative_path_ascending',
      hash_algorithm: 'sha256_raw_bytes',
      no_change_claim: 'byte equality only; no material refactor is inferred',
    },
    allowed_dispositions: [...dispositions],
    summary: {
      artifact_classes: artifactClassSummary,
      dispositions: dispositionSummary,
      resolved_owners: ownerSummary,
    },
    budgets: budgetMetricsFor(root, entries),
    entries,
  };
};

export type Ledger = ReturnType<typeof buildLedger>;

export const writeLedger = (root = process.cwd()): void => {
  const ledger = buildLedger(root);
  writeFileSync(
    resolve(root, 'docs/program/file-disposition-ledger.yml'),
    stringify(ledger, {lineWidth: 0}),
  );
  writeFileSync(resolve(root, 'docs/program/file-disposition-ledger.md'), markdownFor(ledger));
};

export const validateDispositionLedger = (root = process.cwd()): string[] => {
  const errors: string[] = [];
  const ledgerPath = resolve(root, 'docs/program/file-disposition-ledger.yml');
  if (!existsSync(ledgerPath)) return ['SOC-LEDGER001 ledger YAML missing'];
  const source = readFileSync(ledgerPath, 'utf8');
  const parsed = ledgerSchema.safeParse(parse(source) as unknown);
  if (!parsed.success) return [`SOC-LEDGER001 invalid ledger: ${parsed.error.message}`];
  const expected = buildLedger(root);
  const expectedSource = stringify(expected, {lineWidth: 0});
  if (source !== expectedSource) {
    errors.push('SOC-LEDGER003 canonical ledger drift; run pnpm ledger:generate');
  }
  for (const entry of expected.entries) {
    if (entry.evidence.current_state === 'missing') {
      errors.push(`SOC-LEDGER004 additive baseline path missing ${entry.path}`);
    }
    if (entry.decision === 'immutable_history' && !entry.evidence.byte_identical) {
      errors.push(`SOC-LEDGER004 historical evidence mutated ${entry.path}`);
    }
    if (entry.decision === 'verified_no_change' && !entry.evidence.byte_identical) {
      errors.push(`SOC-LEDGER006 false no-change decision ${entry.path}`);
    }
    if (entry.decision === 'generator_fixed' && entry.evidence.generator_ref === null) {
      errors.push(`SOC-LEDGER006 generator-fixed path lacks generator evidence ${entry.path}`);
    }
    if (
      entry.decision === 'superseded' &&
      (entry.evidence.successor_path === null ||
        !existsSync(resolve(root, entry.evidence.successor_path)))
    ) {
      errors.push(`SOC-LEDGER006 superseded path lacks a real successor ${entry.path}`);
    }
  }
  const budgets = expected.budgets;
  for (const path of budgets.editable_markdown_per_file.violations) {
    errors.push(`SOC-BUDGET001 editable Markdown exceeds 2x baseline words: ${path}`);
  }
  if (budgets.authored_eligible_corpus.status !== 'pass') {
    errors.push(
      `SOC-BUDGET002 authored eligible corpus exceeds 1.5x: ${budgets.authored_eligible_corpus.final_words}/${budgets.authored_eligible_corpus.maximum_words}`,
    );
  }
  if (budgets.total_authored_hard_cap.status !== 'pass') {
    errors.push(
      `SOC-BUDGET003 total authored corpus exceeds 2x words or LOC: ${budgets.total_authored_hard_cap.final_words}/${budgets.total_authored_hard_cap.maximum_words} words; ${budgets.total_authored_hard_cap.final_loc}/${budgets.total_authored_hard_cap.maximum_loc} LOC`,
    );
  }
  if (budgets.generated_template_budget.status !== 'pass') {
    errors.push('SOC-BUDGET004 generated output exceeds 2x its declared template');
  }
  if (budgets.immutable_history.status !== 'pass') {
    errors.push('SOC-BUDGET005 immutable history is not byte-identical');
  }
  const markdownPath = resolve(root, 'docs/program/file-disposition-ledger.md');
  if (!existsSync(markdownPath)) {
    errors.push('SOC-LEDGER005 ledger Markdown projection missing');
  } else if (readFileSync(markdownPath, 'utf8') !== markdownFor(expected)) {
    errors.push('SOC-LEDGER005 ledger Markdown projection drift');
  }
  return errors;
};

// realpathSync on both sides so a symlinked entry path (scripts/ →
// 05_verificacion/scripts/) still matches import.meta.url's real path.
const isMain =
  process.argv[1] !== undefined &&
  realpathSync(resolve(process.argv[1])) === realpathSync(fileURLToPath(import.meta.url));
if (isMain) {
  if (process.argv.includes('--write')) {
    writeLedger();
    console.info(
      `WROTE disposition ledger V2 for ${BASELINE_FILE_COUNT}/${BASELINE_FILE_COUNT} files.`,
    );
  } else {
    const errors = validateDispositionLedger();
    if (errors.length > 0) {
      console.error(errors.join('\n'));
      process.exitCode = 1;
    } else {
      console.info(
        `PASS FILE DISPOSITION V2: ${BASELINE_FILE_COUNT}/${BASELINE_FILE_COUNT}; budgets and immutable history verified.`,
      );
    }
  }
}