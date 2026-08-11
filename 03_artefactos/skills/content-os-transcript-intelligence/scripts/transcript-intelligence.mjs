#!/usr/bin/env node
import {createHash} from 'node:crypto';
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {basename, dirname, isAbsolute, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const SKILL_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const COMMANDS = new Set(['ingest', 'analyze', 'caption', 'index', 'search', 'narrative', 'verify', 'package']);
const PUBLIC_FILES = [
  'literal-transcript.json',
  'language-events.json',
  'correction-ledger.json',
  'caption-track.json',
  'pronunciation-glossary.json',
  'semantic-index.json',
  'narrative-map.json',
  'verification.json',
];
const PRIVATE_FILES = ['coaching-private.json'];
const FILLERS = ['eh', 'em', 'um', 'este'];
const TECH_TERMS = ['api', 'dashboard', 'html', 'prompt', 'excel', 'workflow', 'agent', 'backend', 'frontend'];
const FRAMEWORKS = {
  duarte: ['what_is', 'what_could_be', 'new_bliss'],
  transformation: ['friction', 'decision', 'impact'],
  impact: ['problem', 'demonstration', 'observable_change'],
  pas: ['problem', 'consequence', 'response', 'cta'],
};

function fail(code, detail = '') {
  console.error(`COSTI_${code}${detail ? ` ${detail}` : ''}`);
  process.exit(1);
}

function argsOf(argv) {
  const out = {_: []};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) out._.push(token);
    else {
      const key = token.slice(2);
      const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
      out[key] = value;
    }
  }
  return out;
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    fail('INVALID_JSON', `${path}: ${error.message}`);
  }
}

function safeRef(jobPath, ref, label) {
  if (!ref || typeof ref !== 'string' || isAbsolute(ref) || /(^|[/\\])(Users|Downloads|Documents)([/\\]|$)/i.test(ref)) {
    fail('UNSAFE_REF', label);
  }
  const result = resolve(dirname(jobPath), ref);
  if (!existsSync(result)) fail('MISSING_REF', `${label}:${ref}`);
  return result;
}

function validateJob(job, jobPath) {
  const errors = [];
  if (job.schemaVersion !== 'transcript-intelligence-v1') errors.push('schemaVersion');
  if (!job.projectId) errors.push('projectId');
  if (!job.source?.id || !/^[a-f0-9]{64}$/.test(job.source?.sha256 ?? '')) errors.push('source');
  if (!job.source?.rights || !job.source?.authority) errors.push('source-authority');
  if (job.policy?.captionMode !== 'minimal-clarity') errors.push('captionMode');
  safeRef(jobPath, job.asrRef, 'asrRef');
  safeRef(jobPath, job.authorityRef, 'authorityRef');
  for (const [index, ref] of (job.notesRefs ?? []).entries()) safeRef(jobPath, ref, `notesRefs[${index}]`);
  if (job.source.audioAvailable) {
    if (!job.source.audioRef) errors.push('audioRef');
    else safeRef(jobPath, job.source.audioRef, 'audioRef');
  }
  if (errors.length) fail('INVALID_JOB', errors.join(','));
}

function normalize(text) {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function tokens(text) {
  return [...new Set(normalize(text).split(/\s+/).filter((token) => token.length > 1))];
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function span(segment) {
  return {
    sourceId: segment.sourceId,
    segmentId: segment.id,
    startSeconds: segment.startSeconds,
    endSeconds: segment.endSeconds,
  };
}

function writeJson(dir, name, value) {
  mkdirSync(dir, {recursive: true});
  writeFileSync(resolve(dir, name), `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function loadContext(jobPath) {
  const job = readJson(jobPath);
  validateJob(job, jobPath);
  const asr = readJson(safeRef(jobPath, job.asrRef, 'asrRef'));
  const authority = readJson(safeRef(jobPath, job.authorityRef, 'authorityRef'));
  if (asr.schemaVersion !== 'asr-candidate-v1' || !Array.isArray(asr.segments)) fail('INVALID_ASR');
  if (!Array.isArray(authority.terms)) fail('INVALID_AUTHORITY');
  const segments = asr.segments.map((segment) => ({...segment, sourceId: job.source.id}));
  return {job, asr, authority, segments};
}

function build(ctx, framework = 'impact') {
  const {job, asr, authority, segments} = ctx;
  const events = [];
  const corrections = [];
  const glossary = [];
  const captionSegments = [];

  for (const segment of segments) {
    let caption = segment.text;
    for (const term of authority.terms) {
      let found = false;
      for (const alias of term.aliases ?? []) {
        const re = new RegExp(`\\b${escapeRegex(alias)}\\b`, 'giu');
        if (re.test(caption)) {
          const before = caption;
          caption = caption.replace(re, term.canonical);
          corrections.push({
            id: `corr-${corrections.length + 1}`,
            sourceSpan: span(segment),
            before,
            after: caption,
            reason: 'authority-backed-asr-correction',
            authorityRefs: [term.authorityRef],
            material: Boolean(term.material),
          });
          events.push({type: 'asr_error', sourceSpan: span(segment), heardOrCandidate: alias, canonical: term.canonical, authorityRefs: [term.authorityRef]});
          found = true;
        }
      }
      const canonicalRe = new RegExp(`\\b${escapeRegex(term.canonical)}\\b`, 'iu');
      if (found || canonicalRe.test(caption)) {
        glossary.push({canonical: term.canonical, language: term.language, authorityRef: term.authorityRef, publicDisplay: term.canonical, privatePronunciation: 'audio-review-required'});
      }
    }

    for (const filler of FILLERS) {
      const re = new RegExp(`([,;:]?\\s+)${filler}([,;:]?\\s+)`, 'giu');
      if (re.test(caption)) {
        const before = caption;
        caption = caption.replace(re, ' ').replace(/\s{2,}/g, ' ').replace(/,\s*([,.])/g, '$1').trim();
        corrections.push({
          id: `corr-${corrections.length + 1}`,
          sourceSpan: span(segment),
          before,
          after: caption,
          reason: 'non-semantic-disfluency-removed',
          authorityRefs: ['RULE-LQ-CLARITY-MINIMAL'],
          material: false,
        });
        events.push({type: 'disfluency', sourceSpan: span(segment), token: filler, action: 'removed-from-caption'});
      }
    }

    const normalizedCaption = normalize(caption);
    const englishTerms = TECH_TERMS.filter((term) => normalizedCaption.split(' ').includes(term));
    if (englishTerms.length) {
      events.push({type: 'code_switch', sourceSpan: span(segment), terms: englishTerms, action: 'preserve'});
    }
    for (const uncertainty of segment.uncertainties ?? []) {
      events.push({type: 'unidentified_term', sourceSpan: span(segment), token: uncertainty.token, material: Boolean(uncertainty.material), kind: uncertainty.kind});
    }
    captionSegments.push({id: segment.id, speaker: segment.speaker, startSeconds: segment.startSeconds, endSeconds: segment.endSeconds, text: caption, sourceSpan: span(segment)});
  }

  const uniqueGlossary = [...new Map(glossary.map((item) => [item.canonical, item])).values()];
  const literal = {
    schemaVersion: 'literal-transcript-v1',
    state: 'candidate',
    source: job.source,
    asr: {model: asr.model, language: asr.language, authorityClass: 'candidate'},
    segments: segments.map((segment) => ({id: segment.id, speaker: segment.speaker, startSeconds: segment.startSeconds, endSeconds: segment.endSeconds, text: segment.text, sourceSpan: span(segment)})),
  };
  const languageEvents = {schemaVersion: 'language-events-v1', state: 'linguistically-reviewed', events};
  const ledger = {schemaVersion: 'correction-ledger-v1', captionPolicy: 'minimal-clarity', corrections};
  const captions = {schemaVersion: 'caption-track-v1', state: 'linguistically-reviewed', policyRef: 'minimal-clarity', segments: captionSegments};
  const pronunciation = {schemaVersion: 'pronunciation-glossary-v1', entries: uniqueGlossary};
  const coaching = job.policy.privateCoaching
    ? {
        schemaVersion: 'coaching-private-v1',
        privacy: 'private-only',
        status: job.source.audioAvailable ? 'human-listening-required' : 'audio_required',
        events: [],
        prohibitions: ['no-diagnosis', 'no-nationality-inference', 'no-global-english-score'],
      }
    : {schemaVersion: 'coaching-private-v1', privacy: 'private-only', status: 'not-requested', events: []};

  const semanticSegments = captionSegments.map((segment) => {
    const source = segments.find((candidate) => candidate.id === segment.id);
    const allTokens = tokens(`${source.text} ${segment.text} ${(source.roles ?? []).join(' ')}`);
    const technicalTerms = uniqueGlossary.filter((item) => normalize(segment.text).includes(normalize(item.canonical))).map((item) => item.canonical);
    return {
      id: segment.id,
      sourceSpan: segment.sourceSpan,
      speaker: segment.speaker,
      literalText: source.text,
      captionText: segment.text,
      tokens: allTokens,
      entities: technicalTerms,
      topics: source.roles ?? [],
      roles: source.roles ?? [],
      evidenceDensity: (source.roles ?? []).length + technicalTerms.length,
    };
  });
  const semantic = {
    schemaVersion: 'semantic-index-v1',
    retrievalMode: 'lexical-alias-entity-role',
    coverageGaps: ['optional-local-embeddings-not-configured'],
    segments: semanticSegments,
  };

  const selectedFramework = FRAMEWORKS[framework] ? framework : 'impact';
  const requiredRoles = FRAMEWORKS[selectedFramework];
  const beats = requiredRoles.flatMap((role) => {
    const match = semanticSegments.find((segment) => segment.roles.includes(role));
    return match ? [{role, sourceSpans: [match.sourceSpan], text: match.captionText}] : [];
  });
  const missingRoles = requiredRoles.filter((role) => !beats.some((beat) => beat.role === role));
  const disposition = missingRoles.length === 0 ? 'use' : beats.length >= 2 ? 'extend' : beats.length === 1 ? 'reframe' : 'discard';
  const narrative = {
    schemaVersion: 'narrative-map-v1',
    framework: selectedFramework,
    purpose: job.narrative.purpose,
    audience: job.narrative.audience,
    targetSeconds: job.narrative.targetSeconds,
    disposition,
    missingRoles,
    beats,
    sourceGrounded: beats.every((beat) => beat.sourceSpans.length > 0),
  };

  const materialAmbiguities = events.filter((event) => event.type === 'unidentified_term' && event.material);
  const pronunciationRequested = /pronunci|dicci|articul/i.test(job.narrative.purpose);
  const blockers = materialAmbiguities.map((event) => ({code: 'material-ambiguity', sourceSpan: event.sourceSpan, token: event.token}));
  if (pronunciationRequested && !job.source.audioAvailable) blockers.push({code: 'audio-required-for-pronunciation'});
  if (!narrative.sourceGrounded) blockers.push({code: 'ungrounded-narrative-beat'});
  const verification = {
    schemaVersion: 'transcript-intelligence-verification-v1',
    state: blockers.length ? 'candidate' : 'deterministic-passed',
    verdict: blockers.length ? 'FAIL' : 'PASS',
    blockers,
    warnings: coaching.status === 'audio_required' ? ['private-coaching-not-produced-without-audio'] : [],
    publicPackageExcludes: PRIVATE_FILES,
    publicationAuthority: false,
  };
  return {literal, languageEvents, ledger, captions, pronunciation, coaching, semantic, narrative, verification};
}

function persistAll(outDir, artifacts) {
  const mapping = {
    'literal-transcript.json': artifacts.literal,
    'language-events.json': artifacts.languageEvents,
    'correction-ledger.json': artifacts.ledger,
    'caption-track.json': artifacts.captions,
    'pronunciation-glossary.json': artifacts.pronunciation,
    'coaching-private.json': artifacts.coaching,
    'semantic-index.json': artifacts.semantic,
    'narrative-map.json': artifacts.narrative,
    'verification.json': artifacts.verification,
  };
  for (const [name, value] of Object.entries(mapping)) writeJson(outDir, name, value);
}

function search(semantic, query) {
  const intents = readJson(resolve(SKILL_DIR, 'assets/semantic-intents.json')).intents;
  const normalizedQuery = normalize(query);
  const expansion = intents[normalizedQuery] ?? [];
  const queryTokens = tokens(`${query} ${expansion.join(' ')}`);
  const hits = semantic.segments
    .map((segment) => {
      const overlap = queryTokens.filter((token) => segment.tokens.includes(token) || segment.roles.includes(token));
      const exact = normalize(`${segment.literalText} ${segment.captionText}`).includes(normalizedQuery) ? 4 : 0;
      const score = exact + overlap.length * 2 + (overlap.length ? segment.evidenceDensity * 0.1 : 0);
      return {segmentId: segment.id, score, matched: overlap, sourceSpan: segment.sourceSpan, text: segment.captionText, roles: segment.roles};
    })
    .filter((hit) => hit.score > 0)
    .sort((a, b) => b.score - a.score || a.sourceSpan.startSeconds - b.sourceSpan.startSeconds);
  return {schemaVersion: 'semantic-search-results-v1', query, expandedWith: expansion, retrievalMode: semantic.retrievalMode, hits};
}

const args = argsOf(process.argv.slice(2));
const command = args._[0];
if (!COMMANDS.has(command)) fail('USAGE', 'expected ingest|analyze|caption|index|search|narrative|verify|package');
if (!args.job) fail('USAGE', '--job required');
const jobPath = resolve(String(args.job));
if (!existsSync(jobPath)) fail('MISSING_JOB', jobPath);
const ctx = loadContext(jobPath);
const framework = String(args.framework ?? 'impact');
const artifacts = build(ctx, framework);
const outDir = resolve(String(args.out ?? resolve(dirname(jobPath), 'transcript-intelligence-output')));

if (command === 'ingest') writeJson(outDir, 'literal-transcript.json', artifacts.literal);
if (command === 'analyze') {
  writeJson(outDir, 'language-events.json', artifacts.languageEvents);
  writeJson(outDir, 'correction-ledger.json', artifacts.ledger);
  writeJson(outDir, 'pronunciation-glossary.json', artifacts.pronunciation);
  writeJson(outDir, 'coaching-private.json', artifacts.coaching);
}
if (command === 'caption') writeJson(outDir, 'caption-track.json', artifacts.captions);
if (command === 'index') writeJson(outDir, 'semantic-index.json', artifacts.semantic);
if (command === 'narrative') writeJson(outDir, 'narrative-map.json', artifacts.narrative);
if (command === 'search') {
  if (!args.query) fail('USAGE', '--query required for search');
  const results = search(artifacts.semantic, String(args.query));
  writeJson(outDir, 'search-results.json', results);
  console.log(JSON.stringify(results, null, 2));
}
if (command === 'verify') {
  persistAll(outDir, artifacts);
  if (artifacts.verification.verdict !== 'PASS') fail('VERIFICATION_FAILED', artifacts.verification.blockers.map((item) => item.code).join(','));
}
if (command === 'package') {
  if (artifacts.verification.verdict !== 'PASS') fail('PACKAGE_BLOCKED', artifacts.verification.blockers.map((item) => item.code).join(','));
  const publicDir = resolve(outDir, 'public');
  persistAll(outDir, artifacts);
  const values = {
    'literal-transcript.json': artifacts.literal,
    'language-events.json': artifacts.languageEvents,
    'correction-ledger.json': artifacts.ledger,
    'caption-track.json': artifacts.captions,
    'pronunciation-glossary.json': artifacts.pronunciation,
    'semantic-index.json': artifacts.semantic,
    'narrative-map.json': artifacts.narrative,
    'verification.json': artifacts.verification,
  };
  for (const name of PUBLIC_FILES) writeJson(publicDir, name, values[name]);
  const manifest = {
    schemaVersion: 'transcript-intelligence-package-v1',
    state: 'local-evaluation',
    publicFiles: PUBLIC_FILES,
    excludedPrivateFiles: PRIVATE_FILES,
    files: PUBLIC_FILES.map((name) => ({name, sha256: createHash('sha256').update(readFileSync(resolve(publicDir, name))).digest('hex')})),
    publicationAuthority: false,
  };
  writeJson(outDir, 'package-manifest.json', manifest);
}

console.log(`PASS ${command} ${basename(jobPath)} -> ${outDir}`);
