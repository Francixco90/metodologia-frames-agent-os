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

// Reviewed code authority: changing governed bytes requires an explicit policy update.
export const EXPECTED_CAREER_TEMPLATE_SHA256: Readonly<Record<string, string>> = {
  '02_proceso/workflows/career/_assets/ats-document-template.html':
    '5ec25a71f6fcebb474714b26c539c7fea1a98720074a4cfe6cbd77d6150116c6',
  '02_proceso/workflows/career/_assets/document-template.html':
    '5f2efb37702e1ff4f0ce8fa51afeb3efafe30d39b30d7f7e4e60e9068e625134',
  '02_proceso/workflows/career/c00-intake/templates/candidate-foundation-brief-v1.template.md':
    'a8ac96cd31c7ad3a47bb1911eeaa7608ef0d08595dc91e7ae67609cda6285949',
  '02_proceso/workflows/career/c01-evidence/templates/evidence-bank-v1.template.md':
    '3ee8eb5b7c84436dbcddc3493303ff260c5d14bfbd840267493908e972eb4d1f',
  '02_proceso/workflows/career/c02-positioning/templates/positioning-charter-v1.template.md':
    'e54b2ccb1f84e9930f752a85edabf62928b7c9a839d178aff4d2f08503e7a69f',
  '02_proceso/workflows/career/c03-discovery/templates/job-search-brief-v1.template.md':
    '7e2f813e000f5f4b44943caf26f5b42f4af299a066a3752938469ea85a19e3c1',
  '02_proceso/workflows/career/c04-scoring/templates/fit-scorecard-v1.template.md':
    'acf13635e191800e05e021bbf6b731f838b4c862af4fa5b787d9cdc4e9910ff5',
  '02_proceso/workflows/career/c05-application-design/templates/application-brief-v1.template.md':
    'ad95ebdfa41ee7bbf1b27b2da09a7c717eddc94f9be031acc676ff0684f8eec0',
  '02_proceso/workflows/career/c06-cv/templates/cv-source-v1.template.html':
    '1f0412a8f34f4ebc4ba5df163291c345370bf0d62c78f9a0cc813b1d946ce753',
  '02_proceso/workflows/career/c06-cv/templates/cv-source-v1.template.md':
    'a8b200def42b35170148c9758bacdc88705e4e68be69b70d190c4674f0dbcb6e',
  '02_proceso/workflows/career/c06-cv/templates/cv-source-v2.template.html':
    'cae46d65f903be0308d75068f642fe4551f736270fe2e8519ac54b14c7cddd61',
  '02_proceso/workflows/career/c06-cv/templates/cv-source-v2.template.md':
    '65f2b7b65b634e465a3aba12659a24df80d012b70f9338ad8247102f79abc26a',
  '02_proceso/workflows/career/c07-cover-letter/templates/cover-letter-v1.template.md':
    '06cd67f6057c4c51358cb54df4c869c37ce8fe4e76c93a41170e034fd495b895',
  '02_proceso/workflows/career/c08-package-qa/templates/application-package-v1.template.md':
    '5e5b503cee8a6a8a4a87b8bf29b0c5e281925160afe171311583fba29961a948',
  '02_proceso/workflows/career/c08-package-qa/templates/cv-package-v3.template.html':
    '23885a91f78cf27f72e56a35acd7e04a21085c4975d8596b2f9a6a61acf062e9',
  '02_proceso/workflows/career/c08-package-qa/templates/cv-package-v3.template.md':
    '1b64ee6b092847332d48fcd31ca0aae29368266b6434c4f93bfda1aeb7508ceb',
  '02_proceso/workflows/career/c09-submission/templates/submission-preview-v1.template.md':
    '7da4317f05d43a208e6f3ce69fd135a26a24d846eb549863d0cf89e043b199c0',
  '03_artefactos/skills/career-design-system/templates/design-brief.example.json':
    '86a7a657351501f7a97309dd4f0c3ed66598e320112ed705ac503625d37b860e',
  '03_artefactos/skills/career-design-system/templates/design-decision.example.json':
    '695b6d57516fb1cd1d7c30b1473448316156569acf084e9c4f49593508437808',
};

export const EXPECTED_CAREER_MIGRATION_SHA256: Readonly<Record<string, string>> = {
  '02_proceso/workflows/career/_runner/cv-spec-v2.ts':
    '6b1ea14ce03470e1c8f67c210b58d2f34d7c3ea6084848b89af9a45045589eb2',
  '02_proceso/workflows/career/c06-cv/workflow.yml':
    '4d40062e94d702b5f95fbbe9bdeef22369d535fae8edfc214c1ca5099cfcc42a',
  '02_proceso/workflows/career/_runner/cv-package-v3.ts':
    '4310a8e285e715ccebfa7d1cf6322f06bc15b715def9bf492f4b6f13d2afec9c',
  '02_proceso/workflows/career/c08-package-qa/workflow.yml':
    'b1778c748f924be5db8e3054171e67ba633dd27f8361f42b02bb622e86e7cd3c',
};
