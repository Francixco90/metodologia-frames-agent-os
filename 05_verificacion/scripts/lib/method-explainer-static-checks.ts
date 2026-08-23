import {VIDEO_OS_DEFAULT_DOCUMENTS} from '../../../02_proceso/workflows/video-os/index.ts';

type Check = (condition: boolean, message: string) => void;
type Read = (path: string) => string;
type ReadJson = <T>(path: string) => T;

export const checkMethodExplainerStatics = (check: Check, read: Read, readJson: ReadJson) => {
  const archetypes = readJson<{
    defaults: {
      privacy: {mode: string; mask_strategy: string; persistent_plate: boolean};
      human_intro: {motion_required: boolean; freeze_frame_allowed: boolean};
      brand: string;
      automatic_terminal_state: string;
    };
    archetypes: Record<
      string,
      {
        aspect_ratio: string;
        storyboard: boolean;
        source_audio: string;
        automatic_terminal_state?: string;
      }
    >;
  }>('02_proceso/workflows/video-os/_assets/archetypes.json');
  check(archetypes.defaults.brand === 'MetodologIA', 'VIDEO-OS-BRAND-001 identity drift');
  check(
    archetypes.defaults.privacy.mode === 'light' &&
      archetypes.defaults.privacy.mask_strategy === 'field-level' &&
      !archetypes.defaults.privacy.persistent_plate,
    'VIDEO-OS-PRIVACY-002 archetype privacy drift',
  );
  check(
    archetypes.defaults.human_intro.motion_required &&
      !archetypes.defaults.human_intro.freeze_frame_allowed,
    'VIDEO-OS-MOTION-002 archetype motion drift',
  );
  check(
    JSON.stringify(archetypes.archetypes['method-explainer']) ===
      JSON.stringify({
        aspect_ratio: '9:16',
        storyboard: true,
        source_audio: 'none',
        automatic_terminal_state: 'RENDERED_DRAFT',
      }),
    'VIDEO-OS-METHOD-REGISTRY-001 method archetype registry drift',
  );

  const regressions = readJson<{cases: Array<{id: string; expected: string}>}>(
    '02_proceso/workflows/video-os/_assets/regressions.json',
  );
  const documentSections = readJson<{documents: Record<string, string[]>}>(
    '02_proceso/workflows/video-os/_assets/document-sections.json',
  );
  check(
    Object.keys(documentSections.documents).length === VIDEO_OS_DEFAULT_DOCUMENTS.length &&
      VIDEO_OS_DEFAULT_DOCUMENTS.every((document) =>
        Object.prototype.hasOwnProperty.call(documentSections.documents, document),
      ),
    'VIDEO-OS-DOCS-002 section registry must cover every standard document',
  );
  const requiredRegressions = [
    'REG-MOTION-001',
    'REG-PRIVACY-001',
    'REG-PRIVACY-002',
    'REG-SPEAKER-001',
    'REG-SOURCE-001',
    'REG-MANIFEST-001',
    'REG-EXPORT-001',
  ];
  const regressionIds = new Set(regressions.cases.map(({id}) => id));
  check(
    requiredRegressions.every((id) => regressionIds.has(id)),
    'VIDEO-OS-REGRESSION-001 missing regression',
  );
  check(
    regressions.cases.every(({expected}) => expected === 'BLOCKED'),
    'VIDEO-OS-REGRESSION-002 regressions must fail closed',
  );

  for (const file of [
    'INSTRUCTIONS.md',
    'STATE.md',
    'VERIFICATION.md',
    'SCOPE.md',
    'LIFECYCLE.md',
  ]) {
    const body = read(`02_proceso/workflows/video-os/${file}`);
    check(
      body.includes('Este sistema convierte intención en resultados por procesos auto orquestado.'),
      `VIDEO-OS-HARNESS-001 ${file} missing self-orchestration preamble`,
    );
  }
  const runner = read('02_proceso/workflows/video-os/_runner/video-os.ts');
  check(
    !/\b(?:Date\.now|Math\.random|fetch|setTimeout|setInterval)\s*\(/u.test(runner),
    'VIDEO-OS-DET-002 nondeterministic or network primitive in runner',
  );
  const methodExecutionFiles = [
    '02_proceso/workflows/video-os/_runner/video-os.ts',
    '02_proceso/workflows/video-os/_schema/method-explainer-planning-v1.schema.ts',
    '02_proceso/workflows/video-os/_schema/method-explainer-execution-v1.schema.ts',
  ];
  for (const file of methodExecutionFiles) {
    const source = read(file);
    check(
      !/\b(?:Date\.now|Math\.random|fetch|setTimeout|setInterval|requestAnimationFrame)\s*\(/u.test(
        source,
      ),
      `VIDEO-OS-METHOD-DET-002 nondeterministic or network primitive in ${file}`,
    );
  }
  check(
    runner.includes("command === 'check-method-explainer'") &&
      runner.includes('assertMethodExplainerMaterialBundle(input, bundleBase)'),
    'VIDEO-OS-METHOD-CLI-001 governed contract command missing',
  );
  const schemaIndex = read('02_proceso/workflows/video-os/_schema/index.ts');
  check(
    schemaIndex.includes("export * from './method-explainer-planning-v1.schema.ts'") &&
      schemaIndex.includes("export * from './method-explainer-execution-v1.schema.ts'"),
    'VIDEO-OS-METHOD-EXPORTS-001 method schemas are not exported',
  );
  const architecture = read('01_intencion/video-os/ARCHITECTURE.md');
  check(
    /Spec[^\n]*Compile[^\n]*Verify[^\n]*Review[^\n]*Promote/iu.test(architecture),
    'VIDEO-OS-SPEC-001 canonical sequence missing',
  );
  check(
    !/publication_authority\s*[:=]\s*true/iu.test(architecture),
    'VIDEO-OS-PUBLISH-001 publication authority forbidden',
  );
  return regressions.cases.length;
};
