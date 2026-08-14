#!/usr/bin/env node
import {readFileSync} from 'node:fs';
const target = process.argv[2];
if (!target) { console.error('usage: video-source-route.mjs <intent.json>'); process.exit(2); }
const input = JSON.parse(readFileSync(target, 'utf8'));
const analysis = input.sourceAnalysis;
const reel = input.deliverable === 'reel';
const specKeys = ['purpose', 'audience', 'hook', 'evidence', 'impact', 'cta', 'targetDurationSeconds'];
if (!analysis?.source?.sha256 || !input.sourceAnalysisRef || !input.sourceAnalysisSha256) { console.error('video-source-route: source-analysis-required'); process.exit(1); }
if (reel && (specKeys.some((key) => !input.reelSpec?.[key]) || !(input.reelSpec.evidence?.length > 0))) { console.error('video-source-route: reel-spec-first-required'); process.exit(1); }
let route = 'contain';
let reason = 'contain-default-preserves-source';
if (analysis.analysisState === 'blocked' || analysis.audioClass === 'unusable') { route = 'reject'; reason = 'source-analysis-blocked'; }
else if (input.requestedLayout === 'crop-safe' && analysis.visual?.cropSafety?.safe === true && analysis.visual.cropSafety.evidence?.length > 0) { route = 'crop-safe'; reason = 'crop-safe-evidence-present'; }
console.log(JSON.stringify({schemaVersion:'video-source-route-v1', route, sourceAnalysisRef:input.sourceAnalysisRef, sourceAnalysisSha256:input.sourceAnalysisSha256, reasonCodes:[reason], capabilityMap:['content-os-media','content-os-creative', reel ? 'content-os-talking-head-recut' : 'content-os-general-video'], reelSpecFirst:reel}));
