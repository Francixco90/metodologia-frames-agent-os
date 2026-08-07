// prepare-project/font-assets.ts — OFL font asset descriptors used by the
// assets manifest and rights receipt. Pure data, byte-stable. [CÓDIGO]

export type FontAsset = {
  readonly asset_id: string;
  readonly family: string;
  readonly weight: number;
  readonly path: string;
  readonly license_path: string;
  readonly rights_holder: string;
  readonly canonical_source_url: string;
};

export const fontAssets = [
  {
    asset_id: 'FONT-WORK-SANS-REGULAR',
    family: 'MetodologIA Work Sans',
    weight: 400,
    path: 'renderers/remotion/src/assets/fonts/WorkSans-Regular.ttf',
    license_path: 'renderers/remotion/src/assets/fonts/WorkSans-OFL.txt',
    rights_holder: 'The Work Sans Project Authors',
    canonical_source_url: 'https://github.com/weiweihuanghuang/Work-Sans',
  },
  {
    asset_id: 'FONT-WORK-SANS-BOLD',
    family: 'MetodologIA Work Sans',
    weight: 700,
    path: 'renderers/remotion/src/assets/fonts/WorkSans-Bold.ttf',
    license_path: 'renderers/remotion/src/assets/fonts/WorkSans-OFL.txt',
    rights_holder: 'The Work Sans Project Authors',
    canonical_source_url: 'https://github.com/weiweihuanghuang/Work-Sans',
  },
  {
    asset_id: 'FONT-JETBRAINS-MONO-REGULAR',
    family: 'MetodologIA JetBrains Mono',
    weight: 400,
    path: 'renderers/remotion/src/assets/fonts/JetBrainsMono-Regular.ttf',
    license_path: 'renderers/remotion/src/assets/fonts/JetBrainsMono-OFL.txt',
    rights_holder: 'The JetBrains Mono Project Authors',
    canonical_source_url: 'https://github.com/JetBrains/JetBrainsMono',
  },
  {
    asset_id: 'FONT-JETBRAINS-MONO-BOLD',
    family: 'MetodologIA JetBrains Mono',
    weight: 700,
    path: 'renderers/remotion/src/assets/fonts/JetBrainsMono-Bold.ttf',
    license_path: 'renderers/remotion/src/assets/fonts/JetBrainsMono-OFL.txt',
    rights_holder: 'The JetBrains Mono Project Authors',
    canonical_source_url: 'https://github.com/JetBrains/JetBrainsMono',
  },
] as const;
