import {createHash} from 'node:crypto';
import {mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';

import {parse} from 'yaml';
import {describe, expect, it} from 'vitest';

import {CareerDeliverableRegistryV1Schema} from '../../../02_proceso/workflows/career/_schema/registry-v1.schema.ts';
import {
  checkCareerMigrationAuthorities,
  checkCareerTemplateAuthorities,
} from '../../scripts/lib/check-career-template-authority.ts';

const ROOT = process.cwd();
const registry = CareerDeliverableRegistryV1Schema.parse(
  parse(
    readFileSync(
      resolve(ROOT, '02_proceso/workflows/career/_assets/deliverable-registry.yml'),
      'utf8',
    ),
  ),
);
const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');

describe('Career template and migration authority', () => {
  it('accepts the canonical regular files and exact byte hashes', () => {
    const errors: string[] = [];
    checkCareerTemplateAuthorities(ROOT, registry.template_authorities, errors);
    checkCareerMigrationAuthorities(ROOT, registry.migration_authorities, errors);
    expect(errors).toEqual([]);
  });

  it('rejects symlink aliases and hash drift before they can become authority', () => {
    const temporary = mkdtempSync(resolve(tmpdir(), 'career-authority-'));
    try {
      mkdirSync(resolve(temporary, 'alias'));
      writeFileSync(resolve(temporary, 'legacy.md'), 'legacy bytes', 'utf8');
      symlinkSync('../legacy.md', resolve(temporary, 'alias/cv-source-v2.template.md'));

      const symlinkErrors: string[] = [];
      checkCareerTemplateAuthorities(
        temporary,
        [
          {
            template_ref: 'alias/cv-source-v2.template.md',
            template_sha256: sha256('legacy bytes'),
          },
        ],
        symlinkErrors,
      );
      expect(symlinkErrors.join('\n')).toContain('CAREER-AUTHORITY-001 non-regular');

      const driftErrors: string[] = [];
      checkCareerTemplateAuthorities(
        temporary,
        [{template_ref: 'legacy.md', template_sha256: '0'.repeat(64)}],
        driftErrors,
      );
      expect(driftErrors.join('\n')).toContain('CAREER-AUTHORITY-002 hash drift');
    } finally {
      rmSync(temporary, {recursive: true, force: true});
    }
  });

  it('rejects renamed copies and legacy display aliases even when bytes match', () => {
    const renamed = structuredClone(registry);
    const source = renamed.definitions.find(
      ({deliverable_id}) => deliverable_id === 'cv-source-v2',
    )!;
    const authority = renamed.template_authorities.find(
      ({template_ref}) => template_ref === source.template_ref,
    )!;
    source.template_ref = 'renamed/cv-source-current.template.md';
    renamed.template_authorities.push({...authority, template_ref: source.template_ref});
    expect(CareerDeliverableRegistryV1Schema.safeParse(renamed).success).toBe(false);

    const displayAlias = structuredClone(registry);
    displayAlias.definitions.find(
      ({deliverable_id}) => deliverable_id === 'cv-source-v2',
    )!.display_name = 'CV Source';
    expect(CareerDeliverableRegistryV1Schema.safeParse(displayAlias).success).toBe(false);
  });

  it('rejects missing, renamed and wrong-identity migrators', () => {
    for (const ref of [
      'missing/not-a-migrator.ts',
      '02_proceso/workflows/career/_runner/cv-package-v3.ts',
    ]) {
      const hostile = structuredClone(registry);
      const lifecycle = hostile.versioned_contract_lifecycle.find(
        ({deliverable_id}) => deliverable_id === 'cv-spec-v1',
      )!;
      const authority = hostile.migration_authorities.find(
        ({deliverable_id}) => deliverable_id === 'cv-spec-v1',
      )!;
      if ('ref' in lifecycle.migration) lifecycle.migration.ref = ref;
      authority.ref = ref;
      expect(CareerDeliverableRegistryV1Schema.safeParse(hostile).success).toBe(false);
    }
  });

  it('rejects migration symlinks, missing paths and stale executable bytes', () => {
    const temporary = mkdtempSync(resolve(tmpdir(), 'career-migration-authority-'));
    try {
      writeFileSync(resolve(temporary, 'migrator.ts'), 'export const migrate = true;', 'utf8');
      symlinkSync('migrator.ts', resolve(temporary, 'alias.ts'));
      const errors: string[] = [];
      checkCareerMigrationAuthorities(
        temporary,
        [
          {
            deliverable_id: 'cv-spec-v1',
            ref: 'alias.ts',
            ref_sha256: sha256('export const migrate = true;'),
          },
          {deliverable_id: 'cv-package-v2', ref: 'missing.ts', ref_sha256: '0'.repeat(64)},
          {deliverable_id: 'cv-source-v1', ref: 'migrator.ts', ref_sha256: '0'.repeat(64)},
        ],
        errors,
      );
      expect(errors.join('\n')).toContain('non-regular migration:cv-spec-v1');
      expect(errors.join('\n')).toContain('missing migration:cv-package-v2');
      expect(errors.join('\n')).toContain('hash drift migration:cv-source-v1');
    } finally {
      rmSync(temporary, {recursive: true, force: true});
    }
  });
});
