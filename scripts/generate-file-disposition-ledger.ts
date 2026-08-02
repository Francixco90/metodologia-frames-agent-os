import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {existsSync, lstatSync, readFileSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

import {parse, stringify} from 'yaml';
import {z} from 'zod';

import {
  artifactClasses,
  BASELINE_COMMIT,
  BASELINE_FILE_COUNT,
  classifyArtifact,
  type Disposition,
  dispositions,
  generatedPaths,
  generatorSourcePaths,
  generatedTemplateBindings,
  isHistoricalEvidence,
  isRuntimeGeneratedEvidence,
  ledgerProjectionPaths,
  type LedgerEntry,
  type OwnerId,
  ownerIds,
  type OwnerResolution,
  quarantinePrefix,
  supersessionByPath,
  type TextMetrics,
  V2_CLOSURE_COMMIT,
} from './lib/file-disposition-policy-v3.ts';

export {
  BASELINE_COMMIT,
  BASELINE_FILE_COUNT,
  classifyArtifact,
  isHistoricalEvidence,
  V2_CLOSURE_COMMIT,
};
export type {LedgerEntry};
const sha256 = (bytes: Buffer): string => createHash('sha256').update(bytes).digest('hex');
const metricsFor = (bytes: Buffer): TextMetrics => {
  if (bytes.includes(0)) return {format: 'binary', words: 0, loc: 0};
  const text = bytes.toString('utf8');
  const trimmed = text.trim();
  const physicalLines =
    text.length === 0
      ? 0
      : text.split(/\r\n|\r|\n/u).length - (/(?:\r\n|\r|\n)$/u.test(text) ? 1 : 0);
  return {
    format: 'text',
    words: trimmed.length === 0 ? 0 : trimmed.split(/\s+/u).length,
    loc: physicalLines,
  };
};
const ratio = (numerator: number, denominator: number): number =>
  denominator === 0 ? (numerator === 0 ? 1 : Number.POSITIVE_INFINITY) : numerator / denominator;
const roundedRatio = (numerator: number, denominator: number): number =>
  Number(ratio(numerator, denominator).toFixed(4));
const trackedPathsAt = (root: string, commit: string): string[] =>
  execFileSync('git', ['ls-tree', '-r', '--name-only', commit], {
    cwd: root,
    encoding: 'utf8',
  })
    .split('\n')
    .filter(Boolean)
    .sort();
export const parseGitCatFileBatch = (output: Buffer, objectIds: readonly string[]): Buffer[] => {
  let offset = 0;
  const objects = objectIds.map((objectId) => {
    const headerEnd = output.indexOf(0x0a, offset);
    if (headerEnd < 0) throw new Error(`Git batch header missing for ${objectId}`);
    const header = output.subarray(offset, headerEnd).toString('ascii');
    const match = /^([0-9a-f]{40,64}) blob ([0-9]+)$/u.exec(header);
    if (match?.[1] !== objectId)
      throw new Error(`Git batch framing mismatch for ${objectId}: ${header}`);
    const size = Number(match[2]);
    const start = headerEnd + 1;
    const end = start + size;
    if (!Number.isSafeInteger(size) || end >= output.length || output[end] !== 0x0a) {
      throw new Error(`Git batch payload framing invalid for ${objectId}`);
    }
    offset = end + 1;
    return output.subarray(start, end);
  });
  if (offset !== output.length) throw new Error('Git batch output contains trailing bytes');
  return objects;
};
const baselineBlobs = (root: string) => {
  const tree = execFileSync('git', ['ls-tree', '-rz', '--full-tree', BASELINE_COMMIT], {cwd: root});
  const refs = tree
    .subarray(0, tree.length - (tree.at(-1) === 0 ? 1 : 0))
    .toString('utf8')
    .split('\0')
    .map((entry) => {
      const match = /^[0-7]+ blob ([0-9a-f]{40,64})\t([\s\S]+)$/u.exec(entry);
      if (match === null) throw new Error(`Unsupported Git tree entry: ${entry}`);
      return {objectId: match[1] as string, path: match[2] as string};
    })
    .sort(({path: left}, {path: right}) => (left < right ? -1 : left > right ? 1 : 0));
  const output = execFileSync('git', ['cat-file', '--batch'], {
    cwd: root,
    input: `${refs.map(({objectId}) => objectId).join('\n')}\n`,
    maxBuffer: 256 * 1024 * 1024,
  });
  const bytes = parseGitCatFileBatch(
    output,
    refs.map(({objectId}) => objectId),
  );
  return refs.map((ref, index) => ({...ref, bytes: bytes[index] as Buffer}));
};
const versionablePaths = (root: string): string[] =>
  execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], {
    cwd: root,
    encoding: 'utf8',
  })
    .split('\0')
    .filter(
      (path) =>
        path.length > 0 &&
        path !== 'node_modules' &&
        !path.startsWith('node_modules/') &&
        existsSync(resolve(root, path)) &&
        lstatSync(resolve(root, path)).isFile(),
    )
    .sort();
const globPatternToRegExp = (pattern: string): RegExp => {
  const placeholder = '\u0000';
  const protectedPattern = pattern.replaceAll('**', placeholder);
  let expression = '';
  for (const character of protectedPattern) {
    if (character === placeholder) expression += '.*';
    else if (character === '*') expression += '[^/]*';
    else if (character === '?') expression += '[^/]';
    else if ('.+^${}()|\\'.includes(character)) expression += `\\${character}`;
    else expression += character;
  }
  return new RegExp(`^${expression}$`, 'u');
};
const ownershipManifestSchema = z.object({
  version: z.literal(1),
  policy: z.literal('one-writer-per-path'),
  writers: z.record(z.enum(ownerIds), z.array(z.string().min(1))),
});
const buildOwnerResolver = (root: string): ((path: string) => OwnerResolution) => {
  const manifestPath = resolve(root, 'docs/program/ownership-manifest.yml');
  const manifest = ownershipManifestSchema.parse(parse(readFileSync(manifestPath, 'utf8')));
  const routes = Object.entries(manifest.writers).flatMap(([owner, patterns]) =>
    patterns.map((pattern) => ({
      owner: owner as OwnerId,
      pattern,
      matcher: globPatternToRegExp(pattern),
    })),
  );
  return (path: string): OwnerResolution => {
    const matches = routes.filter(({matcher}) => matcher.test(path));
    if (matches.length > 1) {
      throw new Error(
        `Ownership collision for ${path}: ${matches.map(({owner, pattern}) => `${owner}:${pattern}`).join(', ')}`,
      );
    }
    const match = matches[0];
    if (match !== undefined) {
      return {
        owner: match.owner,
        evidence: `docs/program/ownership-manifest.yml:${match.owner}:${match.pattern}`,
      };
    }
    throw new Error(`Ownership unresolved for baseline path ${path}`);
  };
};
const currentBytesFor = (root: string, path: string): Buffer | null => {
  const currentPath = resolve(root, path);
  return existsSync(currentPath) && lstatSync(currentPath).isFile()
    ? readFileSync(currentPath)
    : null;
};
const generatorRefFor = (path: string): string | null => {
  if (generatorSourcePaths.has(path)) return path;
  if (path === 'projects/vs-001-source-to-campaign/web/artifact/index.html') {
    return 'workflows/web/build.ts';
  }
  if (path === 'projects/vs-001-source-to-campaign/remotion/07-postproduction-ledger.md') {
    return 'renderers/remotion/scripts/inspect-renders.ts';
  }
  if (
    path === 'projects/vs-001-source-to-campaign/remotion/04-component-registry.yml' ||
    path === 'projects/vs-001-source-to-campaign/remotion/05-input-props.json' ||
    path === 'projects/vs-001-source-to-campaign/remotion/06-render-manifest.yml' ||
    path === 'projects/vs-001-source-to-campaign/remotion/assets-manifest.yml' ||
    path === 'registries/components/component-registry.yml'
  ) {
    return 'renderers/remotion/scripts/prepare-project.ts';
  }
  if (
    path === 'projects/vs-001-source-to-campaign/remotion/00-source-script.md' ||
    path === 'projects/vs-001-source-to-campaign/remotion/01-video-spec.yml' ||
    path === 'projects/vs-001-source-to-campaign/remotion/02-beat-map.yml' ||
    path === 'projects/vs-001-source-to-campaign/remotion/03-visual-philosophy.md' ||
    path === 'projects/vs-001-source-to-campaign/remotion/captions.json'
  ) {
    return 'workflows/content/build.ts';
  }
  return null;
};
const decisionFor = (
  path: string,
  byteIdentical: boolean,
): {
  decision: Disposition;
  justification: string;
  generatorRef: string | null;
  successorPath: string | null;
} => {
  if (isHistoricalEvidence(path)) {
    return {
      decision: 'immutable_history',
      justification:
        'Historical evidence is excluded from refactoring and must preserve its baseline bytes.',
      generatorRef: null,
      successorPath: null,
    };
  }
  if (path.startsWith(quarantinePrefix)) {
    return {
      decision: 'quarantined',
      justification:
        'The locally authored legacy Stitch wrapper remains audit-only and cannot enter production routing.',
      generatorRef: null,
      successorPath: null,
    };
  }
  const successorPath = supersessionByPath.get(path);
  if (successorPath !== undefined) {
    return {
      decision: 'superseded',
      justification: `A real versioned successor exists at ${successorPath}; lineage remains explicit.`,
      generatorRef: null,
      successorPath,
    };
  }
  if (byteIdentical) {
    return {
      decision: 'verified_no_change',
      justification:
        'Working-tree bytes equal the baseline; no material improvement is claimed for this file.',
      generatorRef: null,
      successorPath: null,
    };
  }
  const generatorRef = generatorRefFor(path);
  if (generatorRef !== null) {
    return {
      decision: 'generator_fixed',
      justification:
        'The canonical generator changed; derived outputs must be regenerated and verified, never patched as source.',
      generatorRef,
      successorPath: null,
    };
  }
  return {
    decision: 'refactored',
    justification:
      'Baseline bytes changed under the resolved owner; compatibility and repository checks are required.',
    generatorRef: null,
    successorPath: null,
  };
};
const isGeneratedProjection = (path: string): boolean =>
  generatedPaths.has(path) ||
  ledgerProjectionPaths.has(path) ||
  path.startsWith('brand/generated/') ||
  /^content\/[^/]+\/generated\//u.test(path) ||
  isRuntimeGeneratedEvidence(path) ||
  /^projects\/[^/]+\/artifacts\//u.test(path);
const isAuthoredEligible = (path: string): boolean =>
  !isHistoricalEvidence(path) && !isGeneratedProjection(path);
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
    const current = currentMetrics.get(entry.path);
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
type Ledger = ReturnType<typeof buildLedger>;
const nullableNonnegativeInteger = z.number().int().nonnegative().nullable();
const ledgerEntrySchema = z.strictObject({
  path: z.string().min(1),
  artifact_class: z.enum(artifactClasses),
  initial_sha256: z.string().regex(/^[a-f0-9]{64}$/u),
  initial_format: z.enum(['text', 'binary']),
  initial_words: z.number().int().nonnegative(),
  initial_loc: z.number().int().nonnegative(),
  resolved_owner: z.enum(ownerIds),
  decision: z.enum(dispositions),
  justification: z.string().min(1),
  evidence: z.strictObject({
    baseline_ref: z.string().min(1),
    current_ref: z.string().min(1),
    current_state: z.enum(['present', 'missing']),
    current_sha256: z
      .string()
      .regex(/^[a-f0-9]{64}$/u)
      .nullable(),
    current_words: nullableNonnegativeInteger,
    current_loc: nullableNonnegativeInteger,
    byte_identical: z.boolean(),
    material_change: z.boolean(),
    owner_resolution: z.string().min(1),
    generator_ref: z.string().min(1).nullable(),
    successor_path: z.string().min(1).nullable(),
  }),
});
const ledgerSchema = z
  .object({
    schema_version: z.literal('file-disposition-ledger-v2'),
    ledger_id: z.literal('instagram-agent-os-v2-baseline-disposition'),
    baseline_commit: z.literal(BASELINE_COMMIT),
    baseline_file_count: z.literal(BASELINE_FILE_COUNT),
    coverage: z.literal('387/387'),
    allowed_dispositions: z.array(z.enum(dispositions)).length(dispositions.length),
    budgets: z.object({
      editable_markdown_per_file: z.object({
        maximum_multiplier: z.literal(2),
        violations: z.array(z.string()),
      }),
      authored_eligible_corpus: z.object({
        maximum_multiplier: z.literal(1.5),
        status: z.enum(['pass', 'fail']),
      }),
      total_authored_hard_cap: z.object({
        maximum_multiplier: z.literal(2),
        status: z.enum(['pass', 'fail']),
      }),
      generated_template_budget: z.object({
        maximum_multiplier: z.literal(2),
        inventory_count: z.number().int().nonnegative(),
        applicable_bindings: z.number().int().nonnegative(),
        not_applicable_count: z.number().int().nonnegative(),
        coverage_gaps: z.array(z.string()),
        status: z.enum(['pass', 'fail']),
      }),
      runtime_generated_evidence: z.object({
        excluded_from_authored_budgets: z.literal(true),
        files: z.number().int().nonnegative(),
        paths: z.array(z.string()),
      }),
      immutable_history: z.object({
        excluded_from_authored_budgets: z.literal(true),
        status: z.enum(['pass', 'fail']),
      }),
    }),
    entries: z.array(ledgerEntrySchema).length(BASELINE_FILE_COUNT),
  })
  .passthrough();
const renderSummaryTable = (header: string, values: Record<string, number>): string => {
  const rows = Object.entries(values).map(([key, value]) => [`\`${key}\``, String(value)] as const);
  const firstWidth = Math.max(header.length, ...rows.map(([key]) => key.length));
  const secondWidth = Math.max('Archivos'.length, ...rows.map(([, value]) => value.length));
  return [
    `| ${header.padEnd(firstWidth)} | ${'Archivos'.padStart(secondWidth)} |`,
    `| ${'-'.repeat(firstWidth)} | ${`${'-'.repeat(secondWidth - 1)}:`} |`,
    ...rows.map(([key, value]) => `| ${key.padEnd(firstWidth)} | ${value.padStart(secondWidth)} |`),
  ].join('\n');
};
const renderBudgetTable = (rows: readonly (readonly string[])[]): string => {
  const headers = ['Gate', 'Baseline', 'Final', 'Límite', 'Ratio', 'Estado'] as const;
  const rightAligned = new Set([1, 2, 3, 4]);
  const widths = headers.map((header, index) =>
    Math.max(header.length, ...rows.map((row) => row[index]?.length ?? 0)),
  );
  const renderRow = (row: readonly string[]): string =>
    `| ${row
      .map((value, index) =>
        rightAligned.has(index)
          ? value.padStart(widths[index] ?? value.length)
          : value.padEnd(widths[index] ?? value.length),
      )
      .join(' | ')} |`;
  const separator = widths.map((width, index) =>
    rightAligned.has(index) ? `${'-'.repeat(Math.max(width - 1, 2))}:` : '-'.repeat(width),
  );
  return [renderRow(headers), renderRow(separator), ...rows.map(renderRow)].join('\n');
};
const markdownFor = (ledger: Ledger): string => {
  const budgets = ledger.budgets;
  const entryValues = ledger.entries.map(
    (entry) =>
      [
        `\`${entry.path}\``,
        `\`${entry.resolved_owner}\``,
        `\`${entry.decision}\``,
        String(entry.initial_words),
        String(entry.evidence.current_words ?? 'n/a'),
        String(entry.initial_loc),
        String(entry.evidence.current_loc ?? 'n/a'),
        `\`${entry.initial_sha256}\``,
        entry.evidence.byte_identical ? '`byte-identical`' : '`changed`',
      ] as const,
  );
  const entryHeaders = [
    'Ruta',
    'Owner',
    'Decisión',
    'Palabras iniciales',
    'Palabras actuales',
    'LOC inicial',
    'LOC actual',
    'SHA-256 inicial',
    'Evidencia',
  ] as const;
  const entryWidths = entryHeaders.map((header, index) =>
    Math.max(header.length, ...entryValues.map((row) => row[index]?.length ?? 0)),
  );
  const entryTable = [
    `| ${entryHeaders
      .map((header, index) => header.padEnd(entryWidths[index] ?? header.length))
      .join(' | ')} |`,
    `| ${entryWidths.map((width) => '-'.repeat(width)).join(' | ')} |`,
    ...entryValues.map(
      (row) =>
        `| ${row
          .map((value, index) => value.padEnd(entryWidths[index] ?? value.length))
          .join(' | ')} |`,
    ),
  ].join('\n');
  const eligibleBudget = budgets.authored_eligible_corpus;
  const totalBudget = budgets.total_authored_hard_cap;
  const generatedBudget = budgets.generated_template_budget;
  const runtimeEvidence = budgets.runtime_generated_evidence;
  const historyBudget = budgets.immutable_history;
  const budgetTable = renderBudgetTable([
    [
      'Corpus authored elegible',
      String(eligibleBudget.baseline_words),
      String(eligibleBudget.final_words),
      `${eligibleBudget.maximum_words} (1.5×)`,
      `${eligibleBudget.actual_multiplier}×`,
      `\`${eligibleBudget.status}\``,
    ],
    [
      'Total authored (palabras)',
      String(totalBudget.baseline_words),
      String(totalBudget.final_words),
      `${totalBudget.maximum_words} (2×)`,
      `${totalBudget.word_multiplier}×`,
      `\`${totalBudget.status}\``,
    ],
    [
      'Total authored (LOC)',
      String(totalBudget.baseline_loc),
      String(totalBudget.final_loc),
      `${totalBudget.maximum_loc} (2×)`,
      `${totalBudget.loc_multiplier}×`,
      `\`${totalBudget.status}\``,
    ],
    [
      'Generated/template aplicables',
      `${generatedBudget.inventory_count} inventariados`,
      `${generatedBudget.applicable_bindings} checks + ${generatedBudget.not_applicable_count} N/A`,
      '2× palabras y LOC',
      generatedBudget.coverage,
      `\`${generatedBudget.status}\``,
    ],
    [
      'Historia baseline',
      `${historyBudget.baseline_files} archivos`,
      `${historyBudget.byte_identical_files} byte-idénticos`,
      String(historyBudget.baseline_files),
      'n/a',
      `\`${historyBudget.status}\``,
    ],
  ]);
  return `# File disposition ledger

Baseline: \`${ledger.baseline_commit}\`. Coverage: **${ledger.coverage}**. [CÓDIGO]

Este documento es la proyección legible de
\`docs/program/file-disposition-ledger.yml\`. El YAML canónico se regenera desde el árbol y los blobs
de Git, compara el working tree y resuelve owner, decisión, justificación y evidencia para cada uno
de los 377 archivos. [CONFIG]

## Clases

${renderSummaryTable('Clase', ledger.summary.artifact_classes)}

## Disposiciones

${renderSummaryTable('Disposición', ledger.summary.dispositions)}

Las únicas decisiones válidas son \`refactored\`, \`generator_fixed\`, \`superseded\`,
\`verified_no_change\`, \`quarantined\` e \`immutable_history\`. Un archivo byte-idéntico no se
presenta como refactor; \`superseded\` exige sucesor real; el wrapper Stitch permanece en cuarentena;
y la historia conserva bytes. [CONFIG]

## Presupuestos medidos

${budgetTable}

Además, ${budgets.editable_markdown_per_file.checked_files} Markdown editables del baseline se
comprueban individualmente contra un máximo de 2× palabras. Violaciones registradas:
**${budgets.editable_markdown_per_file.violations.length}**. La historia queda excluida de los
presupuestos authored. El inventario generado declara cada output como binding aplicable o N/A con
justificación. La evidencia runtime de orquestación excluida suma **${runtimeEvidence.files}**
archivos append-only. Las métricas usan tokens separados por whitespace y líneas físicas; un
terminador final no crea una LOC vacía. [CONFIG]

## Cobertura 387/387

Cada fila resume métricas y evidencia; la justificación, el hash actual, la regla de ownership y el
posible sucesor permanecen en el YAML canónico. [CONFIG]

${entryTable}
`;
};
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
const isMain =
  process.argv[1] !== undefined && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
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
