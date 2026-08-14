import {canonicalJson} from './common.ts';
import {
  TrainerMasterclassContentSchema,
  TrainerRenderAuthorityReceiptSchema,
} from './masterclass-contracts.ts';
import {renderMasterclassPdf} from './masterclass-pdf.ts';
import type {AdapterTheme} from './adapter-shell.ts';
import type {TrainerArtifactPlanV1} from './trainer-artifact-plan-v1.schema.ts';

type Artifact = TrainerArtifactPlanV1['artifacts'][number];
type Binding = {ref: string; sha256: string};
const pattern = /^dist\/masterclass\/(es|en|pt)\/masterclass\.pdf$/u;

export const validateMasterclassPlan = (
  plan: TrainerArtifactPlanV1,
  raw: unknown,
  assets: Binding[],
  readAuthority: (binding: Binding) => unknown,
) => {
  const adapted = plan.artifacts.flatMap((artifact) => {
    const match = pattern.exec(artifact.outputRef);
    return match ? [{locale: match[1], artifact}] : [];
  });
  if (!adapted.length) return undefined;
  const source = TrainerMasterclassContentSchema.parse(raw);
  const actual = adapted.map(({locale}) => locale).sort();
  if (canonicalJson(actual) !== canonicalJson([...source.requestedLocales].sort()))
    throw new Error('TRAINER_MASTERCLASS_PLAN_LOCALE_DRIFT');
  if (adapted.some(({artifact}) => artifact.kind !== 'masterclass'))
    throw new Error('TRAINER_MASTERCLASS_KIND_PATH_MISMATCH');
  const available = new Set(assets.map(({ref, sha256}) => `${ref}:${sha256}`));
  const authorities = [
    source.renderAuthority.browserReceipt,
    source.renderAuthority.runtimeReceipt,
    source.renderAuthority.fontReceipt,
  ];
  for (const binding of authorities)
    if (!available.has(`${binding.ref}:${binding.sha256}`))
      throw new Error(`TRAINER_MASTERCLASS_AUTHORITY_MISSING:${binding.ref}`);
  const parsed = authorities.map((binding) =>
    TrainerRenderAuthorityReceiptSchema.parse(readAuthority(binding)),
  );
  if (
    parsed[0]?.kind !== 'browser-policy' ||
    parsed[1]?.kind !== 'runtime' ||
    parsed[2]?.kind !== 'font'
  )
    throw new Error('TRAINER_MASTERCLASS_AUTHORITY_ORDER_DRIFT');
  if (parsed[1].version !== process.version)
    throw new Error('TRAINER_MASTERCLASS_RUNTIME_VERSION_DRIFT');
  return source;
};

export const renderMasterclassArtifact = (
  artifact: Artifact,
  raw: unknown,
  bindings: {routeSpec: Binding; designLock: Binding},
  theme: AdapterTheme | undefined,
) => {
  const match = pattern.exec(artifact.outputRef);
  if (!match) return undefined;
  const locale = match[1] as 'es' | 'en' | 'pt';
  const source = TrainerMasterclassContentSchema.parse(raw);
  if (
    canonicalJson(source.routeSpec) !== canonicalJson(bindings.routeSpec) ||
    canonicalJson(source.designLock) !== canonicalJson(bindings.designLock)
  )
    throw new Error('TRAINER_MASTERCLASS_CONTENT_BINDING_DRIFT');
  if (!theme) throw new Error('TRAINER_MASTERCLASS_THEME_MISSING');
  return renderMasterclassPdf(source, locale, theme);
};
