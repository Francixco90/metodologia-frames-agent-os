import {escapeRegex, normalize, span} from './context.mjs';

const FILLERS = ['eh', 'em', 'um', 'este'];
const TECH_TERMS = ['api', 'dashboard', 'html', 'prompt', 'excel', 'workflow', 'agent', 'backend', 'frontend'];

export function buildLinguistic(ctx) {
  const {job, asr, authority, verifiedAuthorityRefs, segments, clocks, provenance, compatibility} = ctx;
  const events = [];
  const corrections = [];
  const glossary = [];
  const captionSegments = [];
  for (const segment of segments) {
    let caption = segment.text;
    for (const term of authority.terms) {
      let found = false;
      let materialAuthorityMissing = false;
      const authorityVerified = term.verified === true && Boolean(term.authorityClass) && Boolean(term.authorityRef) && verifiedAuthorityRefs.has(term.authorityRef);
      for (const alias of term.aliases ?? []) {
        const re = new RegExp(`\\b${escapeRegex(alias)}\\b`, 'giu');
        if (!re.test(caption)) continue;
        if (term.material && !authorityVerified) {
          events.push({
            type: 'material_authority_missing', sourceSpan: span(segment), candidate: alias,
            canonical: term.canonical, materialKind: term.materialKind ?? 'claim', authorityRefs: [term.authorityRef].filter(Boolean),
          });
          materialAuthorityMissing = true;
          continue;
        }
        const before = caption;
        caption = caption.replace(re, term.canonical);
        corrections.push({
          id: `corr-${corrections.length + 1}`,
          sourceSpan: span(segment), before, after: caption,
          reason: 'authority-backed-asr-correction', authorityRefs: [term.authorityRef],
          authorityClass: term.authorityClass ?? 'legacy-declared-authority', authorityVerified,
          material: Boolean(term.material), materialKind: term.materialKind ?? null,
        });
        events.push({type: 'asr_error', sourceSpan: span(segment), heardOrCandidate: alias, canonical: term.canonical, authorityRefs: [term.authorityRef]});
        found = true;
      }
      const canonicalRe = new RegExp(`\\b${escapeRegex(term.canonical)}\\b`, 'iu');
      const canonicalPresent = canonicalRe.test(caption);
      if (term.material && canonicalPresent && !authorityVerified && !materialAuthorityMissing) {
        events.push({
          type: 'material_authority_missing', sourceSpan: span(segment), candidate: term.canonical,
          canonical: term.canonical, materialKind: term.materialKind ?? 'claim', authorityRefs: [term.authorityRef].filter(Boolean),
        });
      }
      if (found || canonicalPresent) {
        glossary.push({canonical: term.canonical, language: term.language, authorityRef: term.authorityRef, publicDisplay: term.canonical, privatePronunciation: 'audio-review-required'});
      }
    }
    for (const filler of FILLERS) {
      const re = new RegExp(`([,;:]?\\s+)${filler}([,;:]?\\s+)`, 'giu');
      if (!re.test(caption)) continue;
      const before = caption;
      caption = caption.replace(re, ' ').replace(/\s{2,}/g, ' ').replace(/,\s*([,.])/g, '$1').trim();
      corrections.push({
        id: `corr-${corrections.length + 1}`,
        sourceSpan: span(segment), before, after: caption,
        reason: 'non-semantic-disfluency-removed', authorityRefs: ['RULE-LQ-CLARITY-MINIMAL'], material: false,
      });
      events.push({type: 'disfluency', sourceSpan: span(segment), token: filler, action: 'removed-from-caption'});
    }
    const englishTerms = TECH_TERMS.filter((term) => normalize(caption).split(' ').includes(term));
    if (englishTerms.length) events.push({type: 'code_switch', sourceSpan: span(segment), terms: englishTerms, action: 'preserve'});
    for (const uncertainty of segment.uncertainties ?? []) {
      const resolution = (authority.resolutions ?? []).find((candidate) => candidate.segmentId === segment.id && candidate.token === uncertainty.token && candidate.verified === true && candidate.authorityRef && verifiedAuthorityRefs.has(candidate.authorityRef));
      events.push({
        type: resolution ? 'material_ambiguity_resolved' : 'unidentified_term',
        sourceSpan: span(segment), token: uncertainty.token, material: Boolean(uncertainty.material),
        kind: uncertainty.kind, authorityRef: resolution?.authorityRef ?? null, resolvedAs: resolution?.canonical ?? null,
      });
    }
    captionSegments.push({id: segment.id, speaker: segment.speaker, startSeconds: segment.clocks.local.startSeconds, endSeconds: segment.clocks.local.endSeconds, text: caption, sourceSpan: span(segment)});
  }
  const uniqueGlossary = [...new Map(glossary.map((item) => [item.canonical, item])).values()];
  const literal = {
    schemaVersion: 'literal-transcript-v1', state: 'candidate', source: job.source,
    evidenceClass: job.source.audioAvailable ? 'literal_audio' : 'asr_candidate',
    transcriptionBasis: job.source.audioAvailable ? 'audio-present-human-listening-still-required' : 'asr-candidate-not-audible-truth',
    clocks, provenance,
    asr: {model: asr.model, language: asr.language, authorityClass: 'candidate'},
    segments: segments.map((segment) => ({id: segment.id, speaker: segment.speaker, startSeconds: segment.clocks.local.startSeconds, endSeconds: segment.clocks.local.endSeconds, text: segment.text, evidenceClass: 'asr_candidate', sourceSpan: span(segment)})),
  };
  const coaching = job.policy.privateCoaching ? {
    schemaVersion: 'coaching-private-v1', privacy: 'private-only',
    status: job.source.audioAvailable ? 'human-listening-required' : 'audio_required', events: [],
    prohibitions: ['no-diagnosis', 'no-nationality-inference', 'no-global-english-score'],
  } : {schemaVersion: 'coaching-private-v1', privacy: 'private-only', status: 'not-requested', events: []};
  return {
    literal,
    languageEvents: {schemaVersion: 'language-events-v1', state: 'linguistically-reviewed', clocks, events},
    ledger: {schemaVersion: 'correction-ledger-v1', captionPolicy: 'minimal-clarity', clocks, corrections},
    captions: {schemaVersion: 'caption-track-v1', state: 'linguistically-reviewed', policyRef: 'minimal-clarity', clocks, segments: captionSegments},
    pronunciation: {schemaVersion: 'pronunciation-glossary-v1', entries: uniqueGlossary},
    coaching, uniqueGlossary, captionSegments, provenance, compatibility,
  };
}
