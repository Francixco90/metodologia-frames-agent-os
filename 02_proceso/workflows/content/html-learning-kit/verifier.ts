import {existsSync, readFileSync, readdirSync} from 'node:fs';
import {dirname, relative, resolve, sep} from 'node:path';

import {calculateSpecSha256, canonicalJson, sha256} from './canonical.ts';
import {
  BuildManifestSchema,
  BuildReceiptSchema,
  HtmlLearningKitSpecSchema,
  type HtmlLearningKitSpec,
} from './contracts.ts';
import {
  assertNoSymlinksInTree,
  assertSafeOutputRoot,
  resolveExistingFile,
  resolveOutputFile,
} from './paths.ts';

const FORBIDDEN_LOCATION =
  /(?:file:\/\/|\/Users\/|\/home\/|work\/(?:private|privado)|(?:Desktop|Downloads)\/)/iu;
const LOCAL_STORAGE_WRITE = /localStorage\.setItem\(\s*['"]([^'"]+)['"]/gu;

const fail = (code: string, detail?: string): never => {
  throw new Error(detail === undefined ? code : `${code}: ${detail}`);
};

const expectedDirectories = (files: Set<string>): Set<string> => {
  const directories = new Set<string>();
  for (const file of files) {
    let parent = dirname(file);
    while (parent !== '.') {
      directories.add(parent.split(sep).join('/'));
      parent = dirname(parent);
    }
  }
  return directories;
};

const assertExactPhysicalTree = (root: string, expectedFiles: Set<string>): void => {
  const actualFiles = new Set<string>();
  const actualDirectories = new Set<string>();
  for (const entry of readdirSync(root, {recursive: true, withFileTypes: true})) {
    const ref = relative(root, resolve(entry.parentPath, entry.name)).split(sep).join('/');
    if (entry.isSymbolicLink()) fail('SYMLINK_FORBIDDEN', ref);
    if (entry.isDirectory()) actualDirectories.add(ref);
    else if (entry.isFile()) actualFiles.add(ref);
    else fail('UNSUPPORTED_OUTPUT_NODE', ref);
  }
  const expectedDirs = expectedDirectories(expectedFiles);
  const residual = [...actualFiles, ...actualDirectories]
    .filter((ref) => !expectedFiles.has(ref) && !expectedDirs.has(ref))
    .sort();
  if (residual.length > 0) fail('RESIDUAL_OUTPUT', residual.join(','));
  const missing = [...expectedFiles, ...expectedDirs]
    .filter((ref) => !actualFiles.has(ref) && !actualDirectories.has(ref))
    .sort();
  if (missing.length > 0) fail('MISSING_OUTPUT', missing.join(','));
};

export const verifyLearningKit = (options: {
  workspaceRoot: string;
  outputRoot: string;
  spec: HtmlLearningKitSpec;
}): {status: 'PASS'; verifiedOutputs: number} => {
  const spec = HtmlLearningKitSpecSchema.parse(options.spec);
  if (FORBIDDEN_LOCATION.test(canonicalJson(spec))) fail('PRIVATE_LOCATOR');
  if (calculateSpecSha256(spec) !== spec.specSha256) fail('STALE_SPEC_HASH');

  const verifyBinding = (binding: {ref: string; sha256: string}, code: string): void => {
    const path = resolveExistingFile(options.workspaceRoot, binding.ref);
    if (sha256(readFileSync(path)) !== binding.sha256) fail(code, binding.ref);
  };
  verifyBinding(spec.designSystemLock, 'STALE_DESIGN_SYSTEM_LOCK');
  verifyBinding(spec.brandAuthority, 'STALE_BRAND_AUTHORITY');
  for (const asset of spec.assets) {
    verifyBinding(asset.source, 'STALE_ASSET_HASH');
    verifyBinding(asset.rights.evidence, 'STALE_RIGHTS_EVIDENCE');
  }

  assertSafeOutputRoot(options.outputRoot);
  if (!existsSync(options.outputRoot)) fail('MISSING_BUILD_EVIDENCE');
  assertNoSymlinksInTree(options.outputRoot);
  const manifestPath = resolveOutputFile(options.outputRoot, 'build-manifest.json');
  const receiptPath = resolveOutputFile(options.outputRoot, 'build-receipt.json');
  const manifest = BuildManifestSchema.parse(JSON.parse(readFileSync(manifestPath, 'utf8')));
  const receipt = BuildReceiptSchema.parse(JSON.parse(readFileSync(receiptPath, 'utf8')));
  const expectedFiles = new Set([
    'build-manifest.json',
    'build-receipt.json',
    ...manifest.assets.map(({outputPath}) => outputPath),
    ...manifest.outputs.map(({path}) => path),
  ]);
  assertExactPhysicalTree(options.outputRoot, expectedFiles);

  const {manifestSha256, ...unsignedManifest} = manifest;
  void manifestSha256;
  if (sha256(canonicalJson(unsignedManifest)) !== manifest.manifestSha256)
    fail('MANIFEST_TAMPERED');
  const {receiptSha256, ...unsignedReceipt} = receipt;
  void receiptSha256;
  if (sha256(canonicalJson(unsignedReceipt)) !== receipt.receiptSha256) fail('RECEIPT_TAMPERED');
  if (
    manifest.specSha256 !== spec.specSha256 ||
    receipt.specSha256 !== spec.specSha256 ||
    receipt.manifestSha256 !== manifest.manifestSha256 ||
    receipt.outputSetSha256 !== sha256(canonicalJson(manifest.outputs))
  ) {
    fail('STALE_BUILD_EVIDENCE');
  }

  if (manifest.assets.length !== spec.assets.length) fail('ASSET_SET_MISMATCH');
  let printCssFound = false;
  for (const asset of manifest.assets) {
    const declared = spec.assets.find(({assetId}) => assetId === asset.assetId);
    if (declared === undefined || declared.source.sha256 !== asset.sourceSha256) {
      fail('ASSET_SET_MISMATCH', asset.assetId);
    }
    const path = resolveOutputFile(options.outputRoot, asset.outputPath);
    const bytes = readFileSync(path);
    if (sha256(bytes) !== asset.outputSha256) fail('OUTPUT_TAMPERED', asset.outputPath);
    if (asset.outputPath.endsWith('.css') && /@media\s+print/iu.test(bytes.toString('utf8'))) {
      printCssFound = true;
    }
  }
  if (!printCssFound) fail('PRINT_CONTRACT_MISSING');

  const expectedTargets = new Set(
    spec.outputs.map(({kind, locale, path}) => `${kind}:${locale}:${path}`),
  );
  const actualTargets = new Set(
    manifest.outputs.map(({kind, locale, path}) => `${kind}:${locale}:${path}`),
  );
  if (
    expectedTargets.size !== actualTargets.size ||
    [...expectedTargets].some((key) => !actualTargets.has(key))
  ) {
    fail('OUTPUT_SET_MISMATCH');
  }
  for (const output of manifest.outputs) {
    const path = resolveOutputFile(options.outputRoot, output.path);
    const bytes = readFileSync(path);
    if (sha256(bytes) !== output.sha256) fail('OUTPUT_TAMPERED', output.path);
    const html = bytes.toString('utf8');
    if (FORBIDDEN_LOCATION.test(html)) fail('PRIVATE_LOCATOR', output.path);
    for (const match of html.matchAll(LOCAL_STORAGE_WRITE)) {
      const key = match[1];
      if (
        key === undefined ||
        !spec.privacy.allowedLocalStorageKeys.includes(key as 'locale' | 'theme')
      ) {
        fail('LEARNER_RESPONSE_PERSISTENCE', `${output.path}:${key ?? 'unknown'}`);
      }
    }
    if (/<(?:input|textarea)\b[^>]*(?:name|data-response)/iu.test(html)) {
      fail('LEARNER_RESPONSE_PERSISTENCE', output.path);
    }
    if (
      output.kind === 'workbook' &&
      (!/role="tablist"/u.test(html) ||
        !/data-copy-target/u.test(html) ||
        /<section[^>]+hidden/iu.test(html))
    ) {
      fail('WORKBOOK_INTERACTION_CONTRACT_MISSING', output.path);
    }
    if (
      output.kind === 'masterclass' &&
      (!/data-previous/u.test(html) ||
        !/data-next/u.test(html) ||
        !/ArrowRight/u.test(html) ||
        !/PageDown/u.test(html) ||
        !/Home/u.test(html) ||
        !/#step-/u.test(html))
    ) {
      fail('MASTERCLASS_NAVIGATION_CONTRACT_MISSING', output.path);
    }
  }
  return {status: 'PASS', verifiedOutputs: manifest.outputs.length};
};
