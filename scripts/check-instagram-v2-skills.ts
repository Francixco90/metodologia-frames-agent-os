import {createHash} from 'node:crypto';
import {existsSync, readFileSync, readdirSync, statSync} from 'node:fs';
import {join, relative, resolve} from 'node:path';

import {parse} from 'yaml';

const root = process.cwd();
const sha256 = (value: Buffer | string): string => createHash('sha256').update(value).digest('hex');
const portable = (value: string): string => value.replaceAll('\\', '/');
const fileSha256 = (path: string): string => sha256(readFileSync(resolve(root, path)));
const readYaml = (path: string): unknown => parse(readFileSync(resolve(root, path), 'utf8'));

const skills = [
  {
    id: 'metodologia-brand-router',
    scope: 'internal-brand-routing',
    productionStatus: 'publication_blocked',
    positive: 'fixtures/positive/route.yml',
    negative: 'fixtures/negative/stale-profile.yml',
    requiredTerms: ['BrandProfileV2', 'VoiceProfileV2', 'ChannelProfileV1', 'pnpm verify:brand'],
  },
  {
    id: 'instagram-content-orchestration',
    scope: 'local-orchestration',
    productionStatus: 'publication_blocked',
    positive: 'fixtures/positive/carousel-run.yml',
    negative: 'fixtures/negative/concurrency.yml',
    requiredTerms: ['2+2+1', 'veinte evaluaciones', 'RT-09', 'ITERATION_BUDGET_EXCEEDED'],
  },
  {
    id: 'instagram-carousel-production',
    scope: 'local-candidate-production',
    productionStatus: 'publication_blocked',
    positive: 'fixtures/positive/eight-card-pilot.yml',
    negative: 'fixtures/negative/orphan-claim.yml',
    requiredTerms: ['pnpm carousel:build', 'RT-09', 'WORKFLOW_PILOT_REVIEW', 'alt text'],
  },
  {
    id: 'remotion-video-production-v2',
    scope: 'local-design-and-validation',
    productionStatus: 'blocked_license_coverage_gap',
    positive: 'fixtures/positive/v2-adapter.yml',
    negative: 'fixtures/negative/production-license.yml',
    requiredTerms: [
      'ContentWorkOrderV2',
      'CandidatePackageV2',
      'remotion-video-production/SKILL.md',
      'bloqueado',
    ],
  },
  {id: 'metodologia-certificate-builder', scope: 'local-candidate-production', productionStatus: 'publication_blocked', positive: 'fixtures/positive/embajador-batch.yml', negative: 'fixtures/negative/hours-mismatch.yml', requiredTerms: ['cb', 'cv', 'RENDERED_DRAFT', 'coverage_gap', 'work/private']},
] as const;

type RegistryEntry = {
  skill_id?: string;
  version?: string;
  current_state?: string;
  content_sha256?: string;
  package_manifest_sha256?: string;
  package_manifest_algorithm?: string;
  lineage?: string;
  content_license?: string;
  content_license_evidence?: {
    text_ref?: string;
    text_sha256?: string;
    receipt_ref?: string;
    receipt_sha256?: string;
  };
  execution_scope?: string;
  production_runtime_status?: string;
  tests?: string[];
  event_ids?: string[];
};

type RegistryEvent = {
  event_id?: string;
  event_order?: number;
  skill_id?: string;
  content_sha256?: string;
  transition?: {from?: string | null; to?: string};
};

const walk = (directory: string): string[] =>
  readdirSync(directory).flatMap((name) => {
    const child = join(directory, name);
    return statSync(child).isDirectory() ? walk(child) : [child];
  });

const packageDigest = (skillRoot: string): string => {
  const absoluteRoot = resolve(root, skillRoot);
  const manifest = `${walk(absoluteRoot)
    .sort()
    .map((path) => `${sha256(readFileSync(path))}  ${portable(relative(absoluteRoot, path))}`)
    .join('\n')}\n`;
  return sha256(manifest);
};

const registry = readYaml('registries/skills/skill-registry.yml') as {
  mutation_policy?: string;
  entries?: RegistryEntry[];
  events?: RegistryEvent[];
};
const errors: string[] = [];
const licenseTextRef =
  'skills/remotion-video-production/licenses/LicenseRef-MetodologIA-Internal.md';
const licenseReceiptRef = 'skills/instagram-v2-content-license-receipt.yml';
const expectedLicenseTextHash = fileSha256(licenseTextRef);
const expectedLicenseReceiptHash = fileSha256(licenseReceiptRef);

if (!registry.mutation_policy?.includes('append-only')) {
  errors.push('SKL-V2-001 registry must remain append-only');
}

for (const skill of skills) {
  const skillRoot = `skills/${skill.id}`;
  const skillPath = `${skillRoot}/SKILL.md`;
  const lineagePath = `${skillRoot}/LINEAGE.yml`;
  for (const path of [
    skillPath,
    lineagePath,
    `${skillRoot}/${skill.positive}`,
    `${skillRoot}/${skill.negative}`,
  ]) {
    if (!existsSync(resolve(root, path))) errors.push(`SKL-V2-002 missing ${path}`);
  }
  if (!existsSync(resolve(root, skillPath)) || !existsSync(resolve(root, lineagePath))) continue;

  const text = readFileSync(resolve(root, skillPath), 'utf8');
  const frontmatterMatch = text.match(/^---\n([\s\S]*?)\n---\n/u);
  if (frontmatterMatch === null) {
    errors.push(`SKL-V2-003 ${skill.id}: frontmatter missing`);
    continue;
  }
  const frontmatter = parse(frontmatterMatch[1] ?? '') as {
    name?: string;
    description?: string;
    version?: string;
    license?: string;
    metadata?: {lifecycle_state?: string; execution_scope?: string};
  };
  if (
    frontmatter.name !== skill.id ||
    frontmatter.version !== '0.1.0' ||
    frontmatter.license !== 'LicenseRef-MetodologIA-Internal' ||
    !frontmatter.description?.startsWith('This skill should be used when') ||
    frontmatter.metadata?.lifecycle_state !== 'active' ||
    frontmatter.metadata.execution_scope !== skill.scope
  ) {
    errors.push(`SKL-V2-003 ${skill.id}: frontmatter contract mismatch`);
  }
  if (text.split(/\s+/u).length > 1_200) {
    errors.push(`SKL-V2-004 ${skill.id}: progressive-disclosure budget exceeded`);
  }
  for (const term of skill.requiredTerms) {
    if (!text.includes(term)) errors.push(`SKL-V2-005 ${skill.id}: missing ${term}`);
  }
  if (/\/Users\/|\/home\/|[A-Za-z]:\\Users\\/u.test(text)) {
    errors.push(`SKL-V2-006 ${skill.id}: absolute locator forbidden`);
  }

  const lineage = readYaml(lineagePath) as {
    skill_id?: string;
    version?: string;
    content_origin?: string;
    lifecycle_state?: string;
    execution_scope?: string;
    authority_refs?: string[];
    external_fragments_reused?: boolean;
    publication_authority?: boolean;
  };
  if (
    lineage.skill_id !== skill.id ||
    lineage.version !== '0.1.0' ||
    !lineage.content_origin?.startsWith('locally_authored') ||
    lineage.lifecycle_state !== 'active' ||
    lineage.execution_scope !== skill.scope ||
    lineage.external_fragments_reused !== false ||
    lineage.publication_authority !== false
  ) {
    errors.push(`SKL-V2-007 ${skill.id}: lineage contract mismatch`);
  }
  for (const reference of lineage.authority_refs ?? []) {
    if (
      reference.startsWith('/') ||
      reference.includes('..') ||
      !existsSync(resolve(root, reference))
    ) {
      errors.push(`SKL-V2-008 ${skill.id}: unresolved authority ref ${reference}`);
    }
  }

  const entry = registry.entries?.find(({skill_id}) => skill_id === skill.id);
  const contentHash = sha256(text);
  const manifestHash = packageDigest(skillRoot);
  if (
    entry?.version !== '0.1.0' ||
    entry.current_state !== 'active' ||
    entry.content_sha256 !== contentHash ||
    entry.package_manifest_sha256 !== manifestHash ||
    entry.package_manifest_algorithm !==
      'sha256_of_sorted_sha256_double_space_relative_path_lines' ||
    entry.lineage !== lineagePath ||
    entry.content_license !== 'LicenseRef-MetodologIA-Internal' ||
    entry.content_license_evidence?.text_ref !== licenseTextRef ||
    entry.content_license_evidence.text_sha256 !== expectedLicenseTextHash ||
    entry.content_license_evidence.receipt_ref !== licenseReceiptRef ||
    entry.content_license_evidence.receipt_sha256 !== expectedLicenseReceiptHash ||
    entry.execution_scope !== skill.scope ||
    entry.production_runtime_status !== skill.productionStatus ||
    !entry.tests?.includes('pnpm verify:skills')
  ) {
    errors.push(`SKL-V2-009 ${skill.id}: active registry binding mismatch`);
  }

  const events = (registry.events ?? [])
    .filter(({skill_id}) => skill_id === skill.id)
    .sort((left, right) => (left.event_order ?? 0) - (right.event_order ?? 0));
  const expectedTransitions = [
    [null, 'candidate'],
    ['candidate', 'quarantined'],
    ['quarantined', 'evaluated'],
    ['evaluated', 'active'],
  ];
  if (
    events.length !== 4 ||
    events.some(
      (event, index) =>
        event.event_order !== index + 1 ||
        event.content_sha256 !== contentHash ||
        event.transition?.from !== expectedTransitions[index]?.[0] ||
        event.transition?.to !== expectedTransitions[index]?.[1] ||
        !entry?.event_ids?.includes(event.event_id ?? ''),
    )
  ) {
    errors.push(`SKL-V2-010 ${skill.id}: lifecycle chain mismatch`);
  }
}

const licenseReceipt = readYaml(licenseReceiptRef) as {
  append_only?: boolean;
  applies_to?: {package_refs?: string[]};
  permissions?: {publication?: string};
};
if (
  licenseReceipt.append_only !== true ||
  licenseReceipt.permissions?.publication !== 'forbidden_without_explicit_gate' ||
  JSON.stringify(licenseReceipt.applies_to?.package_refs) !==
    JSON.stringify(skills.map(({id}) => `skills/${id}`))
) {
  errors.push('SKL-V2-011 shared content-license receipt mismatch');
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.info(
    'PASS SKILLS V2: brand, orchestration, carousel and Remotion compatibility skills are hash-bound.',
  );
}
