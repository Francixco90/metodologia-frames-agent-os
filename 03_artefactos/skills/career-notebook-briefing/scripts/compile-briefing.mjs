#!/usr/bin/env node
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

const HASH = /^[a-f0-9]{64}$/u;
const capabilities = new Set(['READY', 'UNAVAILABLE', 'BLOCKED_AUTH', 'PARTIAL']);
const dailyPlan = ['slide_deck', 'data_table', 'mind_map'];
const weeklyPlan = ['slide_deck', 'infographic'];
const canonical = (value) => Array.isArray(value)
  ? value.map(canonical)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonical(item)]))
    : value;
const digest = (value) => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const fail = (code) => { throw new Error(`CAREER-NOTEBOOK-${code}`); };

export const compileBriefing = (request) => {
  if (request.schema_version !== 'career-notebook-briefing-request-v1') fail('SCHEMA');
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(request.cutoff_date)) fail('DATE');
  if (!Number.isInteger(request.revision) || request.revision < 1) fail('REVISION');
  if (!capabilities.has(request.capability_status)) fail('CAPABILITY');
  if (!same(request.artifact_plan?.daily, dailyPlan)) fail('DAILY-PLAN');
  if (!same(request.artifact_plan?.weekly, weeklyPlan)) fail('WEEKLY-PLAN');
  if (request.artifact_plan?.retention !== 'append_revision') fail('RETENTION');
  if (!HASH.test(request.authority?.design_system_sha256 ?? '')) fail('DESIGN-HASH');
  if (!request.authority?.source_hashes?.length || request.authority.source_hashes.some((value) => !HASH.test(value))) fail('SOURCE-HASH');
  if (request.authority?.composition_id !== 'neo-swiss-editorial') fail('COMPOSITION');
  const metrics = request.metrics ?? {};
  if (metrics.strong_fit + metrics.partial_fit !== metrics.confirmed) fail('FIT-TOTAL');
  if (metrics.labels_applied - metrics.overlapping_labels !== metrics.unique_messages) fail('INBOX-UNIQUE');
  if (Object.values(metrics).some((value) => !Number.isInteger(value) || value < 0)) fail('METRIC');
  if (request.public_fixture && /(?:file:\/\/|\/Users\/|[A-Z]:\\|@)/u.test(JSON.stringify(request))) fail('PUBLIC-LOCATOR');
  const material = {
    cutoff_date: request.cutoff_date,
    timezone: request.timezone,
    owner: request.owner,
    authority: request.authority,
    metrics,
    artifact_plan: request.artifact_plan,
  };
  const daily_debrief_sha256 = digest(material);
  const createStudio = request.material_delta && request.capability_status === 'READY';
  const suffix = `${request.cutoff_date} · r${request.revision}`;
  return canonical({
    schema_version: 'career-notebook-briefing-plan-v1',
    daily_debrief_sha256,
    status: !request.material_delta ? 'NO_MATERIAL_DELTA' : createStudio ? 'STUDIO_PENDING' : request.capability_status,
    studio_artifacts: createStudio ? [
      {type: 'slide_deck', title: `Continuous Search · Daily Debrief · ${suffix}`},
      {type: 'data_table', title: `Pipeline & Inbox · ${suffix}`},
      {type: 'mind_map', title: `Next Moves · ${suffix}`},
    ] : [],
    weekly_artifacts: createStudio && request.weekly_cut ? weeklyPlan : [],
  });
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const input = JSON.parse(readFileSync(process.argv[2], 'utf8'));
  process.stdout.write(`${JSON.stringify(compileBriefing(input), null, 2)}\n`);
}
