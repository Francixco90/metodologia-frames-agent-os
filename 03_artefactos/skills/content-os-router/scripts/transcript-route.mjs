#!/usr/bin/env node
import {readFileSync} from 'node:fs';

const target = process.argv[2];
if (!target) {
  console.error('usage: transcript-route.mjs <intent.json>');
  process.exit(2);
}
const intent = JSON.parse(readFileSync(target, 'utf8'));
const voiceIntent = /transcrip|subt[ií]t|dicci|pronunci|narrativ|semantic/iu.test(intent.request ?? '');
if (!voiceIntent || !['transcript', 'audio', 'footage', 'text'].includes(intent.source_type)) {
  console.error('transcript-route: unsupported intent');
  process.exit(1);
}
if (intent.offline !== true) {
  console.error('transcript-route: offline required');
  process.exit(1);
}
console.log(JSON.stringify({
  route: 'content-os-transcript-intelligence',
  capability_map: ['content-os-transcript-intelligence'],
  offline: true,
}));
