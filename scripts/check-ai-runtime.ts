import {existsSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

import {z} from 'zod';

const root = process.cwd();

const bindingSchema = z.object({
  schema_version: z.literal('harness-binding-v1'),
  harness_id: z.string(),
  allowed_profiles: z.array(z.string()),
  allowed_stages: z.array(z.string()),
  allowed_actors: z.array(z.string()),
  capabilities: z.array(z.string()),
  exclusions: z.array(z.string()),
  default_mode: z.string().optional(),
  verdict_state: z.string().optional(),
  required_verdict_hash: z.unknown().optional(),
});

const bindingPath = resolve(root, 'docs/program/token-efficiency/frames-agent-os-binding.json');

export const validateAiRuntime = (cwd = process.cwd()): string[] => {
  const errors: string[] = [];
  const dir = resolve(cwd, 'docs/program/token-efficiency');
  if (!existsSync(dir)) {
    errors.push('AI-RUNTIME-001 token-efficiency binding directory missing');
    return errors;
  }
  if (!existsSync(bindingPath)) {
    errors.push('AI-RUNTIME-002 frames-agent-os-binding.json missing');
    return errors;
  }
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(bindingPath, 'utf8'));
  } catch {
    errors.push('AI-RUNTIME-003 binding file is not valid JSON');
    return errors;
  }
  const result = bindingSchema.safeParse(raw);
  if (!result.success) {
    errors.push(`AI-RUNTIME-004 binding schema validation failed: ${result.error.message}`);
    return errors;
  }
  const binding = result.data;
  if (binding.harness_id !== 'metodologia-frames-agent-os') {
    errors.push(
      `AI-RUNTIME-005 harness_id mismatch: expected metodologia-frames-agent-os, got ${binding.harness_id}`,
    );
  }
  const requiredProfiles = [
    'frames-creation',
    'frames-engineering',
    'frames-debug-verbose',
    'frames-review',
    'frames-guardian',
  ];
  for (const profile of requiredProfiles) {
    if (!binding.allowed_profiles.includes(profile)) {
      errors.push(`AI-RUNTIME-006 missing required profile: ${profile}`);
    }
  }
  const requiredActors = ['producer', 'verifier', 'guardian'];
  for (const actor of requiredActors) {
    if (!binding.allowed_actors.includes(actor)) {
      errors.push(`AI-RUNTIME-007 missing required actor: ${actor}`);
    }
  }
  const requiredExclusions = [
    'copy and captions',
    'accessibility',
    'claims',
    'approvals',
    'brand communication',
    'contracts',
    'publication',
  ];
  for (const exclusion of requiredExclusions) {
    if (!binding.exclusions.includes(exclusion)) {
      errors.push(`AI-RUNTIME-008 missing required exclusion: ${exclusion}`);
    }
  }
  if (!binding.capabilities.includes('communication.wellbeing')) {
    errors.push('AI-RUNTIME-009 communication.wellbeing capability is mandatory');
  }
  if (binding.default_mode !== undefined && binding.default_mode !== 'off') {
    errors.push(`AI-RUNTIME-010 default_mode must be OFF, got ${binding.default_mode}`);
  }
  if (binding.verdict_state !== undefined && binding.verdict_state === 'not_benchmarked') {
    // Valid: no verdict yet, capabilities stay OFF
  } else if (binding.verdict_state !== undefined && binding.verdict_state !== 'promoted') {
    errors.push(
      `AI-RUNTIME-011 verdict_state must be not_benchmarked or promoted, got ${binding.verdict_state}`,
    );
  }
  return errors;
};

const isMain =
  process.argv[1] !== undefined && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isMain) {
  const errors = validateAiRuntime();
  if (errors.length > 0) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
  } else {
    console.info('PASS AI-RUNTIME: token-efficiency binding is valid and complete.');
  }
}
