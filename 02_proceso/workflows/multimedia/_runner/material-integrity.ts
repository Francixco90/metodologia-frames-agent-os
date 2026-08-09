import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {parse} from 'yaml';

import type {QualityGateContext} from './quality-gate-types.ts';
import {parseFramesDeliverableMarkdown} from './deliverable-model.ts';
import {verifyDeliverableParity} from './deliverable-parity.ts';

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
      const markdown = output.companions.find(({format}) => format === 'md');
      if (!markdown?.exists) {
        return {passed: false, detail: `markdown companion missing: ${output.ref}`};
      }
      const deliverable = parseFramesDeliverableMarkdown(readFileSync(markdown.stagedPath, 'utf8'));
      if (
        deliverable.frontmatter.state !== 'RENDERED_DRAFT' ||
        deliverable.frontmatter.fields.some(({status}) => status === 'unknown')
      ) {
        return {passed: false, detail: `deliverable evidence unresolved: ${markdown.ref}`};
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
      const receiptCompanions = Array.isArray(output.companions)
        ? (output.companions as Array<{
            format?: unknown;
            ref?: unknown;
            sha256?: unknown;
            materialized?: unknown;
          }>)
        : [];
      if (receiptCompanions.length !== 2 || resolution.companions.length !== 2) {
        return {passed: false, detail: `missing md/html companions: ${ref}`};
      }
      const receiptFormats = receiptCompanions.map(({format}) => String(format)).sort();
      const resolutionFormats = resolution.companions.map(({format}) => format).sort();
      if (receiptFormats.join(',') !== 'html,md' || resolutionFormats.join(',') !== 'html,md') {
        return {passed: false, detail: `companion formats invalid: ${ref}`};
      }
      for (const companion of resolution.companions) {
        const receiptCompanion = receiptCompanions.find(
          (item) => item.ref === companion.ref && item.format === companion.format,
        );
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
      const document = parse(readFileSync(resolution.stagedPath, 'utf8')) as {
        content?: {markdown_ref?: string; html_ref?: string; content_sha256?: string};
      };
      const markdown = resolution.companions.find(({format}) => format === 'md')!;
      const html = resolution.companions.find(({format}) => format === 'html')!;
      const markdownText = readFileSync(markdown.stagedPath, 'utf8');
      const htmlText = readFileSync(html.stagedPath, 'utf8');
      const parsedMarkdown = parseFramesDeliverableMarkdown(markdownText);
      if (
        document.content?.markdown_ref !== markdown.ref ||
        document.content.html_ref !== html.ref ||
        document.content.content_sha256 !== parsedMarkdown.frontmatter.content_sha256 ||
        verifyDeliverableParity(markdownText, htmlText).status !== 'PASS'
      ) {
        return {passed: false, detail: `semantic companion mismatch: ${ref}`};
      }
    }
  } catch (error) {
    return {passed: false, detail: `material hash unavailable: ${String(error)}`};
  }
  return {passed: true, detail: `${declared.length}/${declared.length} outputs hash-bound`};
};
