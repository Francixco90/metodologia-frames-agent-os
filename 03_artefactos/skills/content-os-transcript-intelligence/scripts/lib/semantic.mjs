import {normalize, readJson, span, tokens} from './context.mjs';

const FRAMEWORKS = {
  duarte: ['what_is', 'what_could_be', 'new_bliss'],
  transformation: ['friction', 'decision', 'impact'],
  impact: ['problem', 'demonstration', 'observable_change'],
  pas: ['problem', 'consequence', 'response', 'cta'],
};

export function buildSemantic(ctx, linguistic, framework = 'impact') {
  const {job, segments} = ctx;
  const semanticSegments = linguistic.captionSegments.map((segment) => {
    const source = segments.find((candidate) => candidate.id === segment.id);
    const technicalTerms = linguistic.uniqueGlossary
      .filter((item) => normalize(segment.text).includes(normalize(item.canonical)))
      .map((item) => item.canonical);
    return {
      id: segment.id, sourceSpan: segment.sourceSpan, speaker: segment.speaker,
      literalText: source.text, captionText: segment.text,
      tokens: tokens(`${source.text} ${segment.text} ${(source.roles ?? []).join(' ')}`),
      entities: technicalTerms, topics: source.roles ?? [], roles: source.roles ?? [],
      evidenceDensity: (source.roles ?? []).length + technicalTerms.length,
    };
  });
  const semantic = {
    schemaVersion: 'semantic-index-v1', retrievalMode: 'lexical-alias-entity-role',
    coverageGaps: ['optional-local-embeddings-not-configured'], segments: semanticSegments,
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
    schemaVersion: 'narrative-map-v1', framework: selectedFramework,
    purpose: job.narrative.purpose, audience: job.narrative.audience,
    targetSeconds: job.narrative.targetSeconds, disposition, missingRoles, beats,
    sourceGrounded: beats.every((beat) => beat.sourceSpans.length > 0),
  };
  const materialAmbiguities = linguistic.languageEvents.events.filter((event) => event.type === 'unidentified_term' && event.material);
  const blockers = materialAmbiguities.map((event) => ({code: 'material-ambiguity', sourceSpan: event.sourceSpan, token: event.token}));
  if (/pronunci|dicci|articul/i.test(job.narrative.purpose) && !job.source.audioAvailable) blockers.push({code: 'audio-required-for-pronunciation'});
  if (!narrative.sourceGrounded) blockers.push({code: 'ungrounded-narrative-beat'});
  const verification = {
    schemaVersion: 'transcript-intelligence-verification-v1',
    state: blockers.length ? 'candidate' : 'deterministic-passed', verdict: blockers.length ? 'FAIL' : 'PASS', blockers,
    warnings: linguistic.coaching.status === 'audio_required' ? ['private-coaching-not-produced-without-audio'] : [],
    publicPackageExcludes: ['coaching-private.json'], publicationAuthority: false,
  };
  return {semantic, narrative, verification};
}

export function searchSemantic(skillDir, semantic, query) {
  const intents = readJson(`${skillDir}/assets/semantic-intents.json`).intents;
  const normalizedQuery = normalize(query);
  const expansion = intents[normalizedQuery] ?? [];
  const queryTokens = tokens(`${query} ${expansion.join(' ')}`);
  const hits = semantic.segments.map((segment) => {
    const overlap = queryTokens.filter((token) => segment.tokens.includes(token) || segment.roles.includes(token));
    const exact = normalize(`${segment.literalText} ${segment.captionText}`).includes(normalizedQuery) ? 4 : 0;
    const score = exact + overlap.length * 2 + (overlap.length ? segment.evidenceDensity * 0.1 : 0);
    return {segmentId: segment.id, score, matched: overlap, sourceSpan: segment.sourceSpan, text: segment.captionText, roles: segment.roles};
  }).filter((hit) => hit.score > 0).sort((a, b) => b.score - a.score || a.sourceSpan.startSeconds - b.sourceSpan.startSeconds);
  return {schemaVersion: 'semantic-search-results-v1', query, expandedWith: expansion, retrievalMode: semantic.retrievalMode, hits};
}
