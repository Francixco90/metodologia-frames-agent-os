import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {parse} from 'yaml';
import {z} from 'zod';

const manifestSchema = z.object({
  version: z.literal(1),
  policy: z.literal('one-writer-per-path'),
  writers: z.record(z.string(), z.array(z.string().min(1))),
  non_writers: z.object({
    human_approver: z.object({actor_id: z.literal('H01')}),
    guardian: z.object({may_remediate: z.literal(false)}),
  }),
});

const staticPrefix = (pattern: string): string => pattern.split(/[*?[{]/u, 1)[0] ?? '';

const patternsMayOverlap = (left: string, right: string): boolean => {
  if (left === right) return true;
  const leftPrefix = staticPrefix(left);
  const rightPrefix = staticPrefix(right);
  if (leftPrefix.length === 0 || rightPrefix.length === 0) return true;
  return leftPrefix.startsWith(rightPrefix) || rightPrefix.startsWith(leftPrefix);
};

export const validateOwnership = (root = process.cwd()): string[] => {
  const path = resolve(root, 'docs/program/ownership-manifest.yml');
  const manifest = manifestSchema.parse(parse(readFileSync(path, 'utf8')));
  const errors: string[] = [];
  const entries = Object.entries(manifest.writers).flatMap(([writer, patterns]) =>
    patterns.map((pattern) => ({writer, pattern})),
  );

  for (let leftIndex = 0; leftIndex < entries.length; leftIndex += 1) {
    const left = entries[leftIndex];
    if (!left) continue;
    for (let rightIndex = leftIndex + 1; rightIndex < entries.length; rightIndex += 1) {
      const right = entries[rightIndex];
      if (!right || left.writer === right.writer) continue;
      if (patternsMayOverlap(left.pattern, right.pattern)) {
        errors.push(
          `colisión potencial: ${left.writer}:${left.pattern} ↔ ${right.writer}:${right.pattern}`,
        );
      }
    }
  }

  const forbidden = entries.filter(({pattern}) => pattern === '**' || pattern === '**/*');
  for (const entry of forbidden) {
    errors.push(`allowlist global prohibida: ${entry.writer}:${entry.pattern}`);
  }

  return errors;
};

const errors = validateOwnership();
if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.info('PASS G04 OWNERSHIP: un writer por allowlist; H01 y Guardian son no-writers.');
}
