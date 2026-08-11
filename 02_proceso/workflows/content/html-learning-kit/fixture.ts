import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {calculateSpecSha256, sha256} from './canonical.ts';
import {
  HtmlLearningKitSpecSchema,
  type HtmlLearningKitSpec,
  type LocalizedText,
} from './contracts.ts';

const base = '02_proceso/workflows/content/html-learning-kit/fixtures';
const text = (es: string, en: string, pt: string): LocalizedText => ({es, en, pt});
const binding = (workspaceRoot: string, ref: string): {ref: string; sha256: string} => ({
  ref,
  sha256: sha256(readFileSync(resolve(workspaceRoot, ref))),
});

export const createSyntheticSpec = (workspaceRoot: string): HtmlLearningKitSpec => {
  const unsigned: Omit<HtmlLearningKitSpec, 'specSha256'> = {
    schemaVersion: 'html-learning-kit-spec-v1' as const,
    specId: 'SYNTHETIC-LEARNING-KIT-001',
    designSystemLock: binding(workspaceRoot, `${base}/design-system-lock.json`),
    brandAuthority: binding(workspaceRoot, `${base}/brand-authority.json`),
    localizedContent: {
      siteTitle: text('Aula de ejemplo', 'Example classroom', 'Sala de aula de exemplo'),
      landingTitle: text('Ruta de práctica', 'Practice route', 'Rota de prática'),
      landingIntroduction: text(
        'Fixture sintético para validar el compilador.',
        'Synthetic fixture for compiler validation.',
        'Fixture sintético para validar o compilador.',
      ),
      libraryTitle: text('Recursos', 'Resources', 'Recursos'),
      skipLink: text('Saltar al contenido', 'Skip to content', 'Pular para o conteúdo'),
      themeLabel: text('Cambiar tema', 'Change theme', 'Alterar tema'),
    },
    workbook: {
      workbookId: 'SYNTHETIC-WORKBOOK-001',
      title: text('Cuaderno de práctica', 'Practice workbook', 'Caderno de prática'),
      introduction: text(
        'Tres hojas para practicar sin guardar respuestas.',
        'Three sheets for practice without saving responses.',
        'Três folhas para praticar sem salvar respostas.',
      ),
      interactions: {
        tabsKeyboard: true,
        copyPrompts: true,
        responsePersistence: 'none',
        preferencePersistence: ['theme', 'locale'],
      },
      noJs: {contentReadable: true, navigationFallback: 'fragments'},
      print: {enabled: true, hideInteractiveControls: true, preserveAllContent: true},
      sheets: [
        {
          sheetId: 'session',
          label: text('En sesión', 'In session', 'Na sessão'),
          purpose: text(
            'Practicar con guía.',
            'Practice with guidance.',
            'Praticar com orientação.',
          ),
          outcome: text('Un resultado definido.', 'A defined result.', 'Um resultado definido.'),
          steps: [
            {
              stepId: 'frame',
              title: text('Enmarcar', 'Frame', 'Enquadrar'),
              body: text(
                'Define un resultado observable.',
                'Define an observable result.',
                'Defina um resultado observável.',
              ),
              prompt: text(
                'Describe el resultado.',
                'Describe the result.',
                'Descreva o resultado.',
              ),
              evidence: text(
                'Una frase observable.',
                'One observable sentence.',
                'Uma frase observável.',
              ),
            },
          ],
        },
        {
          sheetId: 'depth',
          label: text('Profundización', 'Deepening', 'Aprofundamento'),
          purpose: text(
            'Probar otra condición.',
            'Test another condition.',
            'Testar outra condição.',
          ),
          outcome: text(
            'Una comparación explícita.',
            'An explicit comparison.',
            'Uma comparação explícita.',
          ),
          steps: [
            {
              stepId: 'compare',
              title: text('Comparar', 'Compare', 'Comparar'),
              body: text(
                'Contrasta dos opciones.',
                'Contrast two options.',
                'Compare duas opções.',
              ),
              prompt: text('Compara las opciones.', 'Compare the options.', 'Compare as opções.'),
              evidence: text(
                'Una diferencia relevante.',
                'One relevant difference.',
                'Uma diferença relevante.',
              ),
            },
          ],
        },
        {
          sheetId: 'consolidation',
          label: text('Consolidación', 'Consolidation', 'Consolidação'),
          purpose: text(
            'Transferir lo aprendido.',
            'Transfer the learning.',
            'Transferir o aprendizado.',
          ),
          outcome: text('Un caso transferido.', 'A transferred case.', 'Um caso transferido.'),
          steps: [
            {
              stepId: 'transfer',
              title: text('Transferir', 'Transfer', 'Transferir'),
              body: text(
                'Aplica el patrón en otro caso.',
                'Apply the pattern to another case.',
                'Aplique o padrão em outro caso.',
              ),
              prompt: text('Adapta el patrón.', 'Adapt the pattern.', 'Adapte o padrão.'),
              evidence: text('Un ejemplo nuevo.', 'A new example.', 'Um novo exemplo.'),
            },
          ],
        },
      ],
    },
    masterclass: {
      masterclassId: 'SYNTHETIC-MASTERCLASS-001',
      title: text('Clase de ejemplo', 'Example class', 'Aula de exemplo'),
      introduction: text(
        'Recorrido demostrativo.',
        'Demonstration journey.',
        'Percurso demonstrativo.',
      ),
      modes: [
        {id: 'core', minutes: 90},
        {id: 'extended', minutes: 120},
      ],
      keyboard: {
        next: ['ArrowRight', 'PageDown', 'Space'],
        previous: ['ArrowLeft', 'PageUp'],
        first: 'Home',
        last: 'End',
        ignoreEditableTargets: true,
        buttons: true,
        outline: true,
      },
      deepLinkContract: {
        preserveLocale: true,
        preserveFragment: true,
        missingTarget: 'block',
      },
      slides: [
        {
          slideId: 'opening',
          title: text('Abrir', 'Open', 'Abrir'),
          body: text('Presenta el propósito.', 'Present the purpose.', 'Apresente o propósito.'),
          timing: {coreMinutes: 30, extendedMinutes: 40},
          facilitatorNote: text(
            'Confirma expectativas.',
            'Confirm expectations.',
            'Confirme expectativas.',
          ),
        },
        {
          slideId: 'practice',
          title: text('Practicar', 'Practice', 'Praticar'),
          body: text(
            'Pausa para usar el cuaderno.',
            'Pause to use the workbook.',
            'Pausa para usar o caderno.',
          ),
          timing: {coreMinutes: 60, extendedMinutes: 80},
          facilitatorNote: text(
            'Abre el primer paso.',
            'Open the first step.',
            'Abra o primeiro passo.',
          ),
          workbookTarget: {sheetId: 'session', stepId: 'frame'},
        },
      ],
    },
    assets: [
      {
        assetId: 'learning-kit',
        source: binding(workspaceRoot, `${base}/learning-kit.css`),
        mediaType: 'text/css' as const,
        rights: {
          status: 'cleared' as const,
          scope: 'synthetic-test-fixture',
          evidence: binding(workspaceRoot, `${base}/rights-evidence.md`),
        },
      },
    ],
    outputs: [
      {kind: 'landing' as const, locale: 'es' as const, path: 'index.html'},
      {kind: 'landing' as const, locale: 'en' as const, path: 'en/index.html'},
      {kind: 'landing' as const, locale: 'pt' as const, path: 'pt/index.html'},
      {kind: 'workbook' as const, locale: 'es' as const, path: 'workbook/index.html'},
      {kind: 'workbook' as const, locale: 'en' as const, path: 'en/workbook/index.html'},
      {kind: 'workbook' as const, locale: 'pt' as const, path: 'pt/workbook/index.html'},
      {kind: 'masterclass' as const, locale: 'es' as const, path: 'masterclass/index.html'},
      {kind: 'masterclass' as const, locale: 'en' as const, path: 'en/masterclass/index.html'},
      {kind: 'masterclass' as const, locale: 'pt' as const, path: 'pt/masterclass/index.html'},
    ],
    privacy: {
      persistLearnerResponses: false as const,
      allowedLocalStorageKeys: ['locale', 'theme'],
    },
    maximumState: 'RENDERED_DRAFT' as const,
  };
  return HtmlLearningKitSpecSchema.parse({...unsigned, specSha256: calculateSpecSha256(unsigned)});
};
