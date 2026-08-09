export const EXPERIENCE_RELEASE_SURFACE_V1_ID = 'frames-experience-release-surface-v1';

export const EXPERIENCE_RELEASE_SURFACE_V1 = [
  '02_proceso/core/contracts/experience-assistance-v1.ts',
  '02_proceso/core/contracts/experience-command-v1.ts',
  '02_proceso/core/contracts/experience-execution-v1.ts',
  '02_proceso/core/contracts/experience-release-v1.ts',
  '02_proceso/core/contracts/experience-resume-v1.ts',
  '02_proceso/workflows/core/brief-material-handlers-v1.ts',
  '02_proceso/workflows/core/experience-command-view-v1.ts',
  '02_proceso/workflows/core/experience-planner-v1.ts',
  '02_proceso/workflows/core/first-turn-gateway-v1.ts',
  '02_proceso/workflows/core/material-skill-adapter-v1.ts',
  '02_proceso/workflows/core/productive-workflow-definitions-v1.ts',
  '02_proceso/workflows/core/resume-lineage-resolver-v1.ts',
  '02_proceso/workflows/experience/component-registry.yml',
  '02_proceso/workflows/experience/microcopy.es.yml',
  '02_proceso/workflows/experience/render-experience-view.ts',
  '03_artefactos/content/experience/frames-experience-blueprint.html',
  '03_artefactos/content/experience/frames-experience-blueprint.md',
  '03_artefactos/content/experience/projection-manifest.json',
  '03_artefactos/skills/content-os-router/scripts/route-content.mjs',
  '03_artefactos/skills/content-os-router/scripts/route-intent.mjs',
] as const;

export const assertExperienceReleaseSurface = (refs: readonly string[]): void => {
  const actual = new Set(refs);
  const missing = EXPERIENCE_RELEASE_SURFACE_V1.filter((ref) => !actual.has(ref));
  if (missing.length > 0) {
    throw new Error(`EXP-RELEASE-SURFACE: missing ${missing.join(', ')}`);
  }
};
