import {escapeRegex, normalize, span} from './context.mjs';

const FILLERS = ['eh', 'em', 'um', 'este'];
const TECH_TERMS = ['api', 'dashboard', 'html', 'prompt', 'excel', 'workflow', 'agent', 'backend', 'frontend'];

export function buildLinguistic(ctx) {
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
        if (!re.test(caption)) continue;
        const before = caption;
        caption = caption.replace(re, term.canonical);
        corrections.push({
          id: `corr-${corrections.length + 1}`,
          sourceSpan: span(segment), before, after: caption,
          reason: 'authority-backed-asr-correction', authorityRefs: [term.authorityRef], material: Boolean(term.material),
        });
        events.push({type: 'asr_error', sourceSpan: span(segment), heardOrCandidate: alias, canonical: term.canonical, authorityRefs: [term.authorityRef]});
        found = true;
      }
      const canonicalRe = new RegExp(`\\b${escapeRegex(term.canonical)}\\b`, 'iu');
      if (found || canonicalRe.test(caption)) {
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
      events.push({type: 'unidentified_term', sourceSpan: span(segment), token: uncertainty.token, material: Boolean(uncertainty.material), kind: uncertainty.kind});
    }
    captionSegments.push({id: segment.id, speaker: segment.speaker, startSeconds: segment.startSeconds, endSeconds: segment.endSeconds, text: caption, sourceSpan: span(segment)});
  }
  const uniqueGlossary = [...new Map(glossary.map((item) => [item.canonical, item])).values()];
  const literal = {
    schemaVersion: 'literal-transcript-v1', state: 'candidate', source: job.source,
    asr: {model: asr.model, language: asr.language, authorityClass: 'candidate'},
    segments: segments.map((segment) => ({id: segment.id, speaker: segment.speaker, startSeconds: segment.startSeconds, endSeconds: segment.endSeconds, text: segment.text, sourceSpan: span(segment)})),
  };
  const coaching = job.policy.privateCoaching ? {
    schemaVersion: 'coaching-private-v1', privacy: 'private-only',
    status: job.source.audioAvailable ? 'human-listening-required' : 'audio_required', events: [],
    prohibitions: ['no-diagnosis', 'no-nationality-inference', 'no-global-english-score'],
  } : {schemaVersion: 'coaching-private-v1', privacy: 'private-only', status: 'not-requested', events: []};
  return {
    literal,
    languageEvents: {schemaVersion: 'language-events-v1', state: 'linguistically-reviewed', events},
    ledger: {schemaVersion: 'correction-ledger-v1', captionPolicy: 'minimal-clarity', corrections},
    captions: {schemaVersion: 'caption-track-v1', state: 'linguistically-reviewed', policyRef: 'minimal-clarity', segments: captionSegments},
    pronunciation: {schemaVersion: 'pronunciation-glossary-v1', entries: uniqueGlossary},
    coaching, uniqueGlossary, captionSegments,
  };
}
