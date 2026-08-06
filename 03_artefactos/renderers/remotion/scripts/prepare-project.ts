// prepare-project.ts — A08 orchestrator. Loads campaign inputs, derives the
// timeline, builds props/manifests/registry/receipts and writes them to the
// vs-001 project. Pure builders live in `prepare-project/`; this file sequences
// them and computes the hash-bound digests that bind every output. [CÓDIGO]
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {format, resolveConfig} from 'prettier';
import YAML from 'yaml';

import {buildAssetsManifest} from './prepare-project/build-assets-manifest.ts';
import {buildComponentRegistry} from './prepare-project/build-component-registry.ts';
import {buildPreflight} from './prepare-project/build-preflight.ts';
import {buildRightsReceipt} from './prepare-project/build-rights-receipt.ts';
import {buildComponents} from './prepare-project/build-components.ts';
import {buildProps} from './prepare-project/build-props.ts';
import {buildRenderManifest} from './prepare-project/build-render-manifest.ts';
import {createWriter} from './prepare-project/outputs.ts';
import {renderPostproductionLedger} from './prepare-project/postproduction-ledger.ts';
import {loadAndValidateInputs} from './prepare-project/validate-inputs.ts';

const root = process.cwd();
const prettierConfig = (await resolveConfig(resolve(root, '.prettierrc.json'))) ?? {};
const sha256 = (value: Uint8Array | string): string =>
  createHash('sha256').update(value).digest('hex');
const writer = createWriter(root, prettierConfig);
const projectDir = 'projects/vs-001-source-to-campaign/remotion';

const {copy, timeline, rawBeatMap, rawCaptions, rawClaimLedger, rawCommitteeDecision} =
  loadAndValidateInputs(root);
const props = buildProps(copy, timeline);
const components = buildComponents(root, sha256);
const assetsManifest = buildAssetsManifest({copy, components, root, sha256});

const assetsManifestText = await format(YAML.stringify(assetsManifest, {lineWidth: 0}), {
  ...prettierConfig,
  parser: 'yaml',
});
const assetsManifestDigest = sha256(assetsManifestText);
writer.writeText(`${projectDir}/assets-manifest.yml`, assetsManifestText);

const componentRegistry = buildComponentRegistry({copy, components, assetsManifestDigest});
const componentRegistryText = await format(YAML.stringify(componentRegistry, {lineWidth: 0}), {
  ...prettierConfig,
  parser: 'yaml',
});
const componentRegistryDigest = sha256(componentRegistryText);
writer.writeText(`${projectDir}/04-component-registry.yml`, componentRegistryText);
writer.writeText('registries/components/component-registry.yml', componentRegistryText);

const inputPropsText = await format(JSON.stringify(props), {...prettierConfig, parser: 'json'});
const inputPropsDigest = sha256(inputPropsText);
writer.writeText(`${projectDir}/05-input-props.json`, inputPropsText);

const rendererEntryPath = 'renderers/remotion/src/index.ts';
const digests = {
  inputProps: inputPropsDigest,
  assetsManifest: assetsManifestDigest,
  componentRegistry: componentRegistryDigest,
  rendererEntryPath,
  rendererEntry: sha256(readFileSync(resolve(root, rendererEntryPath))),
  rawBeatMap: sha256(rawBeatMap),
  rawCaptions: sha256(rawCaptions),
  rawCommitteeDecision: sha256(rawCommitteeDecision),
  lockfile: sha256(readFileSync(resolve(root, 'pnpm-lock.yaml'))),
};

const preflight = buildPreflight({
  copy,
  timeline,
  claimLedgerDigest: sha256(rawClaimLedger),
  assetsManifestDigest,
  props,
});
const renderManifest = buildRenderManifest({copy, preflight, digests});
const rightsReceipt = buildRightsReceipt({copy, assetsManifest, assetsManifestDigest});

await writer.writeYaml(`${projectDir}/06-render-manifest.yml`, renderManifest);
await writer.writeJson(`${projectDir}/receipts/preflight-render-input.json`, preflight);
await writer.writeYaml(`${projectDir}/receipts/assets-rights.yml`, rightsReceipt);
await writer.writeMarkdown(
  `${projectDir}/07-postproduction-ledger.md`,
  renderPostproductionLedger(copy, timeline),
);

console.info(
  `Prepared A08 props and manifests: duration=${timeline.durationInFrames} assets=${assetsManifest.binary_assets.length} input=${inputPropsDigest}.`,
);