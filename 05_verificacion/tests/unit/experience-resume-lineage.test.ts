import {createHash} from 'node:crypto';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

import {afterEach, beforeAll, describe, expect, it} from 'vitest';

import {hashExperienceValue} from 'core/contracts/index.ts';
import {resolveResumeCandidateV1} from 'workflows/core/index.ts';

type DispatchResult = {
  route_id: string;
  adapter_invoked: boolean;
  resume_error: string | null;
  experience_envelope: {interactionClass: string; selectedRoute: string | null; state: string};
};

let dispatchIntent: (input: Record<string, unknown>) => DispatchResult;
const roots: string[] = [];
const digest = (value: string): string => createHash('sha256').update(value).digest('hex');

beforeAll(async () => {
  const module = (await import(
    pathToFileURL(resolve('03_artefactos/skills/content-os-router/scripts/route-intent.mjs')).href
  )) as {dispatchIntent: typeof dispatchIntent};
  dispatchIntent = module.dispatchIntent;
});

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, {recursive: true, force: true});
});

const stateRoot = (): string => {
  const root = mkdtempSync(resolve(tmpdir(), 'frames-resume-state-'));
  roots.push(root);
  return root;
};

const material = (root: string, ref: string, bytes: string) => {
  const path = resolve(root, ref);
  mkdirSync(dirname(path), {recursive: true});
  writeFileSync(path, bytes, 'utf8');
  return {ref, sha256: digest(bytes)};
};

const writeLineage = (root: string, candidateId: string) => {
  const candidate = material(root, `candidates/${candidateId}/candidate.json`, '{}\n');
  const latestArtifact = material(root, `artifacts/${candidateId}/brief.md`, '# Brief\n');
  const receipt = material(root, `receipts/${candidateId}/invocation.json`, '{}\n');
  const draft = {
    schemaVersion: 'resume-lineage-record-v1' as const,
    candidateId,
    originRouteId: 'R6' as const,
    activeStep: 'P05',
    summary: `Continuar ${candidateId}`,
    briefKind: 'content-brief',
    candidate,
    latestArtifact,
    receipt,
  };
  const lineage = {...draft, canonicalSha256: hashExperienceValue(draft)};
  const lineagePath = resolve(root, 'lineages', candidateId, 'resume.json');
  mkdirSync(dirname(lineagePath), {recursive: true});
  writeFileSync(lineagePath, `${JSON.stringify(lineage)}\n`, 'utf8');
  return {lineage, lineagePath};
};

describe('Frames resume lineage', () => {
  it('resolves a hash-bound lineage and routes the verified candidate through R4', () => {
    const root = stateRoot();
    const {lineage} = writeLineage(root, 'CAND-001');
    const resolved = resolveResumeCandidateV1({stateRoot: root, candidateId: 'CAND-001'});
    expect(resolved).toMatchObject({
      candidateId: 'CAND-001',
      lineageSha256: lineage.canonicalSha256,
      originRouteId: 'R6',
      latestArtifact: lineage.latestArtifact,
      receipt: lineage.receipt,
    });
    expect(
      dispatchIntent({
        request: 'Continuar',
        state_root: root,
        resume_candidate_id: 'CAND-001',
      }),
    ).toMatchObject({
      route_id: 'R4',
      adapter_invoked: false,
      resume_error: null,
      experience_envelope: {interactionClass: 'RESUME_CANDIDATE', selectedRoute: 'R4'},
    });
  });

  it('rejects stale lineage material and symlink artifacts', () => {
    const staleRoot = stateRoot();
    const stale = writeLineage(staleRoot, 'CAND-STALE');
    writeFileSync(resolve(staleRoot, stale.lineage.latestArtifact.ref), '# Alterado\n', 'utf8');
    expect(() =>
      resolveResumeCandidateV1({stateRoot: staleRoot, candidateId: 'CAND-STALE'}),
    ).toThrow(/RESUME_LINEAGE_HASH_MISMATCH/u);

    const linkRoot = stateRoot();
    const linked = writeLineage(linkRoot, 'CAND-LINK');
    const artifactPath = resolve(linkRoot, linked.lineage.latestArtifact.ref);
    const external = resolve(linkRoot, 'external-brief.md');
    writeFileSync(external, readFileSync(artifactPath));
    rmSync(artifactPath);
    symlinkSync(external, artifactPath);
    expect(() => resolveResumeCandidateV1({stateRoot: linkRoot, candidateId: 'CAND-LINK'})).toThrow(
      /RESUME_LINEAGE_NOT_REGULAR/u,
    );
  });

  it('does not choose silently when multiple candidates exist without an exact id', () => {
    const root = stateRoot();
    writeLineage(root, 'CAND-A');
    writeLineage(root, 'CAND-B');
    const before = readdirSync(resolve(root, 'lineages')).sort();
    const result = dispatchIntent({request: 'Continuar', state_root: root});
    expect(result).toMatchObject({
      route_id: 'R2',
      adapter_invoked: false,
      resume_error: null,
      experience_envelope: {selectedRoute: 'R2', state: 'BLOCKED'},
    });
    expect(readdirSync(resolve(root, 'lineages')).sort()).toEqual(before);
  });
});
