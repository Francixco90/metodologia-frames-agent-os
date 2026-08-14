import {fail, json, load, project, refWithHash, run, shaFile} from './runtime-core.mjs';
import {validateSchema} from './schema-validation.mjs';
import {fileURLToPath} from 'node:url';

const AUDIO_PROCESSING = /(?:loudnorm|dynaudnorm|volume|acompressor|alimiter|speechnorm|anlmdn)/iu;

function binding(state, refKey, hashKey, schema, label) {
  const ref = state[refKey]; const hash = state[hashKey];
  if (!ref && !hash) return null;
  const path = refWithHash(ref, hash, label); const value = load(path, label);
  if (schema) validateSchema(schema, value, label, fail); return {ref, hash: shaFile(path), path, value};
}

const siblingGate = (skill, script, target, label) => run(process.execPath, [fileURLToPath(new URL(`../../../${skill}/scripts/${script}`, import.meta.url)), target], project, label);

function pointInside(point, crop) {
  return point.x >= crop.x && point.x < crop.x + crop.width && point.y >= crop.y && point.y < crop.y + crop.height;
}

function validateFit(fit, source) {
  if (fit.sourceSha256 !== source.sourceSha256) fail(`COMPOSITION_SOURCE_HASH_${fit.pieceId}`);
  const observations = source.watermarkObservations || [];
  if (fit.strategy === 'crop') {
    const crop = fit.crop;
    if (!source.probe.width || !source.probe.height || crop.x + crop.width > source.probe.width || crop.y + crop.height > source.probe.height) fail(`COMPOSITION_CROP_UNSAFE_${fit.pieceId}`);
    const observedTimes = [...source.sampleTimesMs].sort((a, b) => a - b);
    const covered = [...(fit.coveredSampleTimesMs || [])].sort((a, b) => a - b);
    if (json(observedTimes) !== json(covered)) fail(`COMPOSITION_TEMPORAL_COVERAGE_${fit.pieceId}`);
    if (fit.watermarkPolicy === 'excluded-by-crop' && observations.some((item) => item.present && item.points.some((point) => pointInside(point, crop)))) fail(`COMPOSITION_WATERMARK_INCLUDED_${fit.pieceId}`);
    const evidencePath = refWithHash(fit.evidenceRef, fit.evidenceSha256, `COMPOSITION_EVIDENCE_${fit.pieceId}`);
    const evidence = load(evidencePath, `COMPOSITION_EVIDENCE_${fit.pieceId}`);
    validateSchema('composition-fit-evidence-v1.schema.json', evidence, `COMPOSITION_EVIDENCE_${fit.pieceId}`, fail);
    if (evidence.pieceId !== fit.pieceId || evidence.sourceId !== fit.sourceId || evidence.sourceSha256 !== fit.sourceSha256 || json(evidence.crop) !== json(crop)) fail(`COMPOSITION_EVIDENCE_BINDING_${fit.pieceId}`);
    const evidenceTimes = evidence.samples.map((sample) => sample.sampleTimeMs).sort((a, b) => a - b);
    if (new Set(evidenceTimes).size < 2 || json(evidenceTimes) !== json(covered)) fail(`COMPOSITION_EVIDENCE_TIMES_${fit.pieceId}`);
    for (const sample of evidence.samples) {
      refWithHash(sample.frameRef, sample.frameSha256, `COMPOSITION_FRAME_${fit.pieceId}_${sample.sampleTimeMs}`);
      const observation = observations.find((item) => item.sampleTimeMs === sample.sampleTimeMs);
      if (!observation || sample.watermarkPointsExcluded < observation.points.length) fail(`COMPOSITION_EVIDENCE_WATERMARK_${fit.pieceId}_${sample.sampleTimeMs}`);
    }
  }
  if (fit.watermarkPolicy === 'not-present' && observations.some((item) => item.present)) fail(`COMPOSITION_WATERMARK_UNACKNOWLEDGED_${fit.pieceId}`);
}

function validateAudio(piece, analyses) {
  const sources = [...new Set((piece.sourceSpans || []).map((span) => span.sourceId))].map((id) => analyses.get(id)).filter(Boolean);
  const audible = sources.find((source) => source.probe.hasAudio);
  if (audible) {
    if (piece.audioPolicy?.mode !== 'preserve' || piece.audioPolicy.processingAllowed !== false || piece.audioPolicy.sourceId !== audible.sourceId || piece.audioPolicy.sourceSha256 !== audible.sourceSha256) fail(`AUDIO_PRESERVE_REQUIRED_${piece.id}`);
  }
  if (piece.audioPolicy?.mode === 'preserve') {
    const args = piece.render?.args || [];
    if (AUDIO_PROCESSING.test(args.join(' '))) fail(`AUDIO_PROCESSING_FORBIDDEN_${piece.id}`);
    const copy = args.some((arg, index) => ['-c:a', '-acodec', '-c'].includes(arg) && args[index + 1] === 'copy');
    if (!piece.brandedWrapper && !(piece.render?.mode === 'audio-remux' && copy)) fail(`AUDIO_PACKET_PRESERVE_UNPROVEN_${piece.id}`);
  }
}

export function verifyAnalysisContracts(a) {
  const analysis = binding(a.state, 'sourceAnalysisRef', 'sourceAnalysisSha256', null, 'SOURCE_ANALYSIS');
  const composition = binding(a.state, 'compositionFitRef', 'compositionFitSha256', 'composition-fit-v1.schema.json', 'COMPOSITION_FIT');
  const storyboard = binding(a.state, 'storyboardRef', 'storyboardSha256', 'storyboard-multiframe-v1.schema.json', 'STORYBOARD');
  const brandRef = a.spec.visual?.brandKitRef; const budgetRef = a.spec.visual?.visualBudgetRef;
  const brandPath = brandRef ? refWithHash(brandRef, a.spec.visual.brandKitSha256, 'CREATIVE_BRAND_KIT') : null;
  const budgetPath = budgetRef ? refWithHash(budgetRef, a.spec.visual.visualBudgetSha256, 'VISUAL_BUDGET') : null;
  if (analysis) siblingGate('content-os-media', 'source-analysis-gate.mjs', analysis.path, 'SOURCE_ANALYSIS_GATE');
  if (brandPath) siblingGate('content-os-creative', 'brand-kit-gate.mjs', brandPath, 'BRAND_KIT_GATE');
  if (budgetPath) {
    const budget = load(budgetPath, 'VISUAL_BUDGET'); validateSchema('../../content-os-creative/schemas/visual-budget-v1.schema.json', budget, 'VISUAL_BUDGET', fail);
  }
  if (a.state.storyboard === 'yes' && !storyboard) fail('STORYBOARD_BINDING_REQUIRED');
  if (!analysis && !composition && !storyboard) return null;
  if (!analysis || !composition) fail('ANALYSIS_COMPOSITION_PAIR_REQUIRED');
  if (analysis.value.projectId !== a.state.projectId || composition.value.projectId !== a.state.projectId || composition.value.sourceAnalysisRef !== analysis.ref || composition.value.sourceAnalysisSha256 !== analysis.hash) fail('ANALYSIS_PROJECT_BINDING');
  const frozen = new Map(a.sourcePack.sources.map((source) => [source.id, source]));
  const analyses = new Map();
  for (const source of analysis.value.sources) {
    if (frozen.get(source.sourceId)?.sha256 !== source.sourceSha256) fail(`SOURCE_ANALYSIS_DRIFT_${source.sourceId}`);
    if (new Set(source.sampleTimesMs).size !== source.sampleTimesMs.length || source.watermarkObservations.some((item) => !source.sampleTimesMs.includes(item.sampleTimeMs))) fail(`SOURCE_ANALYSIS_SAMPLES_${source.sourceId}`);
    if (source.state !== 'ready' || source.editorialDecision === 'blocked') fail(`SOURCE_ANALYSIS_BLOCKED_${source.sourceId}`);
    analyses.set(source.sourceId, source);
  }
  const fits = new Map();
  for (const fit of composition.value.fits) { const source = analyses.get(fit.sourceId); if (!source) fail(`COMPOSITION_SOURCE_${fit.pieceId}`); validateFit(fit, source); fits.set(fit.pieceId, fit); }
  for (const piece of a.scripts.pieces || []) {
    if (piece.decision === 'discard') continue;
    if (piece.sourceAnalysis?.ref !== analysis.ref || piece.sourceAnalysis?.sha256 !== analysis.hash || piece.compositionFit?.ref !== composition.ref || piece.compositionFit?.sha256 !== composition.hash) fail(`PIECE_ANALYSIS_BINDING_${piece.id}`);
    const fit = fits.get(piece.id); if (!fit || fit.targetWidth !== piece.format.width || fit.targetHeight !== piece.format.height) fail(`PIECE_COMPOSITION_FIT_${piece.id}`);
    if (brandPath && (piece.creativeBrandKit?.ref !== brandRef || piece.creativeBrandKit?.sha256 !== shaFile(brandPath))) fail(`PIECE_BRAND_KIT_BINDING_${piece.id}`);
    if (budgetPath && (piece.visualBudget?.ref !== budgetRef || piece.visualBudget?.sha256 !== shaFile(budgetPath))) fail(`PIECE_VISUAL_BUDGET_BINDING_${piece.id}`);
    validateAudio(piece, analyses);
  }
  if (storyboard) {
    if (storyboard.value.projectId !== a.state.projectId || storyboard.value.specId !== a.state.specId || storyboard.value.specSha256 !== a.state.specSha256) fail('STORYBOARD_SPEC_BINDING');
    const orders = storyboard.value.frames.map((frame) => frame.order); if (new Set(orders).size !== orders.length || json([...orders].sort((a, b) => a - b)) !== json(orders)) fail('STORYBOARD_FRAME_ORDER');
    for (const frame of storyboard.value.frames) {
      const piece = a.scripts.pieces.find((item) => item.id === frame.pieceId); if (!piece || !piece.visualSpans[frame.visualSourceSpanIndex] || frame.compositionFitPieceId !== piece.id || frame.atMs > piece.format.durationMs) fail(`STORYBOARD_FRAME_BINDING_${frame.id}`);
    }
  }
  return {sourceAnalysisSha256: analysis.hash, compositionFitSha256: composition.hash, ...(storyboard ? {storyboardSha256: storyboard.hash} : {})};
}
