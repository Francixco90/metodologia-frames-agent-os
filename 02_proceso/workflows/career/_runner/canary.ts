import {resolve} from 'node:path';

import {runCareerBriefFirst, type CareerRunnerResult} from './career-runner.ts';
import {renderCareerPdf, type CareerPdfManifestV1} from './pdf-adapter.ts';

export type CareerCanaryV1 = {
  schema_version: 'career-canary-v1';
  status: 'PASS' | 'UNKNOWN' | 'BLOCKED';
  route: CareerRunnerResult;
  pdf: CareerPdfManifestV1;
  replay_match: boolean;
  next_gate: 'CR_BRIEF_APPROVED';
  external_effects: 'none';
  gaps: string[];
};

export const runCareerCanary = async (root: string): Promise<CareerCanaryV1> => {
  const outputDirectory = resolve(root, 'work/private/career/canary');
  const input = {
    root,
    outputDirectory,
    route: {
      request: 'Crear un CV general evidence-first para un rol de producto',
      candidateId: 'CAND-SYNTHETIC-CANARY',
      targetRole: 'Product Manager',
      language: 'es' as const,
      profileReady: true,
      evidenceReady: true,
    },
  };
  const first = runCareerBriefFirst(input);
  const second = runCareerBriefFirst(input);
  const replayMatch =
    first.brief.content_sha256 === second.brief.content_sha256 &&
    first.brief.html_sha256 === second.brief.html_sha256;
  const pdf = await renderCareerPdf({
    root,
    htmlPath: resolve(outputDirectory, 'brief.html'),
    pdfPath: resolve(outputDirectory, 'brief.pdf'),
    manifestPath: resolve(outputDirectory, 'brief-pdf-manifest.json'),
  });
  const gaps = [...(!replayMatch ? ['brief_replay_mismatch'] : []), ...pdf.gaps];
  const status = !replayMatch || pdf.status === 'BLOCKED' ? 'BLOCKED' : pdf.status;
  return {
    schema_version: 'career-canary-v1',
    status,
    route: second,
    pdf,
    replay_match: replayMatch,
    next_gate: 'CR_BRIEF_APPROVED',
    external_effects: 'none',
    gaps,
  };
};
