import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const root = process.cwd();
const required = [
  'skills/content-os-router/SKILL.md',
  'skills/content-os-router/context.md',
  'skills/content-os-router/LINEAGE.yml',
  'skills/content-os-router/schemas/router-intent-v1.schema.json',
  'skills/content-os-router/schemas/content-intent-v2.schema.json',
  'skills/content-os-router/scripts/check-skill.mjs',
  'skills/content-os-router/scripts/content-intent-request.mjs',
  'skills/content-os-router/scripts/route-audit.mjs',
  'skills/content-os-router/scripts/route-content.mjs',
  'skills/content-os-router/scripts/route-intent.mjs',
  'skills/content-os-router/references/routes.md',
  'skills/content-os-router/references/intent-interview.md',
  'skills/content-os-router/rules/router-contract.md',
  'skills/content-os-router/examples/intent-brief.jsonl',
  'skills/content-os-router/examples/route-decision.jsonl',
  'skills/content-os-router/fixtures/positive/valid-intent-brief.yml',
  'skills/content-os-router/fixtures/negative/unrouted-intent.yml',
  'skills/content-os-router/receipts/runtime-boundary.yml',
];

const contents = new Map(required.map((path) => [path, readFileSync(resolve(root, path), 'utf8')]));

const combined = [...contents.values()].join('\n');
const runtimeCombined = [
  'skills/content-os-router/examples/intent-brief.jsonl',
  'skills/content-os-router/examples/route-decision.jsonl',
  'skills/content-os-router/fixtures/positive/valid-intent-brief.yml',
]
  .map((path) => contents.get(path))
  .join('\n');

for (const token of [
  'version: 0.6.0',
  '## 1. Activación',
  '## 8. Handoff',
  'intent-router',
  'capability-map',
  'source-to-video',
  'source-to-content',
  'content-intent-v2',
  'career-application',
  'frames-route-decision-v1',
  'AssistanceEnvelopeV1',
  'SkillInvocationReceiptV1',
  'adapter_invoked',
  'MW_BRIEF_APPROVED',
  'selected_stage_path',
  'P03',
  'route-once',
  'route-by-deliverable',
  'dual-paradigm',
  'data-composition-src',
  'paused: true',
  'window.__timelines',
  'sha256',
  'offline-first',
  'seek-safe',
  'RENDERED_DRAFT',
]) {
  if (!combined.includes(token)) {
    throw new Error(`COSR-ROUTER_CONTRACT_MISSING: ${token}`);
  }
}

const dispatchProbe = JSON.parse(
  execFileSync(
    process.execPath,
    [
      '--import',
      'tsx',
      '--input-type=module',
      '-e',
      `import {dispatchIntent} from './skills/content-os-router/scripts/route-intent.mjs';
       const content = dispatchIntent({request:'crear contenido', audience:'equipos', outcome:'informar', source:{type:'text',authority:'verified'}});
       const career = dispatchIntent({request:'crear CV', candidateId:'CAND-FIXTURE', targetRole:'arquitectura', profileReady:true, evidenceReady:true});
       const unknown = dispatchIntent({request:'necesito ayuda'});
       process.stdout.write(JSON.stringify({content, career, unknown}));`,
    ],
    {cwd: root, encoding: 'utf8'},
  ),
);
if (
  dispatchProbe.content?.route_id !== 'R6' ||
  dispatchProbe.content?.adapter_invoked !== true ||
  dispatchProbe.content?.domain_intent?.schema_version !== 'content-intent-v2' ||
  dispatchProbe.career?.route_id !== 'R7' ||
  dispatchProbe.career?.adapter_invoked !== true ||
  dispatchProbe.career?.domain_intent?.schema_version !== 'career-intent-v1' ||
  dispatchProbe.unknown?.route_id !== 'R0' ||
  dispatchProbe.unknown?.adapter_invoked !== false
) {
  throw new Error('COSR-CAUSAL_DISPATCH_FAILED');
}

for (const pattern of [
  /\bMath\.random\s*\(/u,
  /\bDate\.now\s*\(/u,
  /\bnew\s+Date\s*\(/u,
  /\bfetch\s*\(/u,
  /\bsetTimeout\s*\(/u,
  /\bsetInterval\s*\(/u,
  /\bperformance\.now\s*\(/u,
  /getBoundingClientRect/u,
  /repeat:\s*-1/u,
  /['"]\s*\+=/u,
  /\btransition\s*:/u,
  /https?:\/\/fonts\.googleapis\.com/u,
  /https?:\/\/[a-z0-9.-]+\.[a-z]{2,}\/[^'"\s)]+\.(woff2?|ttf|otf|mp4|webm|mp3|wav|png|jpg|jpeg|gif|svg)/iu,
]) {
  if (pattern.test(runtimeCombined)) {
    throw new Error(`COSR-ROUTER_FORBIDDEN_API: ${String(pattern)}`);
  }
}

// Negative fixture must document every violation it claims to reject.
const negative = contents.get('skills/content-os-router/fixtures/negative/unrouted-intent.yml');
for (const token of [
  'missing-route',
  'missing-capability-map',
  'unknown-source-type',
  'route-by-keyword',
  'no-deliverable',
  'https://',
]) {
  if (!negative.includes(token)) {
    throw new Error(`COSR-ROUTER_NEGATIVE_FIXTURE_INCOMPLETE: missing ${token}`);
  }
}

console.info(
  `PASS content-os-router: ${required.length} governed resources, intent router + capability map, route-once, route-by-deliverable.`,
);
