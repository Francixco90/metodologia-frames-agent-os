import {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {useDelayRender} from 'remotion';

import jetBrainsMonoBoldUrl from './assets/fonts/JetBrainsMono-Bold.ttf';
import jetBrainsMonoRegularUrl from './assets/fonts/JetBrainsMono-Regular.ttf';
import workSansBoldUrl from './assets/fonts/WorkSans-Bold.ttf';
import workSansRegularUrl from './assets/fonts/WorkSans-Regular.ttf';

export const localFontFamilies = {
  mono: '"MetodologIA JetBrains Mono"',
  sans: '"MetodologIA Work Sans"',
} as const;

export const localFontAssetUrls = [
  workSansRegularUrl,
  workSansBoldUrl,
  jetBrainsMonoRegularUrl,
  jetBrainsMonoBoldUrl,
] as const;

interface LocalFontSpec {
  readonly assetId: string;
  readonly family: string;
  readonly url: string;
  readonly weight: '400' | '700';
}

export const localFontSpecs: readonly LocalFontSpec[] = [
  {
    assetId: 'FONT-WORK-SANS-REGULAR',
    family: 'MetodologIA Work Sans',
    url: workSansRegularUrl,
    weight: '400',
  },
  {
    assetId: 'FONT-WORK-SANS-BOLD',
    family: 'MetodologIA Work Sans',
    url: workSansBoldUrl,
    weight: '700',
  },
  {
    assetId: 'FONT-JETBRAINS-MONO-REGULAR',
    family: 'MetodologIA JetBrains Mono',
    url: jetBrainsMonoRegularUrl,
    weight: '400',
  },
  {
    assetId: 'FONT-JETBRAINS-MONO-BOLD',
    family: 'MetodologIA JetBrains Mono',
    url: jetBrainsMonoBoldUrl,
    weight: '700',
  },
] as const;

export const assertFontFaceLoaded = ({
  assetId,
  status,
}: {
  readonly assetId: string;
  readonly status: FontFaceLoadStatus;
}): void => {
  if (status !== 'loaded') {
    throw new Error(`FONT_STATUS_INVALID asset=${assetId} status=${status}`);
  }
};

const loadLocalFonts = async (): Promise<void> => {
  const loaded = await Promise.all(
    localFontSpecs.map(async (spec) => {
      try {
        const face = await new FontFace(spec.family, `url(${spec.url})`, {
          style: 'normal',
          weight: spec.weight,
        }).load();
        assertFontFaceLoaded({assetId: spec.assetId, status: face.status});
        document.fonts.add(face);
        return {face, spec};
      } catch (error) {
        throw new Error(
          `FONT_LOAD_FAILED asset=${spec.assetId} url=${spec.url} reason=${error instanceof Error ? error.message : String(error)}`,
          {cause: error},
        );
      }
    }),
  );
  for (const {face, spec} of loaded) {
    assertFontFaceLoaded({assetId: spec.assetId, status: face.status});
    if (!document.fonts.check(`${spec.weight} 16px "${spec.family}"`)) {
      throw new Error(
        `FONT_SET_CHECK_FAILED asset=${spec.assetId} family=${spec.family} weight=${spec.weight}`,
      );
    }
  }
};

let localFontLoadPromise: Promise<void> | null = null;
const ensureLocalFonts = (): Promise<void> => {
  localFontLoadPromise ??= loadLocalFonts();
  return localFontLoadPromise;
};

export const useLocalFontGate = (): boolean => {
  const {cancelRender, continueRender, delayRender} = useDelayRender();
  const [handle] = useState(() =>
    delayRender('Load and verify four hash-bound OFL fonts', {
      retries: 0,
      timeoutInMilliseconds: 30_000,
    }),
  );
  const [ready, setReady] = useState(false);
  const continuedRef = useRef(false);

  useEffect(() => {
    let active = true;
    ensureLocalFonts()
      .then(() => {
        if (active) {
          setReady(true);
        }
      })
      .catch((error: unknown) => {
        if (active) {
          cancelRender(error instanceof Error ? error : new Error(String(error)));
        }
      });
    return () => {
      active = false;
      if (!continuedRef.current) {
        continuedRef.current = true;
        continueRender(handle);
      }
    };
  }, [cancelRender, continueRender, handle]);

  useLayoutEffect(() => {
    if (ready && !continuedRef.current) {
      continuedRef.current = true;
      continueRender(handle);
    }
  }, [continueRender, handle, ready]);

  return ready;
};
