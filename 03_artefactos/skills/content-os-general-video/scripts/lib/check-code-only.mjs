import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';

export function prepareCodeOnlyFixture({temp, sha, updateJson}) {
  writeFileSync(resolve(temp, 'frame.ppm'), 'P3\n1 1\n255\n0 0 0\n');
  writeFileSync(resolve(temp, 'tone.wav'), 'RIFF0000WAVEfmt ');
  const frameHash = sha(resolve(temp, 'frame.ppm'));
  const toneHash = sha(resolve(temp, 'tone.wav'));
  updateJson(resolve(temp, 'asset-manifest.json'), (value) => {
    for (const asset of value.assets) {
      if (asset.id === 'frame') asset.sha256 = asset.generator.configSha256 = frameHash;
      if (asset.id === 'tone') asset.sha256 = asset.generator.configSha256 = toneHash;
    }
    return value;
  });
  updateJson(resolve(temp, 'piece-scripts.json'), (value) => {
    for (const piece of value.pieces) {
      piece.dependencies.find((dependency) => dependency.id === 'tone').sha256 = toneHash;
      piece.layers.audio = toneHash;
    }
    return value;
  });
  updateJson(resolve(temp, 'workflow-state.json'), (value) => {
    value.assetManifestSha256 = sha(resolve(temp, 'asset-manifest.json'));
    const scriptHash = sha(resolve(temp, 'piece-scripts.json'));
    value.scriptSha256 = scriptHash;
    value.pieceScriptsSha256 = scriptHash;
    return value;
  });
}

export function validateMediaReceipt({temp, errors, prefix}) {
  const receiptPath = resolve(temp, '.frames-video/render-receipt.json');
  if (!existsSync(receiptPath)) {
    errors.push(`${prefix}MISSING_RENDER_RECEIPT_AFTER_RENDER`);
    return false;
  }
  const receipt = JSON.parse(readFileSync(receiptPath));
  if (receipt.outputs.length !== 2 || receipt.outputs.some((output) => !output.measurements?.outputSha256 || !output.measurements?.pcmSha256)) errors.push(`${prefix}REAL_RENDER_MEASUREMENTS`);
  if (receipt.outputs.some((output) => output.layerArtifacts?.bodyArtifact?.cleanupVerification?.pass !== true || output.layerArtifacts.bodyArtifact.cleanupVerification.cleanedBodySha256 !== output.layerArtifacts.bodyArtifact.sha256 || output.layerArtifacts.bodyArtifact.cleanupVerification.filterOrder !== 'cleanup-before-treatment')) errors.push(`${prefix}CLEAN_BODY_RECEIPT`);
  return true;
}
