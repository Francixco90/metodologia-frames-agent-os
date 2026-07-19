import {readFileSync, readdirSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {parse} from 'yaml';

const root = process.cwd();
const adapterRoot = resolve(root, 'adapters/notebooklm');
const sha256 = /^[a-f0-9]{64}$/u;
const isoDatetime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/u;
const allowedOperations = new Set([
  'resolve_binding_status',
  'read_metadata_digest',
  'read_coverage_digest',
  'query_grounding',
]);

const readYaml = (path) => parse(readFileSync(path, 'utf8'));
const hasOnlyKeys = (value, allowedKeys) => Object.keys(value).every((key) => allowedKeys.has(key));

const validateBinding = (binding) => {
  if (!binding || typeof binding !== 'object') return 'NOTEBOOK_BINDING_INVALID';
  if (binding.locator_material_present !== false) {
    return 'NOTEBOOK_LOCATOR_MATERIAL_FORBIDDEN';
  }
  if (binding.mode === 'none') {
    if (!hasOnlyKeys(binding, new Set(['mode', 'reason_code', 'locator_material_present']))) {
      return 'NOTEBOOK_BINDING_INVALID';
    }
    if (typeof binding.reason_code !== 'string' || binding.reason_code.length === 0) {
      return 'NOTEBOOK_BINDING_INVALID';
    }
    return null;
  }
  if (
    !hasOnlyKeys(
      binding,
      new Set(['mode', 'binding_digest', 'coverage', 'locator_material_present']),
    )
  ) {
    return 'NOTEBOOK_BINDING_INVALID';
  }
  if (binding.mode !== 'digest' || !sha256.test(binding.binding_digest ?? '')) {
    return 'NOTEBOOK_BINDING_INVALID';
  }
  if (!binding.coverage) return 'NOTEBOOK_COVERAGE_REQUIRED';
  const coverage = binding.coverage;
  if (
    typeof coverage !== 'object' ||
    !hasOnlyKeys(
      coverage,
      new Set(['source_count', 'cited_source_count', 'coverage_digest', 'observed_at']),
    )
  ) {
    return 'NOTEBOOK_COVERAGE_INVALID';
  }
  if (
    !Number.isInteger(coverage.source_count) ||
    coverage.source_count < 0 ||
    !Number.isInteger(coverage.cited_source_count) ||
    coverage.cited_source_count < 0 ||
    coverage.cited_source_count > coverage.source_count ||
    !sha256.test(coverage.coverage_digest ?? '') ||
    typeof coverage.observed_at !== 'string' ||
    !isoDatetime.test(coverage.observed_at) ||
    !Number.isFinite(Date.parse(coverage.observed_at))
  ) {
    return 'NOTEBOOK_COVERAGE_INVALID';
  }
  return null;
};

const validateRequest = (request) => {
  if (!request || !allowedOperations.has(request.operation)) {
    return 'NOTEBOOK_OPERATION_FORBIDDEN';
  }
  if (
    typeof request !== 'object' ||
    !hasOnlyKeys(request, new Set(['operation', 'binding', 'claim_ids']))
  ) {
    return 'NOTEBOOK_REQUEST_INVALID';
  }
  const bindingError = validateBinding(request.binding);
  if (bindingError !== null) return bindingError;
  if (!Array.isArray(request.claim_ids)) return 'NOTEBOOK_REQUEST_INVALID';
  if (request.operation === 'query_grounding') {
    if (
      request.claim_ids.length === 0 ||
      request.claim_ids.some((claimId) => typeof claimId !== 'string' || claimId.length === 0)
    ) {
      return 'NOTEBOOK_CLAIM_MAPPING_REQUIRED';
    }
    return null;
  }
  return request.claim_ids.length === 0 ? null : 'NOTEBOOK_REQUEST_INVALID';
};

const errors = [];
const contract = readYaml(join(adapterRoot, 'contract.yml'));
if (contract.mode !== 'read_only' || contract.network_activation !== 'disabled') {
  errors.push('contract.yml: adapter must remain read_only with network disabled');
}
if (!Array.isArray(contract.write_operations) || contract.write_operations.length !== 0) {
  errors.push('contract.yml: write_operations must be empty');
}
if (contract.locator_persistence !== 'forbidden') {
  errors.push('contract.yml: locator persistence must be forbidden');
}
if (contract.unknown_fields !== 'reject') {
  errors.push('contract.yml: unknown fields must be rejected');
}

for (const fixtureClass of ['positive', 'negative']) {
  const directory = join(adapterRoot, 'fixtures', fixtureClass);
  for (const name of readdirSync(directory).sort()) {
    const fixture = readYaml(join(directory, name));
    const actualError = validateRequest(fixture.request);
    if (fixtureClass === 'positive' && actualError !== null) {
      errors.push(`${name}: expected valid, received ${actualError}`);
    }
    if (fixtureClass === 'negative' && actualError !== fixture.expected_error) {
      errors.push(
        `${name}: expected ${fixture.expected_error}, received ${actualError ?? 'valid'}`,
      );
    }
  }
}

const notebookRegistry = readYaml(resolve(root, 'registries/notebooks/notebook-registry.yml'));
for (const entry of notebookRegistry.entries ?? []) {
  const actualError = validateBinding(entry.binding);
  if (actualError !== null) errors.push(`notebook registry ${entry.binding_id}: ${actualError}`);
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.info(
    'PASS NOTEBOOKLM CONTRACT: read-only, no versioned locators, binding union and negative fixtures valid.',
  );
}
