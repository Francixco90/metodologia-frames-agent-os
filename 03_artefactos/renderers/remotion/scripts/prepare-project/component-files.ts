// prepare-project/component-files.ts — component file list + role copy.
// Pure data, byte-stable. Sibling to component-categories.ts. [CÓDIGO]

export const componentFiles = [
  'renderers/remotion/src/components/StatusBadge.tsx',
  'renderers/remotion/src/components/PersistentChrome.tsx',
  'renderers/remotion/src/components/SignalRail.tsx',
  'renderers/remotion/src/components/Breadcrumb.tsx',
  'renderers/remotion/src/components/BeatScene.tsx',
  'renderers/remotion/src/components/CaptionBand.tsx',
  'renderers/remotion/src/components/LayoutGuard.tsx',
  'renderers/remotion/src/components/layout-geometry.ts',
  'renderers/remotion/src/components/NetworkGuardProbe.tsx',
  'renderers/remotion/src/Root.tsx',
  'renderers/remotion/src/component-registry-schema.ts',
  'renderers/remotion/src/font-loader.ts',
  'renderers/remotion/src/network-guard.ts',
  'renderers/remotion/src/schema.ts',
  'renderers/remotion/src/theme.ts',
  'projects/vs-001-source-to-campaign/remotion/src/MethodologiaVertical.tsx',
] as const;

export type ComponentFile = (typeof componentFiles)[number];

export const componentRoles: Readonly<Record<ComponentFile, string>> = {
  'renderers/remotion/src/components/StatusBadge.tsx':
    'Estado redundante por texto, forma y patrón.',
  'renderers/remotion/src/components/PersistentChrome.tsx':
    'Marca única, badges y semántica 0/4 persistentes.',
  'renderers/remotion/src/components/SignalRail.tsx':
    'Cadena causal persistente y bifurcación Web/Motion.',
  'renderers/remotion/src/components/Breadcrumb.tsx':
    'Tres preguntas incorporadas como breadcrumb.',
  'renderers/remotion/src/components/BeatScene.tsx':
    'Escena frame-driven con variante reduced-motion.',
  'renderers/remotion/src/components/CaptionBand.tsx':
    'Caption dentro de safe-zone y ventana monotónica.',
  'renderers/remotion/src/components/LayoutGuard.tsx':
    'Espera el portal activo y falla ante overflow, safe-zone o texto recortado dentro de su raíz sentinel-bound.',
  'renderers/remotion/src/components/layout-geometry.ts':
    'Normaliza bounds a coordenadas lógicas de composición para escalas 0.25 y 1.0.',
  'renderers/remotion/src/components/NetworkGuardProbe.tsx':
    'Canary headless que debe observar bloqueo síncrono de red remota.',
  'renderers/remotion/src/Root.tsx': 'Registro de composición con schema y calculateMetadata.',
  'renderers/remotion/src/component-registry-schema.ts':
    'Contrato estricto del component registry y sus campos mínimos.',
  'renderers/remotion/src/font-loader.ts':
    'Carga y verifica cuatro fonts OFL locales con gate de composición, timeout y cancelRender.',
  'renderers/remotion/src/network-guard.ts':
    'Bloquea fetch remoto y conserva recursos same-origin, data y blob.',
  'renderers/remotion/src/schema.ts': 'Zod 4, timeline y calculateMetadata.',
  'renderers/remotion/src/theme.ts': 'Tokens y familias tipográficas vendorizadas.',
  'projects/vs-001-source-to-campaign/remotion/src/MethodologiaVertical.tsx':
    'Composición 9:16 con siete beats y seis overlaps.',
};