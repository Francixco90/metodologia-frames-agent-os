// check-brand/expected-sources.ts — pinned source bindings (data table). The
// 10 brand sources and 4 official Instagram channel sources are hash-bound
// observables; this table is the single assertion site. [CÓDIGO]
export const expectedChannelSources = new Map([
  ['IG-OFFICIAL-PHOTO-RESOLUTION', 'https://www.facebook.com/help/instagram/1631821640426723'],
  ['IG-OFFICIAL-CAROUSEL', 'https://www.facebook.com/help/instagram/269314186824048'],
  ['IG-OFFICIAL-REELS', 'https://www.facebook.com/help/instagram/1038071743007909'],
  ['IG-OFFICIAL-ALT-TEXT', 'https://www.facebook.com/help/instagram/503708446705527'],
]);

export type ExpectedSource = {
  path: string;
  sha256: string;
  dirty: boolean;
  commitBound: boolean;
  authority: string;
};

export const expectedSources = new Map<string, ExpectedSource>([
  [
    'BRAND-SRC-TOKENS',
    {
      path: 'design-system/tokens.css',
      sha256: '32cc6576323aae325160c589cac500f6965b897070aecbc048278c363ed25f19',
      dirty: false,
      commitBound: true,
      authority: 'stable_projection_authority',
    },
  ],
  [
    'BRAND-SRC-SKILL',
    {
      path: 'design-system/brand-html-skill/SKILL.md',
      sha256: 'bc68a6ef3607ca6cb2af15b365cf59fa5e8fd846519a99ec027b4d85f41316b8',
      dirty: false,
      commitBound: true,
      authority: 'stable_projection_authority',
    },
  ],
  [
    'BRAND-SRC-CONTRACTS',
    {
      path: 'design-system/brand-html-skill/references/contracts.json',
      sha256: '5cb7f8cd429ae50ea1aa9e4c96eb0a9e6388db17d37a88cfd68b03097c37eb76',
      dirty: false,
      commitBound: true,
      authority: 'stable_projection_authority',
    },
  ],
  [
    'BRAND-SRC-RULES',
    {
      path: 'design-system/brand-html-skill/references/brand-rules.md',
      sha256: '55514b363186dd64a8ee327ac83d7eb1a4a1c06655c2c96029e0dcc3c5afee0e',
      dirty: false,
      commitBound: true,
      authority: 'stable_projection_authority',
    },
  ],
  [
    'BRAND-SRC-NAMING',
    {
      path: 'docs/BRAND_NAMES.md',
      sha256: 'c3023e3464515a1b2a87a0a75aa9ff806f246667be277d5bcfbea95d89a4e39e',
      dirty: false,
      commitBound: true,
      authority: 'stable_projection_authority',
    },
  ],
  [
    'BRAND-SRC-CONSTITUTION-XI',
    {
      path: 'CONSTITUTION.md',
      sha256: 'a506427360513d2026b16a1fea3d79b1423d33ff3bf397398ec029aeaaf0a8b4',
      dirty: false,
      commitBound: true,
      authority: 'constitutional_brand_authority',
    },
  ],
  [
    'BRAND-SRC-VOICE-V3',
    {
      path: '.local/pristino-alfa/references/brand/brand-voice-v3.0.md',
      sha256: 'd415571ed41f49ee186f2fc70faa91e91862142175ad89c39454a41bf295168f',
      dirty: false,
      commitBound: false,
      authority: 'first_party_candidate',
    },
  ],
  [
    'BRAND-SRC-LLMS-DIRTY',
    {
      path: 'llms.txt',
      sha256: 'a7f9893b49f5ee2de12844e4759413066bc61ace69b4c9f12717b08b6a1efead',
      dirty: true,
      commitBound: false,
      authority: 'observational_only',
    },
  ],
  [
    'BRAND-SRC-MANIFEST-DIRTY',
    {
      path: 'manifest.json',
      sha256: '801bef55000af6486aa149cdfdf15fae5bbd0545ed1e2169ed5edfe1c26bf5c5',
      dirty: true,
      commitBound: false,
      authority: 'observational_only',
    },
  ],
  [
    'BRAND-SRC-NEOSWISS-DIRTY',
    {
      path: 'estilos/neoswiss-v5.css',
      sha256: '83d10053cccac1cc50e3515f609727c927b80f127064f4bf49e7988e8814e614',
      dirty: true,
      commitBound: false,
      authority: 'observational_only',
    },
  ],
]);
