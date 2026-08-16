import {createHash} from 'node:crypto';
import {mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';

import {afterEach, describe, expect, it} from 'vitest';

import {
  assertCaseLongformPreflight,
  caseLongformSourceSetSha256,
  CaseLongformPreflightSchema,
} from 'workflows/video-os/index.ts';
import {readCaseLongformMaterial} from 'workflows/video-os/_runner/case-longform-media.ts';
import {caseFixtureMediaToolAuthority} from './video-os-case-longform-tool-fixture.test.ts';

type Ref = {ref: string; sha256: string; bytes: number};
const temporary: string[] = [];
const measurements = {
  width: 1920,
  height: 1080,
  fps: 24,
  frame_count: 24,
  duration_ms: 1000,
  video_streams: 1,
  audio_streams: 1,
} as const;
const roles = ['intro', 'host', 'body', 'closure', 'outro'] as const;
const hash = (bytes: Buffer): string => createHash('sha256').update(bytes).digest('hex');
const refFor = (root: string, ref: string): Ref => {
  const bytes = readFileSync(resolve(root, ref));
  return {ref, sha256: hash(bytes), bytes: bytes.byteLength};
};
const writeJson = (root: string, ref: string, value: unknown): Ref => {
  writeFileSync(resolve(root, ref), `${JSON.stringify(value)}\n`);
  return refFor(root, ref);
};
const makeMedia = (root: string, ref: string, color: string, frequency: number): Ref => {
  const result = spawnSync(
    'ffmpeg',
    [
      '-v',
      'error',
      '-f',
      'lavfi',
      '-i',
      `color=c=${color}:s=1920x1080:r=24:d=1`,
      '-f',
      'lavfi',
      '-i',
      `sine=frequency=${frequency}:sample_rate=48000:duration=1`,
      '-map',
      '0:v:0',
      '-map',
      '1:a:0',
      '-c:v',
      'mpeg4',
      '-q:v',
      '5',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      '-shortest',
      '-y',
      resolve(root, ref),
    ],
    {encoding: 'utf8'},
  );
  if (result.status !== 0) throw new Error(result.stderr);
  return refFor(root, ref);
};

const materialize = () => {
  const projectRoot = mkdtempSync(resolve(tmpdir(), 'case-project-'));
  const authorityRoot = mkdtempSync(resolve(tmpdir(), 'case-authority-'));
  const previewVerifierRoot = mkdtempSync(resolve(tmpdir(), 'case-preview-verifier-'));
  temporary.push(projectRoot, authorityRoot, previewVerifierRoot);
  const actors = {
    producer: 'ACTOR-PRODUCER',
    authority: 'ACTOR-AUTHORITY',
    preview_verifier: 'ACTOR-PREVIEW-VERIFIER',
  };
  const origins = [
    'metodologia_generated',
    'local_recording',
    'verified_derivative',
    'verified_derivative',
    'metodologia_generated',
  ] as const;
  const colors = ['black', 'blue', 'green', 'red', 'white'];
  const staged = roles.map((role, index) => {
    const source_id = `SOURCE-${role.toUpperCase()}`;
    const media = makeMedia(projectRoot, `${role}.mp4`, colors[index]!, 400 + index * 40);
    const provenance_receipt = writeJson(authorityRoot, `${role}-provenance.json`, {
      schema_version: 'source-provenance-v1',
      kind: 'source_provenance',
      role,
      source_id,
      source_sha256: media.sha256,
      origin: origins[index],
      statement: `${role} fixture`,
      actor_id: actors.authority,
    });
    const authority_receipt = writeJson(authorityRoot, `${role}-authority.json`, {
      schema_version: 'source-authority-v1',
      kind: 'source_authority',
      role,
      source_id,
      source_sha256: media.sha256,
      provenance_sha256: provenance_receipt.sha256,
      authority: 'verified',
      rights: 'cleared',
      consent: 'confirmed',
      actor_id: actors.authority,
    });
    return {role, source_id, media, provenance_receipt, authority_receipt};
  });
  const sourceSetSha = caseLongformSourceSetSha256(staged);
  const jobId = 'VIDEO-SYNTHETIC-PREFLIGHT';
  const plan = writeJson(projectRoot, 'plan.json', {
    schema_version: 'case-longform-plan-v1',
    kind: 'case_longform_plan',
    revision: 'V00',
    job_id: jobId,
    source_set_sha256: sourceSetSha,
    primary_format: '16:9',
    frozen: true,
    actor_id: actors.producer,
  });
  const sources = staged.map((item) => ({
    ...item,
    freeze_receipt: writeJson(projectRoot, `${item.role}-freeze.json`, {
      schema_version: 'source-freeze-v1',
      kind: 'source_freeze',
      revision: 'V00',
      job_id: jobId,
      plan_sha256: plan.sha256,
      source_set_sha256: sourceSetSha,
      role: item.role,
      source_id: item.source_id,
      source_sha256: item.media.sha256,
      provenance_sha256: item.provenance_receipt.sha256,
      authority_sha256: item.authority_receipt.sha256,
      measurements,
      frozen: true,
      actor_id: actors.producer,
    }),
  }));
  const preview = makeMedia(projectRoot, 'preview.mp4', 'yellow', 700);
  const build = writeJson(previewVerifierRoot, 'preview-build.json', {
    schema_version: 'preview-build-v1',
    kind: 'preview_build',
    revision: 'V01',
    job_id: jobId,
    plan_sha256: plan.sha256,
    source_set_sha256: sourceSetSha,
    preview_sha256: preview.sha256,
    measurements,
    verifier_actor_id: actors.preview_verifier,
    verdict: 'PASS',
  });
  const contract = CaseLongformPreflightSchema.parse({
    schema_version: 'case-longform-preflight-v1',
    job_id: jobId,
    primary_format: '16:9',
    plan,
    sources,
    preview: {media: preview, build_receipt: build},
    actors,
    status: 'BLOCKED_PENDING_EVIDENCE_CONTRACTS',
  });
  const options = {
    projectRoot,
    mediaToolAuthority: caseFixtureMediaToolAuthority(),
    trustPolicy: {
      authorityRoot,
      previewVerifierRoot,
      trustedAuthorityActorIds: [actors.authority],
      trustedPreviewVerifierActorIds: [actors.preview_verifier],
    },
  };
  return {contract, options};
};

afterEach(() =>
  temporary.splice(0).forEach((path) => rmSync(path, {recursive: true, force: true})),
);

describe('case-longform V00/V01 material preflight', () => {
  it('binds the exact five-role source set and remains blocked', () => {
    const {contract, options} = materialize();
    const result = assertCaseLongformPreflight(contract, options);
    expect(result.sources.map(({role}) => role)).toEqual(roles);
    expect(result.status).toBe('BLOCKED_PENDING_EVIDENCE_CONTRACTS');
    expect(result).not.toHaveProperty('render');
  });

  it('rejects a fake ftyp preview', () => {
    const {contract, options} = materialize();
    const fake = Buffer.concat([Buffer.from([0, 0, 0, 12]), Buffer.from('ftypfake')]);
    writeFileSync(resolve(options.projectRoot, contract.preview.media.ref), fake);
    Object.assign(contract.preview.media, {sha256: hash(fake), bytes: fake.byteLength});
    expect(() => assertCaseLongformPreflight(contract, options)).toThrow(/MEDIA-PROBE-FAILED/u);
  });

  it('rejects a Matroska container renamed with an mp4 suffix', () => {
    const {contract, options} = materialize();
    const disguised = makeMedia(options.projectRoot, 'disguised.mkv', 'purple', 760);
    const previewPath = resolve(options.projectRoot, contract.preview.media.ref);
    renameSync(resolve(options.projectRoot, disguised.ref), previewPath);
    Object.assign(contract.preview.media, refFor(options.projectRoot, contract.preview.media.ref));
    expect(() => assertCaseLongformPreflight(contract, options)).toThrow(/CONTAINER-NOT-MP4/u);
  });

  it('rejects a path substitution after opening hash-bound bytes', () => {
    const root = mkdtempSync(resolve(tmpdir(), 'case-toctou-'));
    temporary.push(root);
    writeFileSync(resolve(root, 'material.bin'), Buffer.alloc(1024, 1));
    const ref = refFor(root, 'material.bin');
    expect(() =>
      readCaseLongformMaterial(root, ref, {
        afterOpen: (path) => {
          renameSync(path, `${path}.opened`);
          writeFileSync(path, Buffer.alloc(1024, 2));
        },
      }),
    ).toThrow(/MATERIAL-IDENTITY-DRIFT/u);
  });

  it('rejects unknown authority and incomplete source topology', () => {
    const {contract, options} = materialize();
    const body = contract.sources[2];
    const forged = writeJson(options.trustPolicy.authorityRoot, body.authority_receipt.ref, {
      schema_version: 'source-authority-v1',
      kind: 'source_authority',
      role: body.role,
      source_id: body.source_id,
      source_sha256: body.media.sha256,
      provenance_sha256: body.provenance_receipt.sha256,
      authority: 'unknown',
      rights: 'unknown',
      consent: 'unknown',
      actor_id: contract.actors.authority,
    });
    Object.assign(body.authority_receipt, forged);
    expect(() => assertCaseLongformPreflight(contract, options)).toThrow();
    expect(() =>
      CaseLongformPreflightSchema.parse({...contract, sources: contract.sources.slice(1)}),
    ).toThrow();
  });

  it('rejects actor aliasing and post-render fields', () => {
    const {contract, options} = materialize();
    contract.actors.preview_verifier = contract.actors.producer;
    options.trustPolicy.trustedPreviewVerifierActorIds = [contract.actors.producer];
    expect(() => assertCaseLongformPreflight(contract, options)).toThrow(/ACTORS-NOT-INDEPENDENT/u);
    expect(() => CaseLongformPreflightSchema.parse({...contract, render: {}})).toThrow();
  });

  it('rejects untrusted actors and nested trust roots', () => {
    const untrusted = materialize();
    untrusted.options.trustPolicy.trustedAuthorityActorIds = [];
    expect(() => assertCaseLongformPreflight(untrusted.contract, untrusted.options)).toThrow(
      /UNTRUSTED-ACTOR/u,
    );
    const nested = materialize();
    const nestedAuthority = resolve(nested.options.projectRoot, 'nested-authority');
    mkdirSync(nestedAuthority);
    nested.options.trustPolicy.authorityRoot = nestedAuthority;
    expect(() => assertCaseLongformPreflight(nested.contract, nested.options)).toThrow(
      /TRUST-ROOT-OVERLAP/u,
    );
  });
});
