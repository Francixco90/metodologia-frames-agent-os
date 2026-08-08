import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {parse} from 'yaml';

import type {QualityGateContext} from './quality-gate-types.ts';

const SHA256 = /^[a-f0-9]{64}$/u;

const digestFile = (path: string): string =>
  createHash('sha256').update(readFileSync(path)).digest('hex');

const unique = (values: string[]): boolean => new Set(values).size === values.length;

type ReceiptOutput = {
  artifact?: unknown;
  ref?: unknown;
  sha256?: unknown;
  required?: unknown;
  materialized?: unknown;
  companions?: unknown;
};

export const inspectMaterialEvidence = (
  ctx: QualityGateContext,
): {passed: boolean; detail: string} => {
  const tags = ctx.receiptPayload.evidence_tags;
  const gaps = ctx.receiptPayload.coverage_gaps;
  if (!Array.isArray(tags) || tags.length === 0 || tags.includes('coverage_gap')) {
    return {passed: false, detail: 'evidence tags absent or include coverage_gap'};
  }
  if (!Array.isArray(gaps) || gaps.length > 0) {
    return {passed: false, detail: 'coverage_gaps must be an explicit empty array'};
  }
  try {
    for (const output of ctx.outputResolutions) {
      if (!output.exists) return {passed: false, detail: `material missing: ${output.ref}`};
      const raw = readFileSync(output.stagedPath, 'utf8');
      if (/\bcoverage_gap\b/iu.test(raw)) {
        return {passed: false, detail: `coverage_gap in material: ${output.ref}`};
      }
      const document = parse(raw) as Record<string, unknown>;
      const content = document.content as Record<string, unknown> | undefined;
      const outputTags = content?.evidence_tags;
      if (
        content?.evidence_status !== 'known' ||
        !Array.isArray(outputTags) ||
        outputTags.length === 0 ||
        outputTags.includes('coverage_gap')
      ) {
        return {passed: false, detail: `unknown material evidence: ${output.ref}`};
      }
    }
  } catch (error) {
    return {passed: false, detail: `material evidence unreadable: ${String(error)}`};
  }
  return {passed: true, detail: `${ctx.outputResolutions.length} material evidence set(s) known`};
};

export const inspectOutputIntegrity = (
  ctx: QualityGateContext,
): {passed: boolean; detail: string} => {
  const receiptOutputs = Array.isArray(ctx.receiptPayload.outputs)
    ? (ctx.receiptPayload.outputs as ReceiptOutput[])
    : [];
  const declared = ctx.workflowParsed.outputs;
  const declaredArtifacts = declared.map(({artifact}) => artifact);
  const receiptArtifacts = receiptOutputs.map(({artifact}) => String(artifact));
  const receiptRefs = receiptOutputs.map(({ref}) => String(ref));
  const resolutionRefs = ctx.outputResolutions.map(({ref}) => ref);
  const cardinality =
    declared.length === receiptOutputs.length && declared.length === ctx.outputResolutions.length;
  const bijective =
    unique(declaredArtifacts) &&
    unique(receiptArtifacts) &&
    unique(receiptRefs) &&
    unique(resolutionRefs) &&
    declaredArtifacts.every((artifact) => receiptArtifacts.includes(artifact)) &&
    receiptRefs.every((ref) => resolutionRefs.includes(ref)) &&
    resolutionRefs.every((ref) => receiptRefs.includes(ref)) &&
    declared.every(
      (output, index) =>
        receiptArtifacts[index] === output.artifact && receiptRefs[index] === resolutionRefs[index],
    );
  if (!cardinality || !bijective) {
    return {passed: false, detail: 'declared, receipt and staged outputs are not bijective'};
  }

  try {
    for (const output of receiptOutputs) {
      const artifact = String(output.artifact);
      const ref = String(output.ref);
      const declaredOutput = declared.find((candidate) => candidate.artifact === artifact);
      const resolution = ctx.outputResolutions.find((candidate) => candidate.ref === ref);
      if (
        declaredOutput === undefined ||
        resolution === undefined ||
        output.required !== declaredOutput.required ||
        output.materialized !== true ||
        !resolution.exists ||
        typeof output.sha256 !== 'string' ||
        !SHA256.test(output.sha256) ||
        !SHA256.test(resolution.sha256)
      ) {
        return {passed: false, detail: `invalid output binding: ${artifact}`};
      }
      const materialHash = digestFile(resolution.stagedPath);
      if (materialHash !== output.sha256 || materialHash !== resolution.sha256) {
        return {passed: false, detail: `material hash mismatch: ${ref}`};
      }
      const receiptCompanions = Array.isArray(output.companions) ? output.companions : [];
      if (receiptCompanions.length !== 2 || resolution.companions.length !== 2) {
        return {passed: false, detail: `missing md/html companions: ${ref}`};
      }
      for (const companion of resolution.companions) {
        const receiptCompanion = receiptCompanions.find(
          (item) =>
            typeof item === 'object' &&
            item !== null &&
            (item as {ref?: unknown}).ref === companion.ref,
        ) as {sha256?: unknown; materialized?: unknown} | undefined;
        if (
          !companion.exists ||
          !['md', 'html'].includes(companion.format) ||
          !receiptCompanion ||
          receiptCompanion.materialized !== true ||
          receiptCompanion.sha256 !== companion.sha256 ||
          digestFile(companion.stagedPath) !== companion.sha256
        ) {
          return {passed: false, detail: `invalid companion binding: ${companion.ref}`};
        }
      }
    }
  } catch (error) {
    return {passed: false, detail: `material hash unavailable: ${String(error)}`};
  }
  return {passed: true, detail: `${declared.length}/${declared.length} outputs hash-bound`};
};
