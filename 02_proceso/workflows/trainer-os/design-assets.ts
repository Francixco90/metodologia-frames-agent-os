import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {format} from 'prettier';
import type {TrainerTokenAuthority} from './design-assets.schemas.ts';

const style = {
  bracketSpacing: false,
  objectWrap: 'collapse' as const,
  printWidth: 100,
  singleQuote: true,
};

const canonical = (value: unknown): unknown =>
  Array.isArray(value)
    ? value.map(canonical)
    : value !== null && typeof value === 'object'
      ? Object.fromEntries(
          Object.entries(value as Record<string, unknown>)
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([key, item]) => [key, canonical(item)]),
        )
      : value;
export const sha256 = (value: string | Uint8Array): string =>
  createHash('sha256').update(value).digest('hex');
export const hashFile = (path: string): string => sha256(readFileSync(path));
export const hashModel = (value: Record<string, unknown>, field: string): string => {
  const copy = structuredClone(value);
  delete copy[field];
  return sha256(JSON.stringify(canonical(copy)));
};

export const projectTokens = (source: TrainerTokenAuthority) => ({
  source: 'tokens.authority.json',
  tokenSetId: source.tokenSetId,
  color: source.colors,
  font: source.typography,
  space: source.spacing,
  radius: source.radius,
  motion: source.motion,
  layout: source.layout,
});
export const projectTokensJson = (source: TrainerTokenAuthority): Promise<string> =>
  format(JSON.stringify(projectTokens(source)), {...style, parser: 'json'});

export const projectCss = (source: TrainerTokenAuthority): Promise<string> =>
  format(
    `/* GENERATED from tokens.authority.json. Do not edit. */
:root {
  --trainer-navy: ${source.colors.navy};
  --trainer-gold: ${source.colors.gold};
  --trainer-gold-text: ${source.colors.goldText};
  --trainer-canvas: ${source.colors.lightCanvas};
  --trainer-surface: ${source.colors.lightSurface};
  --trainer-text: ${source.colors.lightText};
  --trainer-focus: ${source.colors.lightFocus};
  --trainer-heading: '${source.typography.heading}', ${source.typography.fallback};
  --trainer-body: '${source.typography.body}', ${source.typography.fallback};
  --trainer-content-max: ${source.layout.contentMax};
  --trainer-touch-min: ${source.layout.touchTargetMin};
  --trainer-radius: ${source.radius.medium};
  --trainer-motion: ${source.motion.duration} ${source.motion.easing};
}
[data-theme='dark'] {
  --trainer-canvas: ${source.colors.darkCanvas};
  --trainer-surface: ${source.colors.darkSurface};
  --trainer-text: ${source.colors.darkText};
  --trainer-focus: ${source.colors.darkFocus};
}
@media (prefers-reduced-motion: reduce) {
  :root { --trainer-motion: 0ms linear; }
}
`,
    {...style, parser: 'css'},
  );

export const projectTs = (source: TrainerTokenAuthority): Promise<string> =>
  format(
    `// GENERATED from tokens.authority.json. Do not edit.\nexport const trainerTokens = ${JSON.stringify(projectTokens(source), null, 2)} as const;\n`,
    {...style, parser: 'typescript'},
  );

export const contrast = (foreground: string, background: string): number => {
  const luminance = (hex: string) => {
    const rgb =
      hex
        .slice(1)
        .match(/.{2}/gu)
        ?.map((part) => Number.parseInt(part, 16) / 255) ?? [];
    const values = rgb.map((value) =>
      value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
    );
    return 0.2126 * (values[0] ?? 0) + 0.7152 * (values[1] ?? 0) + 0.0722 * (values[2] ?? 0);
  };
  const [high = 0, low = 0] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (high + 0.05) / (low + 0.05);
};
