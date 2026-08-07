// H-E012 oracle — backfill dedup preserves meta.original_id (no duplicates). [CÓDIGO]
import {createHash} from 'node:crypto';
import {readFileSync, readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {parse} from 'yaml';

import type {Oracle, OracleOutcome} from '../lib/eval-result-schema.ts';

const ROOT = process.cwd();
const TASKS_DIR = resolve(ROOT, '04_estado/tasks');
const sha256 = (t: string): string => createHash('sha256').update(t).digest('hex');

type BackfillNote = {original_id?: string; backfilled?: boolean};

export const oracle: Oracle = {
  hypothesis_id: 'H-E012',
  run: (): OracleOutcome => {
    const checks: OracleOutcome['oracle_checks'] = [];
    const evidence: string[] = [];
    const dirs = readdirSync(TASKS_DIR, {withFileTypes: true})
      .filter((e) => e.isDirectory() && e.name.startsWith('TASK-'))
      .map((e) => e.name);
    const ids: string[] = [];
    let withOriginal = 0;
    for (const d of dirs) {
      const p = resolve(TASKS_DIR, d, 'meta/backfill-notes.yml');
      let raw: string;
      try {
        raw = readFileSync(p, 'utf8');
      } catch {
        continue;
      }
      evidence.push(sha256(raw));
      const note = parse(raw) as BackfillNote;
      if (typeof note.original_id === 'string' && note.original_id.length > 0) {
        ids.push(note.original_id);
        withOriginal += 1;
      }
    }
    checks.push({
      name: 'at least one backfill-notes with original_id',
      passed: withOriginal > 0,
      detail: `${withOriginal} note(s)`,
    });
    if (withOriginal === 0)
      return {
        status: 'skipped',
        oracle_checks: checks,
        evidence_hashes: evidence,
        notes: 'no backfill-notes found',
      };
    const unique = new Set(ids);
    const dedupOk = unique.size === ids.length;
    checks.push({
      name: `dedup: ${ids.length} ids all unique`,
      passed: dedupOk,
      detail: dedupOk ? `${unique.size} unique` : `${ids.length - unique.size} duplicates`,
    });
    return {status: dedupOk ? 'pass' : 'fail', oracle_checks: checks, evidence_hashes: evidence};
  },
};
