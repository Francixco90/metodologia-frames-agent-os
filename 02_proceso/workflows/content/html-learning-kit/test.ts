import assert from 'node:assert/strict';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  readdirSync,
  renameSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join, relative, resolve} from 'node:path';

import {calculateSpecSha256, canonicalJson, sha256} from './canonical.ts';
import {compileLearningKit} from './compiler.ts';
import {BuildManifestSchema, BuildReceiptSchema, type HtmlLearningKitSpec} from './contracts.ts';
import {createSyntheticSpec} from './fixture.ts';
import {verifyLearningKit} from './verifier.ts';

const workspaceRoot = process.cwd();
const tempRoot = realpathSync(mkdtempSync(join(tmpdir(), 'html-learning-kit-')));
const first = resolve(tempRoot, 'first');
const second = resolve(tempRoot, 'second');
const files = (root: string): string[] =>
  readdirSync(root, {recursive: true, withFileTypes: true})
    .filter((entry) => entry.isFile())
    .map((entry) => relative(root, resolve(entry.parentPath, entry.name)))
    .sort();
const clone = <T>(value: T): T => structuredClone(value);
const rehashSpec = (spec: HtmlLearningKitSpec): HtmlLearningKitSpec => ({
  ...spec,
  specSha256: calculateSpecSha256(spec),
});
const mustFail = (name: string, action: () => void, pattern: RegExp): void => {
  assert.throws(action, pattern, name);
};

try {
  const spec = createSyntheticSpec(workspaceRoot);
  compileLearningKit({workspaceRoot, outputRoot: first, spec});
  compileLearningKit({workspaceRoot, outputRoot: second, spec});
  assert.deepEqual(files(first), files(second), 'deterministic builds must have the same file set');
  for (const path of files(first)) {
    assert.equal(
      sha256(readFileSync(resolve(first, path))),
      sha256(readFileSync(resolve(second, path))),
      `deterministic output differs: ${path}`,
    );
  }
  assert.deepEqual(verifyLearningKit({workspaceRoot, outputRoot: first, spec}), {
    status: 'PASS',
    verifiedOutputs: 9,
  });

  const reducedRoot = resolve(tempRoot, 'reduced');
  mkdirSync(reducedRoot);
  writeFileSync(resolve(reducedRoot, 'sentinel.txt'), 'must remain');
  const reducedSpec = clone(spec);
  reducedSpec.workbook.sheets = reducedSpec.workbook.sheets.slice(0, 2);
  mustFail(
    'reduced workbook spec',
    () =>
      compileLearningKit({
        workspaceRoot,
        outputRoot: reducedRoot,
        spec: rehashSpec(reducedSpec),
      }),
    /Too small|>=3/iu,
  );
  assert.equal(
    readFileSync(resolve(reducedRoot, 'sentinel.txt'), 'utf8'),
    'must remain',
    'failed preflight must not mutate the existing output root',
  );

  const symlinkWorkspace = resolve(tempRoot, 'symlink-workspace');
  const fixtureRef = '02_proceso/workflows/content/html-learning-kit/fixtures';
  const symlinkFixture = resolve(symlinkWorkspace, fixtureRef);
  mkdirSync(dirname(symlinkFixture), {recursive: true});
  cpSync(resolve(workspaceRoot, fixtureRef), symlinkFixture, {recursive: true});
  renameSync(
    resolve(symlinkFixture, 'learning-kit.css'),
    resolve(symlinkFixture, 'learning-kit-real.css'),
  );
  symlinkSync('learning-kit-real.css', resolve(symlinkFixture, 'learning-kit.css'));
  const symlinkSpec = createSyntheticSpec(symlinkWorkspace);
  const symlinkOutput = resolve(tempRoot, 'symlink-output');
  mustFail(
    'symlink input',
    () =>
      compileLearningKit({
        workspaceRoot: symlinkWorkspace,
        outputRoot: symlinkOutput,
        spec: symlinkSpec,
      }),
    /SYMLINK_FORBIDDEN/u,
  );
  assert.equal(existsSync(symlinkOutput), false, 'symlink preflight must not create output');

  const staleSpec = clone(spec);
  staleSpec.localizedContent.siteTitle.es = 'changed';
  mustFail(
    'stale spec',
    () => verifyLearningKit({workspaceRoot, outputRoot: first, spec: staleSpec}),
    /STALE_SPEC_HASH/u,
  );

  const residualRoot = resolve(tempRoot, 'residual');
  compileLearningKit({workspaceRoot, outputRoot: residualRoot, spec});
  writeFileSync(resolve(residualRoot, 'unexpected.txt'), 'residue');
  mustFail(
    'residual output',
    () => verifyLearningKit({workspaceRoot, outputRoot: residualRoot, spec}),
    /RESIDUAL_OUTPUT/u,
  );

  const staleLock = rehashSpec({
    ...clone(spec),
    designSystemLock: {...spec.designSystemLock, sha256: '0'.repeat(64)},
  });
  mustFail(
    'stale lock',
    () => verifyLearningKit({workspaceRoot, outputRoot: first, spec: staleLock}),
    /STALE_DESIGN_SYSTEM_LOCK/u,
  );

  const staleAsset = clone(spec);
  staleAsset.assets[0]!.source.sha256 = '1'.repeat(64);
  mustFail(
    'stale asset',
    () => verifyLearningKit({workspaceRoot, outputRoot: first, spec: rehashSpec(staleAsset)}),
    /STALE_ASSET_HASH/u,
  );

  const privateRef = clone(spec);
  privateRef.brandAuthority.ref = 'work/private/authority.json';
  mustFail(
    'private locator',
    () => verifyLearningKit({workspaceRoot, outputRoot: first, spec: privateRef}),
    /Private locators|portable repository-relative/u,
  );

  const missingRoot = resolve(tempRoot, 'missing');
  compileLearningKit({workspaceRoot, outputRoot: missingRoot, spec});
  unlinkSync(resolve(missingRoot, 'workbook/index.html'));
  mustFail(
    'missing output',
    () => verifyLearningKit({workspaceRoot, outputRoot: missingRoot, spec}),
    /MISSING_OUTPUT/u,
  );

  const persistenceRoot = resolve(tempRoot, 'persistence');
  compileLearningKit({workspaceRoot, outputRoot: persistenceRoot, spec});
  const outputPath = resolve(persistenceRoot, 'index.html');
  writeFileSync(
    outputPath,
    `${readFileSync(outputPath, 'utf8')}<script>localStorage.setItem('learner-answer','x')</script>`,
  );
  const manifestPath = resolve(persistenceRoot, 'build-manifest.json');
  const receiptPath = resolve(persistenceRoot, 'build-receipt.json');
  const manifest = BuildManifestSchema.parse(JSON.parse(readFileSync(manifestPath, 'utf8')));
  manifest.outputs.find(({path}) => path === 'index.html')!.sha256 = sha256(
    readFileSync(outputPath),
  );
  const {manifestSha256: oldManifestHash, ...unsignedManifest} = manifest;
  void oldManifestHash;
  manifest.manifestSha256 = sha256(canonicalJson(unsignedManifest));
  writeFileSync(manifestPath, canonicalJson(manifest));
  const receipt = BuildReceiptSchema.parse(JSON.parse(readFileSync(receiptPath, 'utf8')));
  receipt.manifestSha256 = manifest.manifestSha256;
  receipt.outputSetSha256 = sha256(canonicalJson(manifest.outputs));
  const {receiptSha256: oldReceiptHash, ...unsignedReceipt} = receipt;
  void oldReceiptHash;
  receipt.receiptSha256 = sha256(canonicalJson(unsignedReceipt));
  writeFileSync(receiptPath, canonicalJson(receipt));
  mustFail(
    'response persistence',
    () => verifyLearningKit({workspaceRoot, outputRoot: persistenceRoot, spec}),
    /LEARNER_RESPONSE_PERSISTENCE/u,
  );

  process.stdout.write('html-learning-kit: PASS (determinism + 9 fail-closed cases)\n');
} finally {
  rmSync(tempRoot, {recursive: true, force: true});
}
