// check-brand/validate-brand.ts — orchestrates the brand/channel validation
// sub-checks into one error list. [CÓDIGO]
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import type {z} from 'zod';

import {renderBrandProjections} from '../generate-brand-projections.ts';
import {brandProfileSchema, tokenSchema} from './schemas-core.ts';
import {brandAdaptationDecisionSchema} from './schemas-channels-fonts.ts';
import {readYaml} from './helpers.ts';
import {validateSourceBundleObject, validateVoiceProfileObject} from './validators.ts';
import {validateChannelProfileObject} from './channel-validators.ts';
import {checkFontRights} from './font-rights.ts';
import {scanLocatorsAndColors} from './locator-scan.ts';

type TokenContract = z.infer<typeof tokenSchema>;

export const validateBrand = (root = process.cwd()): string[] => {
  const errors: string[] = [];
  let tokens: TokenContract | undefined;
  try {
    const bundle = readYaml(root, 'registries/brand/source-bundle-v1.yml');
    errors.push(...validateSourceBundleObject(bundle));
  } catch (error) {
    errors.push(`BR001 source bundle unreadable: ${String(error)}`);
  }
  try {
    const brandProfile = brandProfileSchema.parse(
      readYaml(root, 'registries/brand/brand-profile-v2.yml'),
    );
    for (const forbiddenState of ['HUMAN_APPROVED', 'READY', 'PUBLISHED']) {
      if (!brandProfile.gate_effect.does_not_allow.includes(forbiddenState)) {
        errors.push(`BR008 BRAND_VALIDATED must not allow ${forbiddenState}`);
      }
    }
  } catch (error) {
    errors.push(`BR008 invalid BRAND_VALIDATED profile: ${String(error)}`);
  }
  try {
    const voice = readYaml(root, 'registries/brand/voice-profile-v2.yml');
    errors.push(...validateVoiceProfileObject(voice));
  } catch (error) {
    errors.push(`VOICE001 voice profile unreadable: ${String(error)}`);
  }
  try {
    errors.push(
      ...validateChannelProfileObject(
        readYaml(root, 'registries/channels/instagram-profile-v1.yml'),
      ),
    );
  } catch (error) {
    errors.push(`CHANNEL001 channel profile unreadable: ${String(error)}`);
  }
  try {
    brandAdaptationDecisionSchema.parse(
      readYaml(root, 'registries/brand/brand-adaptation-decision-v1.yml'),
    );
  } catch (error) {
    errors.push(`VOICE005 invalid channel adaptation contract: ${String(error)}`);
  }
  try {
    tokens = tokenSchema.parse(readYaml(root, 'brand/tokens/brand-tokens.yml'));
  } catch (error) {
    errors.push(`BR005 authored token contract invalid: ${String(error)}`);
  }
  if (tokens !== undefined) {
    const projections = renderBrandProjections(tokens);
    for (const [relativePath, expected] of Object.entries(projections)) {
      const actual = readFileSync(resolve(root, relativePath), 'utf8');
      if (actual !== expected) {
        errors.push(`BR005 byte-level token projection drift ${relativePath}`);
      }
    }
  }
  errors.push(...checkFontRights(root));
  errors.push(...scanLocatorsAndColors(root));
  return errors;
};