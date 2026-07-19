import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {parse} from 'yaml';

const root = process.cwd();
const readYaml = (path) => parse(readFileSync(resolve(root, path), 'utf8'));
const sha256 = (input) => createHash('sha256').update(input).digest('hex');
const normalizeText = (buffer) =>
  buffer
    .toString('utf8')
    .replace(/^\uFEFF/u, '')
    .normalize('NFC')
    .replace(/\r\n?/gu, '\n')
    .split('\n')
    .map((line) => line.replace(/[\t ]+$/u, ''))
    .join('\n')
    .replace(/\n*$/u, '\n');

const registry = readYaml('registries/sources/source-registry.yml');
const lifecycle = readYaml('registries/sources/lifecycle-contract.yml');
const gaps = readYaml('registries/sources/canonical-source-gaps.yml');
const claims = readYaml('registries/claims/claim-registry.yml');
const bundle = readYaml('projects/vs-001-source-to-campaign/source-bundle.yml');
const supersedingEvidence = readYaml('quality/reports/a09-a10-source-inventory-superseding.yml');
const errors = [];
const states = lifecycle.states ?? [];
const allowedTransitions = new Set(
  (lifecycle.allowed_transitions ?? []).map(
    (transition) => `${transition.from ?? 'null'}->${transition.to}`,
  ),
);

if (states.join('>') !== 'candidate>quarantined>evaluated>active>deprecated') {
  errors.push('lifecycle: secuencia de estados incorrecta');
}

const entries = new Map((registry.entries ?? []).map((entry) => [entry.source_id, entry]));
const currentSourceIds = [...entries.keys()];
const historicalEvidence = readFileSync(
  resolve(root, supersedingEvidence.supersedes?.evidence_ref ?? ''),
);
const currentRegistry = readFileSync(
  resolve(root, supersedingEvidence.current_inventory?.registry_ref ?? ''),
);
if (
  supersedingEvidence.evidence_id !== 'EVD-A02-SOURCE-INVENTORY-SUPERSEDING-001' ||
  supersedingEvidence.supersedes?.history_rewritten !== false ||
  supersedingEvidence.supersedes?.scope !== 'source_inventory_count_only' ||
  supersedingEvidence.supersedes?.evidence_sha256 !== sha256(historicalEvidence) ||
  !historicalEvidence.toString('utf8').includes('Three source records') ||
  supersedingEvidence.current_inventory?.registry_sha256 !== sha256(currentRegistry) ||
  supersedingEvidence.current_inventory?.registry_id !== registry.registry_id ||
  supersedingEvidence.current_inventory?.registry_schema_version !== registry.schema_version ||
  supersedingEvidence.current_inventory?.source_count !== entries.size ||
  JSON.stringify(supersedingEvidence.current_inventory?.source_ids) !==
    JSON.stringify(currentSourceIds) ||
  supersedingEvidence.validation?.expected_record_count !== entries.size ||
  supersedingEvidence.validation?.canonical_expected !== 4 ||
  supersedingEvidence.validation?.canonical_confirmed !== 0 ||
  supersedingEvidence.validation?.source_locked !== false ||
  supersedingEvidence.append_only !== true
) {
  errors.push('superseding source inventory evidence is stale or not hash-bound');
}
const synthetic = entries.get('SRC-SYNTH-VS001');
if (!synthetic || synthetic.current_state !== 'active') {
  errors.push('SRC-SYNTH-VS001 debe existir active');
} else {
  const raw = readFileSync(resolve(root, synthetic.portable_locator));
  const normalized = normalizeText(raw);
  if (sha256(raw) !== synthetic.hashes.raw_sha256) errors.push('synthetic raw hash mismatch');
  if (sha256(normalized) !== synthetic.hashes.normalized_sha256) {
    errors.push('synthetic normalized hash mismatch');
  }
  if (
    synthetic.deduplication?.verdict !== 'unique' ||
    synthetic.rights?.rights_verdict !== 'allowed_local_test_only' ||
    synthetic.authority?.authority_verdict !== 'verified_for_contract_testing_only'
  ) {
    errors.push('synthetic active gates incomplete');
  }

  let previous = null;
  for (const [index, receiptPath] of synthetic.receipts.entries()) {
    const receipt = readYaml(receiptPath);
    if (receipt.append_only !== true || receipt.event_order !== index + 1) {
      errors.push(`${receiptPath}: append-only/event_order invalid`);
    }
    const edge = `${receipt.transition.from ?? 'null'}->${receipt.transition.to}`;
    if (!allowedTransitions.has(edge) || receipt.transition.from !== previous) {
      errors.push(`${receiptPath}: invalid lifecycle transition ${edge}`);
    }
    if (
      receipt.hashes?.raw_sha256 !== synthetic.hashes.raw_sha256 ||
      receipt.hashes?.normalized_sha256 !== synthetic.hashes.normalized_sha256
    ) {
      errors.push(`${receiptPath}: hashes do not bind source`);
    }
    previous = receipt.transition.to;
  }
  if (previous !== synthetic.current_state)
    errors.push('synthetic receipt chain does not reach active');
}

for (const sourceId of ['SRC-METH-JVC-YT-001', 'SRC-METH-JVC-SKOOL-001']) {
  const entry = entries.get(sourceId);
  if (!entry || entry.current_state !== 'candidate') {
    errors.push(`${sourceId}: methodology reference must remain candidate`);
    continue;
  }
  if (
    entry.hashes?.raw_sha256 !== null ||
    entry.hashes?.normalized_sha256 !== null ||
    entry.rights?.rights_verdict !== 'unresolved' ||
    entry.authority?.authority_verdict !== 'pending'
  ) {
    errors.push(`${sourceId}: unresolved content must remain fail-closed`);
  }
  if (sha256(entry.canonical_uri) !== entry.canonical_uri_sha256) {
    errors.push(`${sourceId}: canonical URI hash mismatch`);
  }
}

if (
  gaps.status !== 'coverage_gap' ||
  gaps.expected_count !== 4 ||
  gaps.confirmed_count !== 0 ||
  gaps.slots?.length !== 4 ||
  gaps.consequence?.source_locked !== false
) {
  errors.push('canonical source gaps must preserve 0/4 and source_locked=false');
}

if (bundle.source_locked !== false || bundle.source_snapshot_id !== 'synthetic-vs-001-v1') {
  errors.push('source bundle must remain synthetic and unlocked');
}

const rawLines = readFileSync(resolve(root, synthetic?.portable_locator ?? ''), 'utf8').split('\n');
for (const claim of claims.claims ?? []) {
  if (claim.source_id !== 'SRC-SYNTH-VS001' || claim.state !== 'active') {
    errors.push(`${claim.claim_id}: unexpected source or state`);
    continue;
  }
  if (claim.source_normalized_sha256 !== synthetic.hashes.normalized_sha256) {
    errors.push(`${claim.claim_id}: source hash mismatch`);
  }
  const [startText, endText] = String(claim.source_lines).split('-');
  const start = Number(startText);
  const end = Number(endText);
  const evidence = rawLines
    .slice(start - 1, end)
    .join(' ')
    .replace(/`/gu, '')
    .replace(/\s+/gu, ' ')
    .trim();
  if (evidence !== claim.text)
    errors.push(`${claim.claim_id}: claim text does not match source span`);
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.info(
    `PASS SOURCES: ${entries.size} records, superseding inventory evidence, active synthetic hash chain, 3 claims and canonical 0/4 coverage_gap valid.`,
  );
}
