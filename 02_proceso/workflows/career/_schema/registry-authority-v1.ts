export const ACTIVE_CAREER_CONTRACTS = ['cv-spec-v2', 'cv-source-v2', 'cv-package-v3'] as const;

export const COMPATIBILITY_CAREER_CONTRACTS = [
  'cv-spec-v1',
  'cv-source-v1',
  'cv-html-v1',
  'cv-ats-pdf-v1',
  'cv-variant-manifest-v1',
  'cv-package-v2',
  'application-package-v1',
] as const;

export const LEGACY_CAREER_DISPLAY_ALIASES = new Set([
  'CV Material Specification',
  'CV Source',
  'CV HTML Projection',
  'ATS PDF Projection',
  'CV Variant Manifest',
  'Spec-bound CV Package',
  'Application Package',
]);

export const CANONICAL_CAREER_TEMPLATE_REFS: Readonly<Record<string, string>> = {
  'cv-spec-v1': '02_proceso/workflows/career/c06-cv/templates/cv-source-v1.template.md',
  'cv-spec-v2': '02_proceso/workflows/career/c06-cv/templates/cv-source-v2.template.md',
  'cv-source-v1': '02_proceso/workflows/career/c06-cv/templates/cv-source-v1.template.md',
  'cv-source-v2': '02_proceso/workflows/career/c06-cv/templates/cv-source-v2.template.md',
  'cv-html-v1': '02_proceso/workflows/career/c06-cv/templates/cv-source-v1.template.html',
  'cv-ats-html-v1': '02_proceso/workflows/career/_assets/ats-document-template.html',
  'cv-ats-pdf-v1': '02_proceso/workflows/career/c06-cv/templates/cv-source-v1.template.html',
  'cv-ats-pdf-v2': '02_proceso/workflows/career/_assets/ats-document-template.html',
  'cv-variant-manifest-v1': '02_proceso/workflows/career/c06-cv/templates/cv-source-v1.template.md',
  'cv-variant-manifest-v2': '02_proceso/workflows/career/c06-cv/templates/cv-source-v2.template.md',
  'cv-package-v2':
    '02_proceso/workflows/career/c08-package-qa/templates/application-package-v1.template.md',
  'cv-package-v3': '02_proceso/workflows/career/c08-package-qa/templates/cv-package-v3.template.md',
  'application-package-v1':
    '02_proceso/workflows/career/c08-package-qa/templates/application-package-v1.template.md',
};

export const CANONICAL_CAREER_MIGRATIONS: Readonly<Record<string, {mode: string; ref: string}>> = {
  'cv-spec-v1': {
    mode: 'migrator-only',
    ref: '02_proceso/workflows/career/_runner/cv-spec-v2.ts',
  },
  'cv-source-v1': {
    mode: 'rebuild-only',
    ref: '02_proceso/workflows/career/c06-cv/workflow.yml',
  },
  'cv-html-v1': {
    mode: 'rebuild-only',
    ref: '02_proceso/workflows/career/c06-cv/workflow.yml',
  },
  'cv-ats-pdf-v1': {
    mode: 'rebuild-only',
    ref: '02_proceso/workflows/career/c06-cv/workflow.yml',
  },
  'cv-variant-manifest-v1': {
    mode: 'rebuild-only',
    ref: '02_proceso/workflows/career/c06-cv/workflow.yml',
  },
  'cv-package-v2': {
    mode: 'migrator-only',
    ref: '02_proceso/workflows/career/_runner/cv-package-v3.ts',
  },
  'application-package-v1': {
    mode: 'rebuild-only',
    ref: '02_proceso/workflows/career/c08-package-qa/workflow.yml',
  },
};
