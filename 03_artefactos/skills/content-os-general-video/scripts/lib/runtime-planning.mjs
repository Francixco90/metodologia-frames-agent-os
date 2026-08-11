import {
  LAYERS, artifacts, existsSync, fail, json, load, loadState, projectPath,
  shaBytes, shaFile, statePath, verifyAssets, verifyBinding, verifyScripts,
  verifySources, write,
} from './runtime-core.mjs';
import {validateSchema} from './schema-validation.mjs';

export function assertRenderable(artifactsValue) {
  const blocked = artifactsValue.scripts.pieces.filter((piece) => piece.decision !== 'use');
  if (blocked.length) fail(`EDITORIAL_DECISION_BLOCKS_RENDER ${blocked.map((piece) => `${piece.id}:${piece.decision}`).join(',')}`);
}

function layerKeys(piece, specSha256) {
  const grouped = Object.fromEntries(LAYERS.map((layer) => [layer, []]));
  for (const dep of piece.dependencies || []) {
    const layer = ['source', 'script'].includes(dep.kind) ? 'body' : dep.kind === 'caption' ? 'caption' : dep.kind === 'curtain' ? 'curtain' : dep.kind === 'audio' ? 'audio' : 'overlay';
    grouped[layer].push(`${dep.id}:${dep.sha256}`);
  }
  const editorial = shaBytes(json({scriptMode: piece.scriptMode, decision: piece.decision, purpose: piece.purpose, audience: piece.audience, hook: piece.hook, impact: piece.impact, offerBridge: piece.offerBridge, cta: piece.cta, sourceSpans: piece.sourceSpans, visualSpans: piece.visualSpans, claims: piece.claims}));
  return Object.fromEntries(LAYERS.map((layer) => [layer, shaBytes(json({specSha256, layer, editorial: layer === 'body' ? editorial : null, render: layer === 'body' ? piece.render : null, dependencies: grouped[layer].sort(), declared: piece.layers?.[layer] || null}))]));
}

export function runPlan() {
  const a = artifacts(loadState({allowV1: false})); const hashes = verifyBinding(a); const ids = verifySources(a); verifyAssets(a); verifyScripts(a, ids); assertRenderable(a);
  const planPath = projectPath(a.state.buildManifestRef, 'BUILD_MANIFEST_REF');
  const previous = existsSync(planPath) ? load(planPath, 'PREVIOUS_PLAN') : null;
  const prior = new Map((previous?.pieces || []).map((piece) => [piece.id, piece]));
  const pieces = a.scripts.pieces.map((piece) => {
    const keys = layerKeys(piece, a.state.specSha256); const pieceDefinitionSha256 = shaBytes(json(piece));
    const cacheKey = shaBytes(json({pieceDefinitionSha256, keys})); const old = prior.get(piece.id);
    const outputPath = projectPath(piece.output, `OUTPUT_${piece.id}`); const actual = existsSync(outputPath) ? shaFile(outputPath) : null;
    const outputBound = old?.outputSha256 && actual === old.outputSha256;
    const cacheStatus = old?.cacheKey === cacheKey && outputBound ? 'hit' : 'miss';
    const invalidated = old ? [...LAYERS.filter((layer) => old.layerKeys?.[layer] !== keys[layer]), ...(old.pieceDefinitionSha256 !== pieceDefinitionSha256 ? ['piece-definition'] : []), ...(old.cacheKey === cacheKey && !outputBound ? ['output-drift'] : [])] : ['new-piece'];
    const reusedLayers = old ? LAYERS.filter((layer) => old.layerKeys?.[layer] === keys[layer]) : [];
    return {id: piece.id, pieceDefinitionSha256, cacheKey, layerKeys: keys, reusedLayers, cacheStatus, invalidatedBy: cacheStatus === 'hit' ? [] : [...new Set(invalidated)], output: piece.output, ...(cacheStatus === 'hit' ? {outputSha256: actual} : {}), ...(piece.render ? {render: piece.render} : {})};
  });
  const plan = {schemaVersion: 'video-plan-v2', specId: a.state.specId, specSha256: a.state.specSha256, generatedFrom: hashes, pieces};
  validateSchema('video-plan-v2.schema.json', plan, 'PLAN', fail);
  write(planPath, plan); write(statePath, {...a.state, buildManifestSha256: shaFile(planPath), workProductState: 'COMPILADO'});
  console.log(`PASS plan: ${pieces.filter((piece) => piece.cacheStatus === 'miss').length} miss, ${pieces.filter((piece) => piece.cacheStatus === 'hit').length} hit`);
}
