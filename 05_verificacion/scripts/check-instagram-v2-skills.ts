import {
  LICENSE_RECEIPT_REF,
  LICENSE_TEXT_REF,
  PASS_MESSAGE,
  SKILLS,
} from './lib/instagram-v2-contract.ts';
import {createInstagramV2FileAccess} from './lib/instagram-v2-files.ts';
import {
  validateLicenseReceipt,
  validateRegistryPolicy,
  validateSkill,
} from './lib/instagram-v2-validation.ts';
import type {Registry, SharedLicenseReceipt} from './lib/instagram-v2-contract.ts';

const root = process.cwd();
const files = createInstagramV2FileAccess(root);
const registry = files.readYaml<Registry>('registries/skills/skill-registry.yml');
const errors = validateRegistryPolicy(registry);
const license = {
  textRef: LICENSE_TEXT_REF,
  textHash: files.fileSha256(LICENSE_TEXT_REF),
  receiptRef: LICENSE_RECEIPT_REF,
  receiptHash: files.fileSha256(LICENSE_RECEIPT_REF),
};

for (const skill of SKILLS) {
  errors.push(...validateSkill(skill, registry, license, files));
}

errors.push(
  ...validateLicenseReceipt(files.readYaml<SharedLicenseReceipt>(LICENSE_RECEIPT_REF), SKILLS),
);

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.info(PASS_MESSAGE);
}
