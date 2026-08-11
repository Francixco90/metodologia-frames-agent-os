import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';

import type {CareerCvPackageV2} from '../_schema/document-v2.schema.ts';
import {EvidenceBankV1Schema} from '../_schema/contracts-v1.schema.ts';
import {assertCvPackageCurrent, parseCvSpec} from './cv-spec.ts';
import {parseCareerCv} from './document-model.ts';
import {assertCareerEvidence} from './evidence-gate.ts';
import {validateCareerCvAtsDocx} from './cv-docx-validation.ts';
import {
  inspectHtml,
  inspectHtmlParity,
  inspectVariantSourceBinding,
  resolvePrivateArtifact,
  sourceText,
} from './cv-package-inspection.ts';

type Status = 'PASS' | 'UNKNOWN' | 'BLOCKED';
export type CvPackageVerifyOptions = {
  projectRoot: string;
  allowedPrivateRoots?: string[];
  evidenceBank?: unknown;
  replayArtifact?: (output: CareerCvPackageV2['outputs'][number]) => Promise<Buffer>;
  htmlVerifier?: (
    buffer: Buffer,
    source: ReturnType<typeof parseCareerCv>,
    acceptance: ReturnType<typeof parseCvSpec>['acceptance'],
  ) => Promise<{issues: readonly string[]; printPageCount: number; visibleText: string}>;
  pdfVerifier?: (
    buffer: Buffer,
    source: ReturnType<typeof parseCareerCv>,
  ) => Promise<{issues: readonly string[]; extractedText: string; pageCount: number}>;
  bilingualVerifier?: (
    sources: readonly ReturnType<typeof parseCareerCv>[],
  ) => Promise<readonly string[]>;
};
export type CvPackageVerification = {
  outputs: Array<{variant_id: string; kind: string; verification: Status; issues: string[]}>;
  qa: CareerCvPackageV2['qa'];
  parity_status: Status;
  privacy_status: Status;
  promotable: boolean;
  issues: string[];
};

const sha256 = (value: Buffer): string => createHash('sha256').update(value).digest('hex');
const rank = (statuses: readonly Status[]): Status =>
  statuses.length === 0
    ? 'UNKNOWN'
    : statuses.includes('BLOCKED')
      ? 'BLOCKED'
      : statuses.includes('UNKNOWN')
        ? 'UNKNOWN'
        : 'PASS';

const privatePath = (ref: string, options: CvPackageVerifyOptions): string =>
  resolvePrivateArtifact(options.projectRoot, ref, options.allowedPrivateRoots);

export const verifyCareerCvPackageArtifacts = async (
  packageInput: unknown,
  specInput: unknown,
  options: CvPackageVerifyOptions,
): Promise<CvPackageVerification> => {
  const pkg = assertCvPackageCurrent(packageInput, specInput);
  const spec = parseCvSpec(specInput, {requireApproval: true});
  const issues: string[] = [];
  if (options.evidenceBank) {
    const bank = EvidenceBankV1Schema.parse(options.evidenceBank);
    if (bank.bank_sha256 !== pkg.evidence_bank_sha256) issues.push('EVIDENCE_BANK_STALE');
  }
  try {
    const manifestBytes = await readFile(privatePath(pkg.source_document_ref, options));
    if (sha256(manifestBytes) !== pkg.source_document_sha256) {
      issues.push('SOURCE_MANIFEST_HASH_MISMATCH');
    }
  } catch (error) {
    issues.push(
      `SOURCE_MANIFEST_BLOCKED:${error instanceof Error ? error.message : String(error)}`,
    );
  }
  const sources = new Map<string, ReturnType<typeof parseCareerCv>>();
  for (const variant of pkg.variants) {
    try {
      const sourceBytes = await readFile(privatePath(variant.source_document_ref, options));
      if (sha256(sourceBytes) !== variant.source_document_sha256) {
        throw new Error('SOURCE_VARIANT_HASH_MISMATCH');
      }
      const candidate = parseCareerCv(JSON.parse(sourceBytes.toString('utf8')));
      const specVariant = spec.variants.find(({variant_id}) => variant_id === variant.variant_id);
      if (
        candidate.schema_version !== 'career-cv-v2' ||
        candidate.variant_id !== variant.variant_id ||
        !specVariant ||
        inspectVariantSourceBinding(candidate, specVariant, spec).length > 0
      ) {
        issues.push(`SOURCE_VARIANT_BINDING_MISMATCH:${variant.variant_id}`);
      } else {
        if (options.evidenceBank) assertCareerEvidence(candidate, options.evidenceBank);
        sources.set(variant.variant_id, candidate);
      }
    } catch (error) {
      issues.push(
        `SOURCE_VARIANT_BLOCKED:${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  const observed = [] as CvPackageVerification['outputs'];
  const replayStatuses: Status[] = [];
  const accessibilityStatuses: Status[] = [];
  for (const output of pkg.outputs) {
    const outputIssues: string[] = [];
    let status: Status = 'PASS';
    try {
      const bytes = await readFile(privatePath(output.artifact_ref, options));
      if (sha256(bytes) !== output.artifact_sha256) outputIssues.push('ARTIFACT_HASH_MISMATCH');
      const variantSource = sources.get(output.variant_id);
      if (!variantSource) outputIssues.push('SOURCE_VARIANT_UNAVAILABLE');
      if (output.kind.endsWith('html')) {
        outputIssues.push(...inspectHtml(bytes.toString('utf8'), output.kind === 'ats-html'));
        if (variantSource)
          outputIssues.push(...inspectHtmlParity(bytes.toString('utf8'), variantSource));
        if (!options.htmlVerifier || !variantSource) {
          status = 'UNKNOWN';
          accessibilityStatuses.push('UNKNOWN');
        } else {
          const html = await options.htmlVerifier(bytes, variantSource, spec.acceptance);
          outputIssues.push(...html.issues);
          if (!sourceText(variantSource).every((text) => html.visibleText.includes(text))) {
            outputIssues.push('HTML_VISIBLE_DOM_PARITY_MISMATCH');
          }
          if (
            html.printPageCount >
            (variantSource.schema_version === 'career-cv-v2' ? variantSource.page_budget : 0)
          )
            outputIssues.push('HTML_PAGE_BUDGET_EXCEEDED');
          accessibilityStatuses.push(outputIssues.length ? 'BLOCKED' : 'PASS');
        }
      } else if (output.kind === 'ats-docx') {
        if (variantSource)
          outputIssues.push(...(await validateCareerCvAtsDocx(bytes, variantSource)));
      } else if (output.kind === 'ats-pdf') {
        if (!options.pdfVerifier) status = 'UNKNOWN';
        else if (variantSource) {
          const pdf = await options.pdfVerifier(bytes, variantSource);
          outputIssues.push(...pdf.issues);
          if (
            pdf.pageCount >
            (variantSource.schema_version === 'career-cv-v2' ? variantSource.page_budget : 0)
          )
            outputIssues.push('PDF_PAGE_BUDGET_EXCEEDED');
          if (!sourceText(variantSource).every((text) => pdf.extractedText.includes(text))) {
            outputIssues.push('PDF_SOURCE_PARITY_MISMATCH');
          }
        }
      }
      if (!options.replayArtifact) replayStatuses.push('UNKNOWN');
      else
        replayStatuses.push(
          (await options.replayArtifact(output)).equals(bytes) ? 'PASS' : 'BLOCKED',
        );
    } catch (error) {
      outputIssues.push(
        `ARTIFACT_UNREADABLE:${error instanceof Error ? error.message : String(error)}`,
      );
    }
    if (outputIssues.length > 0) status = 'BLOCKED';
    observed.push({...output, verification: status, issues: outputIssues});
  }
  const statuses = observed.map(({verification}) => verification);
  const material = rank(statuses);
  const claims: Status =
    sources.size === pkg.variants.length && options.evidenceBank ? 'PASS' : 'UNKNOWN';
  const bilingual = pkg.variants.some(({language}) => language !== pkg.variants[0]?.language);
  let bilingualStatus: CareerCvPackageV2['qa']['bilingual_parity'] = 'NOT_APPLICABLE';
  if (bilingual) {
    if (!options.bilingualVerifier) bilingualStatus = 'UNKNOWN';
    else
      bilingualStatus = (await options.bilingualVerifier([...sources.values()])).length
        ? 'BLOCKED'
        : 'PASS';
  }
  const qa: CareerCvPackageV2['qa'] = {
    claims,
    cross_format_parity: material,
    bilingual_parity: bilingualStatus,
    accessibility: accessibilityStatuses.length ? rank(accessibilityStatuses) : 'UNKNOWN',
    parseability: material,
    determinism: rank(replayStatuses),
  };
  issues.push(...observed.flatMap(({issues: artifactIssues}) => artifactIssues));
  const qaPass = Object.values(qa).every((s) => s === 'PASS' || s === 'NOT_APPLICABLE');
  return {
    outputs: observed,
    qa,
    parity_status: qa.cross_format_parity,
    privacy_status: issues.some((issue) => issue.includes('PRIVATE_ROOT')) ? 'BLOCKED' : 'PASS',
    promotable: issues.length === 0 && material === 'PASS' && qaPass,
    issues,
  };
};
