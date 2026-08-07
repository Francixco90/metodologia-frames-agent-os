// check-brand.ts — orchestrator for the brand/channel V2 validation gate.
//
// Schemas live in `check-brand/schemas-{core,channels-fonts}.ts` (contract
// carve-out ≤300). Validation logic: `check-brand/{validators,channel-validators,
// font-rights,locator-scan,validate-brand}.ts`. Re-exports preserve the public
// surface pinned by `tests/contract/brand-v2.test.ts`. [CONFIG]
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';

import {validateBrand} from './check-brand/validate-brand.ts';
import {validateSourceBundleObject, validateVoiceProfileObject} from './check-brand/validators.ts';
import {
  evaluateChannelFreshness,
  validateChannelProfileObject,
} from './check-brand/channel-validators.ts';

export {
  evaluateChannelFreshness,
  validateBrand,
  validateChannelProfileObject,
  validateSourceBundleObject,
  validateVoiceProfileObject,
};

const isMain =
  process.argv[1] !== undefined && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isMain) {
  const errors = validateBrand();
  if (errors.length > 0) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
  } else {
    console.info(
      'PASS BRAND/CHANNEL V2: authority, voice, official freshness, tokens, offline fonts and rights are governed.',
    );
  }
}
