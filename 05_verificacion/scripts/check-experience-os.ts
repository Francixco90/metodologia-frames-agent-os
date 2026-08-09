import {createHash} from 'node:crypto';
import {existsSync, lstatSync, readdirSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {parse} from 'yaml';

import {ExperienceReleaseCapsuleV1Schema} from '../../02_proceso/core/contracts/experience-release-v1.ts';
import {
  checkBlueprintParity,
  verifyReleaseCapsule,
} from '../../02_proceso/workflows/experience/index.ts';

const ROOT = process.cwd();
const EXPECTED_COMPONENTS = [
  'ArtifactGallery',
  'BriefPreview',
  'ConciseMenu',
  'DecisionGate',
  'EvidenceGapCard',
  'IntentSummary',
  'ProgressStepper',
  'QualityStatus',
  'RecoveryCard',
  'ResumeCard',
  'WelcomeCard',
];

type ComponentRegistry = {
  policy?: Record<string, unknown>;
  components?: {id?: string}[];
};
type Microcopy = {
  identity?: string;
  budgets?: {blocking_questions_max?: number};
  messages?: {welcome?: {options?: string[]}};
};
type SourceLock = {projection_ref?: string; projection_sha256?: string; scope?: string};
const sha256 = (value: Buffer | string): string => createHash('sha256').update(value).digest('hex');

const validateReleaseVault = (root: string): string[] => {
  const errors: string[] = [];
  const vault = resolve(root, '04_estado/releases/experience');
  if (!existsSync(vault)) return errors;
  for (const entry of readdirSync(vault).sort()) {
    const path = resolve(vault, entry);
    if (entry === 'README.md') continue;
    if (!lstatSync(path).isDirectory() || lstatSync(path).isSymbolicLink()) {
      errors.push(`EXP-VAULT001 invalid entry ${entry}`);
      continue;
    }
    try {
      const manifest = ExperienceReleaseCapsuleV1Schema.parse(
        JSON.parse(readFileSync(resolve(path, 'release-manifest.json'), 'utf8')),
      );
      if (manifest.status !== 'APPROVED') errors.push(`EXP-VAULT002 ${entry} is not APPROVED`);
      const report = verifyReleaseCapsule(path, root);
      if (!report.ok)
        errors.push(...report.errors.map((error) => `EXP-VAULT003 ${entry}:${error}`));
    } catch (error) {
      errors.push(
        `EXP-VAULT004 ${entry}:${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  return errors;
};

export const checkExperienceOs = (root = ROOT): string[] => {
  const errors: string[] = [];
  const experienceRoot = resolve(root, '02_proceso/workflows/experience');
  const registry = parse(
    readFileSync(resolve(experienceRoot, 'component-registry.yml'), 'utf8'),
  ) as ComponentRegistry;
  const microcopy = parse(
    readFileSync(resolve(experienceRoot, 'microcopy.es.yml'), 'utf8'),
  ) as Microcopy;
  const sourceLock = parse(
    readFileSync(resolve(experienceRoot, 'pivote-source-lock.yml'), 'utf8'),
  ) as SourceLock;
  const components = (registry.components ?? []).map(({id}) => id ?? '').sort();
  if (components.join('\n') !== EXPECTED_COMPONENTS.join('\n')) {
    errors.push('EXP-COMPONENT001 registry must contain the exact 11-component allowlist');
  }
  if (
    registry.policy?.composition !== 'allowlist_only' ||
    registry.policy?.remote_code !== 'forbidden' ||
    registry.policy?.text_fallback !== 'required'
  ) {
    errors.push('EXP-COMPONENT002 unsafe composition policy');
  }
  if (microcopy.identity !== 'Frames ContentOS · por MetodologIA') {
    errors.push('EXP-COPY001 visible identity drift');
  }
  if (microcopy.budgets?.blocking_questions_max !== 3) {
    errors.push('EXP-COPY002 blocking question budget drift');
  }
  if (microcopy.messages?.welcome?.options?.join('|') !== 'Crear|Mejorar|Planear|Explorar') {
    errors.push('EXP-COPY003 welcome menu drift');
  }
  if (
    sourceLock.scope !== 'experience_os_only' ||
    sourceLock.projection_ref === undefined ||
    sourceLock.projection_sha256 === undefined ||
    sha256(readFileSync(resolve(root, sourceLock.projection_ref))) !== sourceLock.projection_sha256
  ) {
    errors.push('EXP-SOURCE001 PIVOTE projection lock drift');
  }
  const parity = checkBlueprintParity(root);
  if (!parity.ok) errors.push(...parity.errors.map((error) => `EXP-PARITY001 ${error}`));
  errors.push(...validateReleaseVault(root));
  return errors;
};

const errors = checkExperienceOs();
if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.info(
    'PASS G09_EXPERIENCE: gateway assets, GenUI allowlist, blueprint parity and release vault.',
  );
}
