import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {
  TECHNICAL_DEFENSE_MANIFEST_SHA256_V1,
  technicalDefenseRunnerSha256V1,
} from 'workflows/local-extensions/executor-v1.ts';
import {SandboxProbeSchema} from 'workflows/local-extensions/index.ts';
import {containedFile} from 'workflows/local-extensions/paths.ts';

const digest = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex');
const HISTORICAL_PROBE_SHA256 = '5c277f96d220754a7d4d120445a1ffa2351b3f77d767fa8c7caf7d32af44f858';

// Synthetic suite authority only. The historical production probe remains immutable;
// current success, replay and adversarial boundaries are exercised by the R8 tests.
// This fixture conveys no human review, privacy promotion or production activation.
export const makeCurrentTechnicalDefenseProbeFixture = (bundleRoot: string): Buffer => {
  const historicalBytes = readFileSync(containedFile(bundleRoot, 'sandbox-probe.json'));
  if (digest(historicalBytes) !== HISTORICAL_PROBE_SHA256)
    throw new Error('Historical synthetic probe source binding drifted.');
  const historical = SandboxProbeSchema.parse(JSON.parse(historicalBytes.toString('utf8')));
  if (
    historical.runner_id !== 'frames.local-extension-executor-v1' ||
    historical.manifest_sha256 !== TECHNICAL_DEFENSE_MANIFEST_SHA256_V1 ||
    historical.manifest_sha256 !== digest(readFileSync(containedFile(bundleRoot, 'extension.yml')))
  )
    throw new Error('Historical synthetic probe manifest binding drifted.');
  for (const evidence of historical.evidence)
    if (digest(readFileSync(containedFile(bundleRoot, evidence.ref))) !== evidence.sha256)
      throw new Error('Historical synthetic probe evidence binding drifted.');
  const current = SandboxProbeSchema.parse({
    ...historical,
    runner_sha256: technicalDefenseRunnerSha256V1(),
  });
  return Buffer.from(`${JSON.stringify(current, null, 2)}\n`);
};
