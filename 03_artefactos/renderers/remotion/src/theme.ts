import {localFontFamilies} from './font-loader.ts';

export const theme = {
  color: {
    background: '#090A0C',
    panel: '#121418',
    line: '#34383F',
    text: '#F7F6F1',
    muted: '#B8BAB4',
    signal: '#D6FF4B',
    cyan: '#68E6E0',
    blocked: '#FF8A70',
  },
  font: {
    sans: localFontFamilies.sans,
    mono: localFontFamilies.mono,
  },
} as const;
