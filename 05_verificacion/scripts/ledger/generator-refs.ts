// ledger/generator-refs.ts — maps generated projection paths to their
// canonical generator source. Pure data lookup extracted from decision logic.
// [CÓDIGO]
import {generatorSourcePaths} from '../lib/file-disposition-policy-v3.ts';

export const generatorRefFor = (path: string): string | null => {
  if (generatorSourcePaths.has(path)) return path;
  if (path === 'projects/vs-001-source-to-campaign/web/artifact/index.html') {
    return 'workflows/web/build.ts';
  }
  if (path === 'projects/vs-001-source-to-campaign/remotion/07-postproduction-ledger.md') {
    return 'renderers/remotion/scripts/inspect-renders.ts';
  }
  if (
    path === 'projects/vs-001-source-to-campaign/remotion/04-component-registry.yml' ||
    path === 'projects/vs-001-source-to-campaign/remotion/05-input-props.json' ||
    path === 'projects/vs-001-source-to-campaign/remotion/06-render-manifest.yml' ||
    path === 'projects/vs-001-source-to-campaign/remotion/assets-manifest.yml' ||
    path === 'registries/components/component-registry.yml'
  ) {
    return 'renderers/remotion/scripts/prepare-project.ts';
  }
  if (
    path === 'projects/vs-001-source-to-campaign/remotion/00-source-script.md' ||
    path === 'projects/vs-001-source-to-campaign/remotion/01-video-spec.yml' ||
    path === 'projects/vs-001-source-to-campaign/remotion/02-beat-map.yml' ||
    path === 'projects/vs-001-source-to-campaign/remotion/03-visual-philosophy.md' ||
    path === 'projects/vs-001-source-to-campaign/remotion/captions.json'
  ) {
    return 'workflows/content/build.ts';
  }
  return null;
};
