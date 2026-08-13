import {readFileSync, realpathSync, readdirSync} from 'node:fs';
import {isAbsolute, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

import {hashModel} from './common.ts';
import {TrainerDesignLockV1Schema} from './trainer-design-lock-v1.schema.ts';
import {contrast, hashFile, projectCss, projectTokensJson, projectTs} from './design-assets.ts';
import {
  TrainerArtifactProfilesSchema,
  TrainerAssetRightsSchema,
  TrainerMicrocopySchema,
  TrainerTokenAuthoritySchema,
} from './design-assets.schemas.ts';

const parse = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8'));
const contained = (root: string, path: string): boolean => {
  const rel = relative(realpathSync(root), realpathSync(path));
  return (
    rel !== '..' &&
    !rel.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) &&
    !isAbsolute(rel)
  );
};
const resolveRef = (repo: string, base: string, ref: string): string => {
  const path = resolve(base, ref);
  if (!contained(repo, path)) throw new Error(`TRAINER_REF_OUTSIDE_REPO:${ref}`);
  return path;
};
const lockFixture = (selectedDirectionId: string, duplicate = false) => {
  const lock = {
    schemaVersion: 'trainer-design-lock-v1',
    lockId: 'synthetic-lock',
    designLockSha256: '0'.repeat(64),
    routeSpec: {ref: 'route.json', sha256: 'a'.repeat(64)},
    decision: 'human-selected',
    selectedDirectionId,
    directions: [
      {directionId: 'a', summary: 'Direction A'},
      {directionId: duplicate ? 'a' : 'b', summary: 'Direction B'},
    ],
    decisionReceipt: {ref: 'decision.json', sha256: 'b'.repeat(64)},
    decisionActor: 'H01',
    tokens: {ref: 'tokens.json', sha256: 'c'.repeat(64)},
    components: ['shell'],
    accessibility: {contrast: 'AA', reducedMotion: true},
    publicationAuthority: false,
  };
  lock.designLockSha256 = hashModel(lock, 'designLockSha256');
  return lock;
};

export const checkDesignAssets = async (repo = process.cwd()): Promise<string[]> => {
  const failures: string[] = [];
  const directory = resolve(repo, '03_artefactos/projects/trainer-os/design');
  const authority = TrainerTokenAuthoritySchema.safeParse(
    parse(resolve(directory, 'tokens.authority.json')),
  );
  const rights = TrainerAssetRightsSchema.safeParse(
    parse(resolve(directory, 'assets-rights.json')),
  );
  const profiles = TrainerArtifactProfilesSchema.safeParse(
    parse(resolve(directory, 'artifact-profiles.json')),
  );
  const microcopy = TrainerMicrocopySchema.safeParse(parse(resolve(directory, 'microcopy.json')));
  if (!authority.success) return ['TRAINER_TOKEN_AUTHORITY_INVALID'];
  if (!rights.success) failures.push('TRAINER_ASSET_RIGHTS_INVALID');
  if (!profiles.success) failures.push('TRAINER_ARTIFACT_PROFILES_INVALID');
  if (!microcopy.success) failures.push('TRAINER_MICROCOPY_INVALID');

  const projections = [
    ['tokens.json', await projectTokensJson(authority.data), authority.data.projections.jsonSha256],
    ['tokens.css', await projectCss(authority.data), authority.data.projections.cssSha256],
    ['tokens.ts', await projectTs(authority.data), authority.data.projections.tsSha256],
  ] as const;
  for (const [name, expected, expectedHash] of projections) {
    const path = resolve(directory, name);
    if (readFileSync(path, 'utf8') !== expected) failures.push(`TRAINER_PROJECTION_DRIFT:${name}`);
    if (hashFile(path) !== expectedHash) failures.push(`TRAINER_PROJECTION_HASH_DRIFT:${name}`);
  }
  const canonical = resolveRef(repo, directory, authority.data.canonicalAuthority.ref);
  if (hashFile(canonical) !== authority.data.canonicalAuthority.sha256)
    failures.push('TRAINER_CANONICAL_AUTHORITY_DRIFT');
  if (rights.success)
    for (const receipt of rights.data.authorityReceipts)
      if (hashFile(resolveRef(repo, directory, receipt.ref)) !== receipt.sha256)
        failures.push(`TRAINER_RIGHTS_AUTHORITY_DRIFT:${receipt.kind}`);
  if (rights.success)
    for (const asset of rights.data.assets) {
      if (hashFile(resolveRef(repo, directory, asset.ref)) !== asset.sha256)
        failures.push(`TRAINER_ASSET_DRIFT:${asset.ref}`);
      if (
        asset.kind === 'font' &&
        hashFile(resolveRef(repo, directory, asset.licenseRef)) !== asset.licenseSha256
      )
        failures.push(`TRAINER_LICENSE_DRIFT:${asset.ref}`);
    }
  if (rights.success) {
    const icon = rights.data.assets.find(({kind}) => kind === 'icons');
    const manifest = parse(resolveRef(repo, directory, rights.data.authorityReceipts[1].ref)) as {
      assets?: Array<{ref?: string; sha256?: string}>;
    };
    const iconRef = relative(
      resolve(repo, '03_artefactos/brand/career-design-system'),
      resolveRef(repo, directory, icon?.ref ?? ''),
    ).replaceAll('\\', '/');
    if (
      !icon ||
      !manifest.assets?.some(({ref, sha256}) => ref === iconRef && sha256 === icon.sha256)
    )
      failures.push('TRAINER_ICON_MANIFEST_BINDING_MISSING');
  }
  const colors = authority.data.colors;
  if (
    contrast(colors.lightFocus, colors.lightSurface) < 3 ||
    contrast(colors.darkFocus, colors.darkCanvas) < 3 ||
    contrast(colors.goldText, colors.gold) < 4.5
  )
    failures.push('TRAINER_CONTRAST_INVALID');
  if (
    TrainerDesignLockV1Schema.safeParse(lockFixture('outside')).success ||
    TrainerDesignLockV1Schema.safeParse(lockFixture('a', true)).success
  )
    failures.push('TRAINER_DESIGN_LOCK_GUARD_MISSING');

  const texts = readdirSync(directory)
    .filter((name) => /\.(css|json|ts)$/u.test(name))
    .map((name) => readFileSync(resolve(directory, name), 'utf8'));
  if (/nivel[ -]?0|amaris|javimontano|\/Users\/|file:\/\//iu.test(texts.join('\n')))
    failures.push('TRAINER_NONCANONICAL_OR_PRIVATE_CONTENT');
  return failures;
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const failures = await checkDesignAssets();
  if (failures.length) {
    console.error(failures.join('\n'));
    process.exitCode = 1;
  } else
    console.info(
      'PASS TRAINER DESIGN ASSETS: authority, projections, rights, profiles and guardrails.',
    );
}
