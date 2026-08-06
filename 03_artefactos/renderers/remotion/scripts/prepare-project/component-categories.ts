// prepare-project/component-categories.ts — category, required-props and
// visual-category classification for the component registry. Pure data. [CÓDIGO]
import type {ComponentFile} from './component-files.ts';

export type ComponentCategory =
  | 'caption'
  | 'chrome'
  | 'composition'
  | 'contract'
  | 'font-loader'
  | 'navigation'
  | 'qa'
  | 'runtime-policy'
  | 'scene'
  | 'status'
  | 'visual-system';

export const componentCategories: Readonly<Record<ComponentFile, ComponentCategory>> = {
  'renderers/remotion/src/components/StatusBadge.tsx': 'status',
  'renderers/remotion/src/components/PersistentChrome.tsx': 'chrome',
  'renderers/remotion/src/components/SignalRail.tsx': 'navigation',
  'renderers/remotion/src/components/Breadcrumb.tsx': 'navigation',
  'renderers/remotion/src/components/BeatScene.tsx': 'scene',
  'renderers/remotion/src/components/CaptionBand.tsx': 'caption',
  'renderers/remotion/src/components/LayoutGuard.tsx': 'qa',
  'renderers/remotion/src/components/layout-geometry.ts': 'qa',
  'renderers/remotion/src/components/NetworkGuardProbe.tsx': 'qa',
  'renderers/remotion/src/Root.tsx': 'composition',
  'renderers/remotion/src/component-registry-schema.ts': 'contract',
  'renderers/remotion/src/font-loader.ts': 'font-loader',
  'renderers/remotion/src/network-guard.ts': 'runtime-policy',
  'renderers/remotion/src/schema.ts': 'contract',
  'renderers/remotion/src/theme.ts': 'visual-system',
  'projects/vs-001-source-to-campaign/remotion/src/MethodologiaVertical.tsx': 'composition',
};

export const componentRequiredProps: Readonly<Record<ComponentFile, readonly string[]>> = {
  'renderers/remotion/src/components/StatusBadge.tsx': ['kind', 'label'],
  'renderers/remotion/src/components/PersistentChrome.tsx': ['props'],
  'renderers/remotion/src/components/SignalRail.tsx': ['beat', 'frame', 'props'],
  'renderers/remotion/src/components/Breadcrumb.tsx': ['beat', 'props'],
  'renderers/remotion/src/components/BeatScene.tsx': ['beat', 'props'],
  'renderers/remotion/src/components/CaptionBand.tsx': ['props', 'text'],
  'renderers/remotion/src/components/LayoutGuard.tsx': [
    'compositionHeight',
    'compositionWidth',
    'safeZonePx',
  ],
  'renderers/remotion/src/components/layout-geometry.ts': [],
  'renderers/remotion/src/components/NetworkGuardProbe.tsx': [],
  'renderers/remotion/src/Root.tsx': [],
  'renderers/remotion/src/component-registry-schema.ts': [],
  'renderers/remotion/src/font-loader.ts': [],
  'renderers/remotion/src/network-guard.ts': [],
  'renderers/remotion/src/schema.ts': [],
  'renderers/remotion/src/theme.ts': [],
  'projects/vs-001-source-to-campaign/remotion/src/MethodologiaVertical.tsx': ['props'],
};

const VISUAL_CATEGORIES: ReadonlySet<ComponentCategory> = new Set([
  'caption',
  'chrome',
  'composition',
  'navigation',
  'scene',
  'status',
]);

export const isVisualCategory = (category: ComponentCategory): boolean =>
  VISUAL_CATEGORIES.has(category);