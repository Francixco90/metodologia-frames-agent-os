/**
 * Structural lint over all on-disk receipts under `receipts/`.
 *
 * Closes ADR 008 ("Receipts and portable IDs are append-only") with a uniform
 * invariant sweep that complements — not duplicates — the existing per-family
 * validators:
 *   - check-sources.ts validates the source REGISTRY; import receipts are only
 *     path-checked there, never schema-validated.
 *   - check-dependency-audit.ts validates only the latest RCP-DEP-PRODUCTION
 *     JSON; the H03-LIC-*.yml license receipts are unchecked.
 *   - check-projects.ts validates the v2 render receipt + the migration receipt
 *     via appendOnlyEvidenceMigrationSchema; the v1 render receipt is unchecked.
 *
 * This script enforces five ADR 008 invariants across on-disk receipts:
 *   1. Parses as valid YAML or JSON.
 *   2. Declares a schema_version / schemaVersion (non-empty string or integer),
 *      or supplies the validated native Aula review contract version.
 *   3. Carries a portable ID (receipt_id | receiptId | migrationId), or the
 *      validated native Aula review filename supplies that identity.
 *   4. Any *sha256 / *Sha256 field, when a non-empty string, is 64-hex.
 *   5. append_only / appendOnly, when DECLARED, is true. Renders and migrations
 *      omit the field (append-only is a family convention there, enforced by
 *      the migration receipt's supersessions[] structure), so the lint only
 *      fails when the field is present and not true.
 */
import {existsSync, lstatSync, readdirSync, readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parse} from 'yaml';
import {validateAulaPromotionReviewV1} from '../../02_proceso/workflows/multimedia/_schema/aula-promotion-review-v1.ts';

const FAMILY_DIRS = [
  'imports',
  'renders',
  'dependency-audits',
  'migrations',
  'check-runs',
] as const;
const SHA256_KEY = /sha256$/iu;
const HEX64 = /^[a-f0-9]{64}$/u;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const loadReceipt = (root: string, rel: string): unknown => {
  const abs = resolve(root, 'receipts', rel);
  const text = readFileSync(abs, 'utf8');
  try {
    return rel.endsWith('.json') ? JSON.parse(text) : parse(text);
  } catch {
    return null;
  }
};

const findPortableId = (data: unknown): unknown => {
  if (!isPlainObject(data)) return undefined;
  return data.receipt_id ?? data.receiptId ?? data.migrationId;
};

const findSchemaVersion = (data: unknown): unknown => {
  if (!isPlainObject(data)) return undefined;
  return data.schema_version ?? data.schemaVersion;
};

const findAppendOnly = (data: unknown): boolean | null => {
  if (!isPlainObject(data)) return null;
  if (data.append_only === undefined && data.appendOnly === undefined) return null;
  return Boolean(data.append_only ?? data.appendOnly);
};

const walkSha256 = (value: unknown, trail: readonly string[]): string[] => {
  const violations: string[] = [];
  if (value === null || value === undefined) return violations;
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      violations.push(...walkSha256(item, [...trail, String(index)]));
    });
    return violations;
  }
  if (isPlainObject(value)) {
    for (const [key, child] of Object.entries(value)) {
      const nextTrail = [...trail, key];
      if (
        SHA256_KEY.test(key) &&
        typeof child === 'string' &&
        child.length > 0 &&
        !HEX64.test(child)
      ) {
        violations.push(`${nextTrail.join('.')}: valor sha256 no es 64-hex`);
      }
      violations.push(...walkSha256(child, nextTrail));
    }
  }
  return violations;
};

export const validateReceipts = (root = process.cwd()): string[] => {
  const errors: string[] = [];
  let count = 0;

  for (const family of FAMILY_DIRS) {
    const dir = resolve(root, 'receipts', family);
    if (!existsSync(dir)) {
      errors.push(`familia ausente: receipts/${family}/`);
      continue;
    }
    const files = readdirSync(dir)
      .filter((name) => /\.(json|ya?ml)$/u.test(name))
      .sort();
    for (const file of files) {
      const rel = `${family}/${file}`;
      const data = loadReceipt(root, rel);
      if (data === null) {
        errors.push(`${rel}: parse falló (YAML/JSON inválido)`);
        continue;
      }
      count++;

      let portableId = findPortableId(data);
      let schemaVersion = findSchemaVersion(data);
      const aulaReview =
        family === 'check-runs' ? /^aula-review-([0-9]{8})-([0-9]{3})\.json$/u.exec(file) : null;
      if (aulaReview) {
        try {
          const evaluationId = `aula-evaluation-${aulaReview[1]}-${aulaReview[2]}`;
          const evaluationPath = resolve(root, 'receipts', family, `${evaluationId}.json`);
          const stat = lstatSync(evaluationPath);
          if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('evaluación no regular');
          const evaluationBytes = readFileSync(evaluationPath);
          const evaluation = JSON.parse(evaluationBytes.toString('utf8')) as unknown;
          if (
            !isPlainObject(evaluation) ||
            evaluation.schemaVersion !== 'frames-aula-evaluation-v1' ||
            evaluation.receiptId !== evaluationId ||
            evaluation.appendOnly !== true
          )
            throw new Error('identidad/contrato de evaluación incompatible');
          validateAulaPromotionReviewV1(data, {
            status: evaluation.status,
            actorId: evaluation.actorId,
            sha256: createHash('sha256').update(evaluationBytes).digest('hex'),
          });
          // Native reviews deliberately have exactly four fields. Their portable
          // identity/version follow this governed filename and strict contract;
          // existing append-only bytes remain intact and all other lint still runs.
          portableId = file.slice(0, -5);
          schemaVersion = 'frames-aula-promotion-review-v1';
        } catch (error) {
          errors.push(
            `${rel}: revisión Aula nativa inválida: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
      if (portableId === undefined || portableId === null || portableId === '') {
        errors.push(`${rel}: sin portable id (receipt_id|receiptId|migrationId)`);
      }

      if (schemaVersion === undefined || schemaVersion === null || schemaVersion === '') {
        errors.push(`${rel}: sin schema_version|schemaVersion`);
      } else if (typeof schemaVersion === 'string') {
        if (schemaVersion.length === 0) errors.push(`${rel}: schema_version vacío`);
      } else if (typeof schemaVersion !== 'number' || !Number.isInteger(schemaVersion)) {
        errors.push(`${rel}: schema_version tipo inválido (string o entero esperado)`);
      }

      const appendOnly = findAppendOnly(data);
      if (appendOnly === false) {
        errors.push(`${rel}: append_only|appendOnly !== true (viola ADR 008)`);
      }

      for (const violation of walkSha256(data, [rel])) {
        errors.push(violation);
      }
    }
  }

  if (errors.length > 0) {
    errors.unshift(`FAIL RECEIPTS: ${errors.length} invariantes rotas sobre ${count} recibos.`);
    return errors;
  }
  return [];
};

const isMain =
  process.argv[1] !== undefined && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isMain) {
  const errors = validateReceipts();
  if (errors.length > 0) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
  } else {
    console.info(
      'PASS RECEIPTS: recibos on-disk cumplen ADR 008 (portable id, schema version, append-only, hash integrity).',
    );
  }
}
