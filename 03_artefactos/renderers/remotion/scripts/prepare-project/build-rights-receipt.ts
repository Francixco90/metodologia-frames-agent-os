// prepare-project/build-rights-receipt.ts — builds the A08 assets rights receipt
// (OFL font license receipts, rights holders, scope, coverage gaps). [CÓDIGO]
import type {buildAssetsManifest} from './build-assets-manifest.ts';
import type {CampaignCopy} from './validate-inputs.ts';

type AssetsManifest = ReturnType<typeof buildAssetsManifest>;

export const buildRightsReceipt = ({
  copy,
  assetsManifest,
  assetsManifestDigest,
}: {
  readonly copy: CampaignCopy;
  readonly assetsManifest: AssetsManifest;
  readonly assetsManifestDigest: string;
}) => ({
  schema_version: 1,
  receipt_id: 'RCP-ASSETS-VS001-001',
  project_id: copy.projectId,
  assets_manifest_sha256: assetsManifestDigest,
  binary_asset_count: assetsManifest.binary_assets.length,
  audio_asset_count: 0,
  procedural_element_count: assetsManifest.procedural_first_party_elements.length,
  rights_holders: [
    'MetodologIA for procedural renderer code',
    'The Work Sans Project Authors for Work Sans',
    'The JetBrains Mono Project Authors for JetBrains Mono',
  ],
  rights_basis: 'locally_authored_first_party_code plus bundled OFL-1.1 fonts',
  font_license_receipts: assetsManifest.binary_assets.map(
    ({asset_id, license_path, license_sha256, sha256: fontSha256}) => ({
      asset_id,
      font_sha256: fontSha256,
      license_path,
      license_sha256,
      license: 'SIL Open Font License 1.1',
    }),
  ),
  allowed_scope: 'local_contract_testing_only',
  verdict: 'PROVISIONALLY_CLEARED_FOR_LOCAL_TEST_ONLY',
  coverage_gaps: ['font_binary_origin_version_unresolved'],
  external_distribution_authorized: false,
  generated_at: copy.deterministicTimestamp,
});
