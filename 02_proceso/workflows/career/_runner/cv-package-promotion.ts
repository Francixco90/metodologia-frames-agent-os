import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {resolve, sep} from 'node:path';

import {CareerCvPackageV2Schema, type CareerCvPackageV2} from '../_schema/document-v2.schema.ts';
import {
  verifyCareerCvPackageArtifacts,
  type CvPackageVerifyOptions,
} from './cv-package-verifier.ts';
import {calculateCareerCvPackageV2Hash, parseCareerCvPackageV2} from './cv-spec.ts';

type Receipt = NonNullable<CareerCvPackageV2['publication_receipt']>;
const sha256 = (value: Buffer): string => createHash('sha256').update(value).digest('hex');
const withHash = (draft: Omit<CareerCvPackageV2, 'package_sha256'>): CareerCvPackageV2 => {
  const provisional = {...draft, package_sha256: '0'.repeat(64)};
  return CareerCvPackageV2Schema.parse({
    ...draft,
    package_sha256: calculateCareerCvPackageV2Hash(provisional),
  });
};

/** Build/rebuild solo puede alcanzar READY tras observación material. */
export const verifyAndPromoteCvPackageToReady = async (
  packageInput: unknown,
  specInput: unknown,
  options: CvPackageVerifyOptions,
): Promise<CareerCvPackageV2> => {
  const pkg = parseCareerCvPackageV2(packageInput);
  const verification = await verifyCareerCvPackageArtifacts(pkg, specInput, options);
  if (!verification.promotable) throw new Error('CV_PACKAGE_MATERIAL_VERIFICATION_REQUIRED');
  const verificationByKey = new Map(
    verification.outputs.map((output) => [
      `${output.variant_id}:${output.kind}`,
      output.verification,
    ]),
  );
  const outputs = pkg.outputs.map((output) => ({
    ...output,
    verification: verificationByKey.get(`${output.variant_id}:${output.kind}`) ?? 'UNKNOWN',
  }));
  return withHash({
    ...pkg,
    outputs,
    qa: verification.qa,
    parity_status: verification.parity_status,
    privacy_status: verification.privacy_status,
    state: 'READY',
    approved_spec_sha256: pkg.spec_sha256,
    publication_receipt: null,
  });
};

/** PUBLISHED es un efecto externo separado y exige receipt material ligado al package READY. */
export const publishReadyCvPackage = async (
  packageInput: unknown,
  specInput: unknown,
  receipt: Receipt,
  options: CvPackageVerifyOptions,
): Promise<CareerCvPackageV2> => {
  const pkg = parseCareerCvPackageV2(packageInput);
  if (pkg.state !== 'READY') throw new Error('CV_PACKAGE_READY_REQUIRED');
  const verification = await verifyCareerCvPackageArtifacts(pkg, specInput, options);
  if (!verification.promotable) throw new Error('CV_PACKAGE_REVERIFY_BEFORE_PUBLISH_REQUIRED');
  if (receipt.ready_package_sha256 !== pkg.package_sha256)
    throw new Error('PUBLICATION_RECEIPT_PACKAGE_STALE');
  const target = resolve(options.projectRoot, receipt.receipt_ref);
  const allowed = (options.allowedPrivateRoots ?? ['work/private', 'work/privado']).map((root) =>
    resolve(options.projectRoot, root),
  );
  if (!allowed.some((root) => target === root || target.startsWith(`${root}${sep}`))) {
    throw new Error('PUBLICATION_RECEIPT_PRIVATE_ROOT_REQUIRED');
  }
  if (sha256(await readFile(target)) !== receipt.receipt_sha256) {
    throw new Error('PUBLICATION_RECEIPT_HASH_MISMATCH');
  }
  return withHash({...pkg, state: 'PUBLISHED', publication_receipt: receipt});
};
