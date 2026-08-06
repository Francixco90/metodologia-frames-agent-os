// check-brand/font-rights.ts — offline font manifest + OFL rights-receipt check.
// Extracted from validateBrand. [CÓDIGO]
import {existsSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {fontManifestSchema, rightsReceiptSchema} from './schemas-channels-fonts.ts';
import {readYaml, sha256} from './helpers.ts';

export const checkFontRights = (root: string): string[] => {
  const errors: string[] = [];
  try {
    const manifest = fontManifestSchema.parse(readYaml(root, 'brand/fonts/font-manifest.yml'));
    const rawPrefix = `https://raw.githubusercontent.com/google/fonts/${manifest.source_commit}/`;
    for (const font of manifest.fonts) {
      if (!font.source_url.startsWith(rawPrefix)) {
        errors.push(`BR007 RIGHTS_GAP unpinned or non-official URL ${font.path}`);
      }
      const fontPath = resolve(root, font.path);
      const licensePath = resolve(root, font.license_path);
      if (!existsSync(fontPath)) {
        errors.push(`BR007 RIGHTS_GAP missing font ${font.path}`);
      } else if (sha256(readFileSync(fontPath)) !== font.sha256) {
        errors.push(`BR007 RIGHTS_GAP font hash mismatch ${font.path}`);
      }
      if (!existsSync(licensePath)) {
        errors.push(`BR007 RIGHTS_GAP missing license ${font.license_path}`);
      } else {
        const licenseBytes = readFileSync(licensePath);
        if (sha256(licenseBytes) !== font.license_sha256) {
          errors.push(`BR007 RIGHTS_GAP license hash mismatch ${font.license_path}`);
        }
        if (!licenseBytes.toString('utf8').includes('SIL OPEN FONT LICENSE Version 1.1')) {
          errors.push(`BR007 RIGHTS_GAP unexpected license text ${font.license_path}`);
        }
      }
    }
    rightsReceiptSchema.parse(readYaml(root, 'brand/fonts/rights-receipt.yml'));
  } catch (error) {
    errors.push(`BR007 RIGHTS_GAP invalid font evidence: ${String(error)}`);
  }
  return errors;
};