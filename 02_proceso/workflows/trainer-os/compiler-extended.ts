import {renderExtendedArtifact, validateExtendedPlan} from './adapter-extended-renderers.ts';
import {renderPlannedArtifact} from './adapter-renderers.ts';
import {renderMasterclassArtifact, validateMasterclassPlan} from './masterclass-compiler.ts';
import type {AdapterTheme} from './adapter-shell.ts';
import type {TrainerArtifactPlanV1} from './trainer-artifact-plan-v1.schema.ts';
import type {TrainerDesignLockV1} from './trainer-design-lock-v1.schema.ts';
import type {TrainerRouteSpecV1} from './trainer-route-spec-v1.schema.ts';

type Artifact = TrainerArtifactPlanV1['artifacts'][number];
type Binding = {ref: string; sha256: string};

export const validateExtendedCompilerPlan = (
  plan: TrainerArtifactPlanV1,
  raw: unknown,
  assets: Binding[],
  readAuthority: (binding: Binding) => unknown,
) => {
  validateExtendedPlan(plan, raw);
  validateMasterclassPlan(plan, raw, assets, readAuthority);
};

export const renderExtendedCompilerArtifact = (
  artifact: Artifact,
  raw: unknown,
  lock: TrainerDesignLockV1,
  bindings: {routeSpec: Binding; designLock: Binding},
  theme: AdapterTheme | undefined,
) => renderExtendedArtifact(artifact, raw, lock, bindings, theme);

export const renderCompilerArtifact = (
  artifact: Artifact,
  raw: unknown,
  route: TrainerRouteSpecV1,
  lock: TrainerDesignLockV1,
  bindings: {routeSpec: Binding; designLock: Binding},
  theme: AdapterTheme | undefined,
) =>
  renderMasterclassArtifact(artifact, raw, bindings, theme) ??
  renderExtendedCompilerArtifact(artifact, raw, lock, bindings, theme) ??
  renderPlannedArtifact(artifact, raw, route, lock, bindings, theme);
