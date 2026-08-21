#!/usr/bin/env node
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

const sha = (value) => createHash('sha256').update(value).digest('hex');
const stable = (value) => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])])) : value;
const digest = (value) => sha(JSON.stringify(stable(value)));
const same = (left, right) => JSON.stringify(stable(left)) === JSON.stringify(stable(right));
const idPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const refPattern = /^(?!.*\/\/)(?!.*(?:^|\/)\.{1,2}(?:\/|$))(?!.*(?:^|\/)\.[^/])(?!.*\\)[a-z0-9](?:[a-z0-9._/-]*[a-z0-9])?$/;
const expect = (condition, code) => { if (!condition) throw new Error(code); };
const keys = (value, expected, code) => expect(value && typeof value === 'object' && !Array.isArray(value) && same(Object.keys(value).sort(), [...expected].sort()), code);
const unique = (values, code) => expect(new Set(values).size === values.length, code);
const visible = (value) => typeof value === 'string' && value.length > 0 && value.length <= 320 && value.trim() === value && !/^\p{Z}|\p{Z}$/u.test(value) && !/\p{C}/u.test(value) && /[^\p{Z}\p{C}]/u.test(value);
const normalizedIdentity = (value) => value.normalize('NFKC').toLocaleLowerCase('en-US').replace(/[^\p{L}\p{N}]+/gu, '');
const aliasBound = (canonical, alias) => { const left = normalizedIdentity(canonical); const right = normalizedIdentity(alias); return left.length >= 2 && right.length >= 2 && (left.includes(right) || right.includes(left)); };
const structuredIdentity = (kind, value) => {
  if (kind === 'EMAIL') return /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value);
  if (kind === 'FILE_PATH') return /^(?:\/|[A-Za-z]:\\|(?:[A-Za-z0-9._-]+[\\/])+)[^\s]+$/u.test(value);
  if (kind !== 'URL') return true;
  try { const parsed = new URL(value); return ['http:', 'https:'].includes(parsed.protocol) && parsed.hostname.length > 0 && !/\s/u.test(value); } catch { return false; }
};
const ref = (value, code) => {
  keys(value, ['ref', 'sha256', 'bytes'], code);
  expect(value.ref.length <= 512 && refPattern.test(value.ref) && /^[a-f0-9]{64}$/.test(value.sha256) && Number.isSafeInteger(value.bytes) && value.bytes > 0, code);
};
const physical = (value, code) => {
  keys(value, ['ref', 'sha256', 'bytes', 'content_base64'], code);
  expect(value.ref.length <= 512 && refPattern.test(value.ref) && /^[a-f0-9]{64}$/.test(value.sha256) && /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value.content_base64), code);
  const bytes = Buffer.from(value.content_base64, 'base64');
  expect(bytes.length === value.bytes && sha(bytes) === value.sha256 && bytes.toString('base64') === value.content_base64, code);
  const parsed = JSON.parse(bytes.toString('utf8'));
  expect(bytes.equals(Buffer.from(JSON.stringify(stable(parsed)))), `${code}-CANONICAL`);
  return parsed;
};
const span = (value, maximum, code) => {
  keys(value, ['start', 'end'], code);
  expect(Number.isSafeInteger(value.start) && Number.isSafeInteger(value.end) && value.start >= 0 && value.start <= value.end && value.end < maximum, code);
};
const geometry = (value, metadata, code) => {
  keys(value, ['x', 'y', 'width', 'height'], code);
  expect([value.x, value.y, value.width, value.height].every(Number.isSafeInteger) && value.x >= 0 && value.y >= 0 && value.width > 0 && value.height > 0 && value.x + value.width <= metadata.frame_width && value.y + value.height <= metadata.frame_height, code);
};
const assertInventory = (inventory) => {
  keys(inventory, ['schema_version', 'inventory_id', 'case_id', 'source', 'detector_actor_id', 'aliases_sha256', 'templates_sha256', 'coverage', 'signals', 'status', 'canonical_sha256'], 'PLANNER-INVENTORY-KEYS');
  expect(inventory.schema_version === 'sensitive-signal-inventory-v1' && idPattern.test(inventory.inventory_id) && idPattern.test(inventory.case_id) && inventory.detector_actor_id === 'RT-07-H03-PRIVACY-DETECTOR-PRODUCER' && /^[a-f0-9]{64}$/.test(inventory.aliases_sha256) && /^[a-f0-9]{64}$/.test(inventory.templates_sha256) && ['BLOCKED_PENDING_PRIVACY_POLICY', 'BLOCKED_SIGNAL_CONFIDENCE_UNKNOWN'].includes(inventory.status) && Array.isArray(inventory.signals) && inventory.signals.length > 0 && inventory.signals.length <= 512, 'PLANNER-INVENTORY-STATE');
  ref(inventory.source, 'PLANNER-INVENTORY-SOURCE');
  keys(inventory.coverage, ['visual_text', 'visual_templates', 'faces', 'audio_transcript'], 'PLANNER-INVENTORY-COVERAGE');
  expect(Object.values(inventory.coverage).every((value) => ['COMPLETE', 'NOT_PRESENT', 'UNKNOWN'].includes(value)), 'PLANNER-INVENTORY-COVERAGE');
  expect(digest(Object.fromEntries(Object.entries(inventory).filter(([key]) => key !== 'canonical_sha256'))) === inventory.canonical_sha256, 'PLANNER-INVENTORY-HASH');
  unique(inventory.signals.map(({signal_id}) => signal_id), 'PLANNER-INVENTORY-SIGNAL-ID');
  const fingerprints = [];
  for (const [index, signal] of inventory.signals.entries()) {
    keys(signal, ['sequence', 'signal_id', 'kind', 'identity', 'modality', 'frame_span', 'time_span_ms', 'geometry', 'confidence', 'evidence'], 'PLANNER-SIGNAL-KEYS');
    expect(signal.sequence === index && idPattern.test(signal.signal_id) && ['NAME', 'FACE', 'LOGO', 'BRAND_TEXT', 'URL', 'EMAIL', 'FILE_PATH', 'AVATAR', 'TOOL_CHROME', 'SPOKEN_BRAND'].includes(signal.kind) && ['VISUAL_TEXT', 'VISUAL_TEMPLATE', 'VISUAL_MANUAL', 'AUDIO_TRANSCRIPT'].includes(signal.modality), 'PLANNER-SIGNAL-SEQUENCE');
    keys(signal.identity, ['canonical', 'matched_alias'], 'PLANNER-SIGNAL-IDENTITY'); expect(visible(signal.identity.canonical) && (signal.identity.matched_alias === null || visible(signal.identity.matched_alias)), 'PLANNER-SIGNAL-IDENTITY');
    const kindsByModality = {VISUAL_TEXT: ['NAME', 'BRAND_TEXT', 'URL', 'EMAIL', 'FILE_PATH'], VISUAL_TEMPLATE: ['LOGO', 'AVATAR', 'TOOL_CHROME'], VISUAL_MANUAL: ['FACE'], AUDIO_TRANSCRIPT: ['SPOKEN_BRAND']};
    expect(kindsByModality[signal.modality].includes(signal.kind), 'PLANNER-SIGNAL-KIND-MODALITY');
    expect(['NAME', 'BRAND_TEXT', 'SPOKEN_BRAND'].includes(signal.kind) ? visible(signal.identity.matched_alias) && aliasBound(signal.identity.canonical, signal.identity.matched_alias) : signal.identity.matched_alias === null, 'PLANNER-SIGNAL-MATCHED-ALIAS');
    expect(structuredIdentity(signal.kind, signal.identity.canonical), 'PLANNER-SIGNAL-STRUCTURED-IDENTITY');
    keys(signal.confidence, ['score', 'status'], 'PLANNER-SIGNAL-CONFIDENCE');
    const expectedConfidence = signal.confidence.score >= 0.9 ? 'CONFIRMED' : signal.confidence.score >= 0.5 ? 'REVIEW_REQUIRED' : 'UNKNOWN';
    expect(typeof signal.confidence.score === 'number' && signal.confidence.score >= 0 && signal.confidence.score <= 1 && signal.confidence.status === expectedConfidence && (!['VISUAL_TEMPLATE', 'VISUAL_MANUAL'].includes(signal.modality) || signal.confidence.status !== 'CONFIRMED'), 'PLANNER-SIGNAL-CONFIDENCE');
    keys(signal.evidence, ['observation_id', 'material'], 'PLANNER-SIGNAL-EVIDENCE'); expect(idPattern.test(signal.evidence.observation_id), 'PLANNER-SIGNAL-EVIDENCE'); ref(signal.evidence.material, 'PLANNER-SIGNAL-EVIDENCE-REF');
    fingerprints.push(digest({kind: signal.kind, identity: signal.identity, modality: signal.modality, frame_span: signal.frame_span, time_span_ms: signal.time_span_ms, geometry: signal.geometry}));
  }
  unique(fingerprints, 'PLANNER-INVENTORY-SIGNAL-DUPLICATE');
  const coverageByModality = {VISUAL_TEXT: 'visual_text', VISUAL_TEMPLATE: 'visual_templates', VISUAL_MANUAL: 'faces', AUDIO_TRANSCRIPT: 'audio_transcript'};
  for (const signal of inventory.signals) expect(inventory.coverage[coverageByModality[signal.modality]] === 'COMPLETE', 'PLANNER-INVENTORY-COVERAGE-CONTRADICTION');
  const hasUnknown = Object.values(inventory.coverage).includes('UNKNOWN') || inventory.signals.some(({confidence}) => confidence.status === 'UNKNOWN');
  expect(inventory.status === (hasUnknown ? 'BLOCKED_SIGNAL_CONFIDENCE_UNKNOWN' : 'BLOCKED_PENDING_PRIVACY_POLICY'), 'PLANNER-INVENTORY-STATUS-DRIFT');
};
const claimMaterials = (materials) => {
  const byRef = new Map(); const byIdentity = new Map();
  for (const item of materials) { const identity = `${item.sha256}:${item.bytes}`; expect(!byRef.has(item.ref) || byRef.get(item.ref) === identity, 'PLANNER-MATERIAL-REF-ALIAS'); expect(!byIdentity.has(identity) || byIdentity.get(identity) === item.ref, 'PLANNER-MATERIAL-IDENTITY-ALIAS'); byRef.set(item.ref, identity); byIdentity.set(identity, item.ref); }
};
const assertRequest = (request) => {
  keys(request, ['schema_version', 'case_id', 'participant_id', 'actor_id', 'inventory_material', 'inventory_verification_receipt', 'source_probe_receipt', 'directive_material'], 'PLANNER-REQUEST-KEYS');
  expect(request.schema_version === 'contextual-privacy-planner-request-v1' && request.actor_id === 'RT-07-H03-PRIVACY-PLANNER-PRODUCER' && idPattern.test(request.case_id) && idPattern.test(request.participant_id), 'PLANNER-REQUEST-IDENTITY');
  const inventory = physical(request.inventory_material, 'PLANNER-INVENTORY-MATERIAL'); assertInventory(inventory);
  const receipt = physical(request.inventory_verification_receipt, 'PLANNER-INVENTORY-RECEIPT');
  keys(receipt, ['schema_version', 'actor_id', 'case_id', 'inventory_sha256', 'inventory_canonical_sha256', 'source'], 'PLANNER-INVENTORY-RECEIPT-CONTENT');
  expect(receipt.schema_version === 'sensitive-signal-inventory-verification-v1' && receipt.actor_id === 'RT-09-H03-PRIVACY-INVENTORY-VERIFIER' && receipt.case_id === request.case_id && receipt.inventory_sha256 === request.inventory_material.sha256 && receipt.inventory_canonical_sha256 === inventory.canonical_sha256 && same(receipt.source, inventory.source), 'PLANNER-INVENTORY-RECEIPT-DRIFT');
  const probe = physical(request.source_probe_receipt, 'PLANNER-SOURCE-PROBE-RECEIPT');
  keys(probe, ['schema_version', 'actor_id', 'case_id', 'source', 'source_metadata_sha256', 'source_metadata'], 'PLANNER-SOURCE-PROBE-CONTENT');
  expect(probe.schema_version === 'contextual-privacy-source-probe-v1' && probe.actor_id === 'RT-09-PRIVACY-SOURCE-PROBE-VERIFIER' && probe.case_id === request.case_id && same(probe.source, inventory.source) && probe.source_metadata_sha256 === digest(probe.source_metadata), 'PLANNER-SOURCE-PROBE-DRIFT');
  const directive = physical(request.directive_material, 'PLANNER-DIRECTIVE-MATERIAL');
  keys(directive, ['schema_version', 'case_id', 'participant_id', 'inventory_sha256', 'source', 'source_metadata', 'authorization_actor_id', 'value_guardian_actor_id', 'decisions', 'value_zones', 'invasive_operations_approved'], 'PLANNER-DIRECTIVE-KEYS');
  expect(inventory.case_id === request.case_id && directive.schema_version === 'contextual-privacy-directive-v1' && directive.case_id === request.case_id && directive.participant_id === request.participant_id && directive.inventory_sha256 === request.inventory_material.sha256 && same(directive.source, inventory.source) && same(directive.source_metadata, probe.source_metadata) && directive.authorization_actor_id === 'RT-04-PRIVACY-AUTHORIZATION-RECORDER' && directive.value_guardian_actor_id === 'RT-11-PRIVACY-VALUE-GUARDIAN' && directive.invasive_operations_approved === false, 'PLANNER-DIRECTIVE-DRIFT');
  keys(directive.source_metadata, ['frame_width', 'frame_height', 'frame_count', 'duration_ms', 'has_audio'], 'PLANNER-SOURCE-METADATA');
  expect(Object.values(directive.source_metadata).slice(0, 4).every((item) => Number.isSafeInteger(item) && item > 0) && directive.source_metadata.frame_width <= 16_384 && directive.source_metadata.frame_height <= 16_384 && directive.source_metadata.frame_count <= 1_000_000 && directive.source_metadata.duration_ms <= 86_400_000 && typeof directive.source_metadata.has_audio === 'boolean', 'PLANNER-SOURCE-METADATA');
  for (const signal of inventory.signals) {
    if (signal.modality === 'AUDIO_TRANSCRIPT') { expect(signal.frame_span === null && signal.geometry === null && signal.time_span_ms, 'PLANNER-SIGNAL-MODALITY'); span(signal.time_span_ms, directive.source_metadata.duration_ms + 1, 'PLANNER-SIGNAL-TIME-SPAN'); }
    else { expect(signal.time_span_ms === null && signal.frame_span && signal.geometry, 'PLANNER-SIGNAL-MODALITY'); span(signal.frame_span, directive.source_metadata.frame_count, 'PLANNER-SIGNAL-FRAME-SPAN'); geometry(signal.geometry, directive.source_metadata, 'PLANNER-SIGNAL-GEOMETRY'); }
  }
  expect(['visual_text', 'visual_templates', 'faces'].every((key) => inventory.coverage[key] !== 'NOT_PRESENT'), 'PLANNER-INVENTORY-COVERAGE-UNACCREDITED');
  expect(directive.source_metadata.has_audio ? inventory.coverage.audio_transcript !== 'NOT_PRESENT' : inventory.coverage.audio_transcript === 'NOT_PRESENT', 'PLANNER-INVENTORY-AUDIO-COVERAGE');
  claimMaterials([request.inventory_material, request.inventory_verification_receipt, request.source_probe_receipt, request.directive_material, inventory.source, receipt.source, probe.source, directive.source, ...inventory.signals.map(({evidence}) => evidence.material)]);
  return {inventory, directive};
};
const expand = (roi, metadata) => { const amount = 10; const x = Math.max(0, roi.x - amount); const y = Math.max(0, roi.y - amount); const right = Math.min(metadata.frame_width, roi.x + roi.width + amount); const bottom = Math.min(metadata.frame_height, roi.y + roi.height + amount); return {x, y, width: right - x, height: bottom - y}; };
const reframe = (roi, metadata) => {
  const candidates = [];
  if (roi.y <= 48) candidates.push({edge: 'TOP', roi: {x: 0, y: 0, width: metadata.frame_width, height: Math.min(metadata.frame_height, roi.y + roi.height + 10)}});
  if (metadata.frame_height - roi.y - roi.height <= 48) { const y = Math.max(0, roi.y - 10); candidates.push({edge: 'BOTTOM', roi: {x: 0, y, width: metadata.frame_width, height: metadata.frame_height - y}}); }
  if (roi.x <= 48) candidates.push({edge: 'LEFT', roi: {x: 0, y: 0, width: Math.min(metadata.frame_width, roi.x + roi.width + 10), height: metadata.frame_height}});
  if (metadata.frame_width - roi.x - roi.width <= 48) { const x = Math.max(0, roi.x - 10); candidates.push({edge: 'RIGHT', roi: {x, y: 0, width: metadata.frame_width - x, height: metadata.frame_height}}); }
  return candidates.sort((left, right) => left.roi.width * left.roi.height - right.roi.width * right.roi.height || left.edge.localeCompare(right.edge))[0] ?? null;
};
const intersects = (a, b) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
const overlaps = (a, b) => a.start <= b.end && b.start <= a.end;
const seal = (value) => ({...value, canonical_sha256: digest(value)});

export function planContextualPrivacy(request) {
  const {inventory, directive} = assertRequest(request); const metadata = directive.source_metadata;
  expect(Array.isArray(directive.decisions) && Array.isArray(directive.value_zones) && directive.value_zones.length > 0, 'PLANNER-DIRECTIVE-COLLECTIONS');
  unique(directive.decisions.map(({signal_id}) => signal_id), 'PLANNER-DECISION-DUPLICATE');
  expect(same(directive.decisions.map(({signal_id}) => signal_id), inventory.signals.map(({signal_id}) => signal_id)), 'PLANNER-DECISION-COVERAGE');
  const signals = new Map(inventory.signals.map((signal) => [signal.signal_id, signal]));
  const rules = directive.decisions.map((decision, sequence) => {
    keys(decision, ['signal_id', 'rule', 'reason_code'], 'PLANNER-DECISION-KEYS'); const signal = signals.get(decision.signal_id);
    expect(signal && ['KEEP', 'PROTECT', 'AUDIO_SILENCE', 'BLOCK_FOR_REVIEW'].includes(decision.rule) && ['AUTHORIZED_PARTICIPANT', 'PUBLIC_CONTEXT', 'SENSITIVE_IDENTITY', 'CLIENT_BRAND', 'PRIVATE_LOCATOR', 'UNRESOLVED_AUTHORIZATION'].includes(decision.reason_code), 'PLANNER-DECISION-INVALID');
    const allowedReasons = decision.rule === 'KEEP' ? ['AUTHORIZED_PARTICIPANT', 'PUBLIC_CONTEXT'] : decision.rule === 'BLOCK_FOR_REVIEW' ? ['UNRESOLVED_AUTHORIZATION'] : ['SENSITIVE_IDENTITY', 'CLIENT_BRAND', 'PRIVATE_LOCATOR'];
    expect(allowedReasons.includes(decision.reason_code), 'PLANNER-DECISION-REASON');
    expect(signal.confidence.status !== 'UNKNOWN' || decision.rule === 'BLOCK_FOR_REVIEW', 'PLANNER-UNKNOWN-MUST-BLOCK');
    expect(!(signal.confidence.status === 'REVIEW_REQUIRED' && decision.rule === 'KEEP'), 'PLANNER-REVIEW-CANNOT-KEEP');
    expect(decision.rule !== 'PROTECT' || (signal.geometry && signal.frame_span), 'PLANNER-PROTECT-MODALITY');
    expect(decision.rule !== 'AUDIO_SILENCE' || (signal.time_span_ms && signal.time_span_ms.end - signal.time_span_ms.start >= 90 && signal.modality === 'AUDIO_TRANSCRIPT' && metadata.has_audio), 'PLANNER-AUDIO-MODALITY');
    return {sequence, signal_id: signal.signal_id, kind: signal.kind, identity: signal.identity.canonical, rule: decision.rule, reason_code: decision.reason_code, evidence_sha256: signal.evidence.material.sha256};
  });
  const review = rules.some(({rule}) => rule === 'BLOCK_FOR_REVIEW') || inventory.status === 'BLOCKED_SIGNAL_CONFIDENCE_UNKNOWN';
  const idSuffix = digest({case_id: request.case_id, participant_id: request.participant_id}).slice(0, 24);
  const policy = seal({schema_version: 'privacy-policy-v1', policy_id: `POLICY:${idSuffix}`, case_id: request.case_id, participant_id: request.participant_id, inventory: {ref: request.inventory_material.ref, sha256: request.inventory_material.sha256, bytes: request.inventory_material.bytes}, planner_actor_id: request.actor_id, authorization_actor_id: directive.authorization_actor_id, rules, status: review ? 'BLOCKED_PENDING_HUMAN_PRIVACY_REVIEW' : 'BLOCKED_PENDING_VALUE_PRESERVATION_AND_REDACTION_PLAN'});
  expect(directive.value_zones.length <= 128, 'PLANNER-VALUE-ZONE-LIMIT'); unique(directive.value_zones.map(({zone_id}) => zone_id), 'PLANNER-VALUE-ZONE-DUPLICATE');
  const zones = directive.value_zones.map((zone, sequence) => {
    keys(zone, ['zone_id', 'kind', 'frame_span', 'geometry', 'authorized_redaction_signal_ids'], 'PLANNER-VALUE-ZONE-KEYS'); expect(idPattern.test(zone.zone_id) && ['STUDENT_DELIVERABLE', 'OPERATION', 'AUTHORIZED_FACE', 'DRAWING', 'RELEVANT_INTERFACE', 'RESULT'].includes(zone.kind), 'PLANNER-VALUE-ZONE-KIND'); span(zone.frame_span, metadata.frame_count, 'PLANNER-VALUE-ZONE-SPAN'); geometry(zone.geometry, metadata, 'PLANNER-VALUE-ZONE-GEOMETRY'); unique(zone.authorized_redaction_signal_ids, 'PLANNER-VALUE-ZONE-AUTH-DUPLICATE');
    for (const id of zone.authorized_redaction_signal_ids) expect(rules.some((rule) => rule.signal_id === id && rule.rule === 'PROTECT'), 'PLANNER-VALUE-ZONE-AUTH-INVALID');
    return {sequence, ...zone};
  });
  const valuePlan = seal({schema_version: 'value-preservation-plan-v1', plan_id: `VALUE:${idSuffix}`, case_id: request.case_id, participant_id: request.participant_id, source: inventory.source, source_metadata: metadata, privacy_policy_sha256: policy.canonical_sha256, value_guardian_actor_id: directive.value_guardian_actor_id, zones, status: 'BLOCKED_PENDING_MINIMAL_REDACTION_PLAN'});
  const operations = [];
  for (const rule of rules) {
    const signal = signals.get(rule.signal_id); if (!['PROTECT', 'AUDIO_SILENCE'].includes(rule.rule)) continue;
    const operationId = `OP:${sha(signal.signal_id).slice(0, 24)}`;
    if (rule.rule === 'AUDIO_SILENCE') operations.push({sequence: operations.length, operation_id: operationId, signal_id: signal.signal_id, type: 'AUDIO_SILENCE', frame_span: null, time_span_ms: signal.time_span_ms, signal_roi: null, authorized_effect_roi: null, tracking: null, reframe_edge: null, padding_px: null, feather_px: null, fade_ms: 45, subtitle_replacement: '[…]', source_evidence_sha256: rule.evidence_sha256});
    else {
      geometry(signal.geometry, metadata, 'PLANNER-SIGNAL-GEOMETRY'); span(signal.frame_span, metadata.frame_count, 'PLANNER-SIGNAL-FRAME-SPAN');
      const crop = signal.kind === 'TOOL_CHROME' ? reframe(signal.geometry, metadata) : null;
      const effect = crop?.roi ?? expand(signal.geometry, metadata);
      for (const zone of zones) if (overlaps(signal.frame_span, zone.frame_span) && intersects(effect, zone.geometry)) expect(!crop && zone.authorized_redaction_signal_ids.includes(signal.signal_id), 'PLANNER-VALUE-ZONE-OCCLUSION');
      operations.push({sequence: operations.length, operation_id: operationId, signal_id: signal.signal_id, type: crop ? 'REFRAME_PERIPHERAL' : 'LOCAL_BLUR', frame_span: signal.frame_span, time_span_ms: null, signal_roi: signal.geometry, authorized_effect_roi: effect, tracking: 'EXACT_DETECTION_SPAN', reframe_edge: crop?.edge ?? null, padding_px: crop ? 10 : 4, feather_px: crop ? 0 : 6, fade_ms: null, subtitle_replacement: null, source_evidence_sha256: rule.evidence_sha256});
    }
  }
  unique(operations.map(({operation_id}) => operation_id), 'PLANNER-OPERATION-ID');
  const events = new Map(); for (const {frame_span, authorized_effect_roi} of operations.filter(({authorized_effect_roi}) => authorized_effect_roi)) { const area = authorized_effect_roi.width * authorized_effect_roi.height / (metadata.frame_width * metadata.frame_height); events.set(frame_span.start, (events.get(frame_span.start) ?? 0) + area); events.set(frame_span.end + 1, (events.get(frame_span.end + 1) ?? 0) - area); }
  let active = 0; let ratio = 0; for (const time of [...events.keys()].sort((left, right) => left - right)) { active += events.get(time); ratio = Math.max(ratio, active); }
  expect(ratio <= 0.1, 'PLANNER-MASK-HARD-LIMIT'); const requiresReview = review || ratio > 0.05;
  const redactionPlan = seal({schema_version: 'redaction-plan-v2', plan_id: `REDACTION:${idSuffix}`, case_id: request.case_id, participant_id: request.participant_id, inventory_sha256: request.inventory_material.sha256, privacy_policy_sha256: policy.canonical_sha256, value_preservation_plan_sha256: valuePlan.canonical_sha256, operations, mask_budget: {review_target_ratio: 0.05, hard_limit_ratio: 0.1, max_planned_ratio: Number(ratio.toFixed(8)), requires_review: requiresReview}, status: requiresReview ? 'BLOCKED_PENDING_HUMAN_PRIVACY_REVIEW' : 'BLOCKED_PENDING_MINIMAL_REDACTION_EXECUTOR'});
  return {privacy_policy: policy, value_preservation_plan: valuePlan, redaction_plan: redactionPlan};
}

export function assertContextualPrivacyPlans(bundle, request) {
  keys(bundle, ['privacy_policy', 'value_preservation_plan', 'redaction_plan'], 'PLANNER-BUNDLE-KEYS');
  expect(same(bundle, planContextualPrivacy(request)), 'PLANNER-BUNDLE-DRIFT'); return bundle;
}

if (process.argv[1]?.endsWith('plan-contextual-privacy.mjs') && process.argv[2]) console.info(JSON.stringify(stable(planContextualPrivacy(JSON.parse(readFileSync(process.argv[2], 'utf8'))))));
