import {
  withCaseLongformMediaTools,
  type CaseLongformMediaToolAuthority,
} from './case-longform-tool-snapshot.ts';

export type CaseLongformPreservationToolAuthority = CaseLongformMediaToolAuthority;
type ToolKind = 'ffmpeg' | 'ffprobe';
type Hooks = {afterOpen?: (kind: ToolKind, path: string) => void};

export const withCaseLongformPreservationTools = <T>(
  authority: CaseLongformPreservationToolAuthority,
  operation: (tools: {ffmpeg: string; ffprobe: string}) => T,
  hooks: Hooks = {},
): T => {
  const original = new Map<ToolKind, string>([
    ['ffmpeg', authority.ffmpeg_path],
    ['ffprobe', authority.ffprobe_path],
  ]);
  return withCaseLongformMediaTools(authority, operation, {
    afterOpen: (path) => {
      const kind = [...original].find(([, originalPath]) => originalPath === path)?.[0];
      if (kind) hooks.afterOpen?.(kind, path);
    },
  });
};
