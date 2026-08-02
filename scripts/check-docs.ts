import {existsSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

import {validateContentMatrix} from './check-content-matrix.ts';
import {validateDispositionLedger} from './generate-file-disposition-ledger.ts';

const requiredSections = [
  '## 1. Decisión operativa',
  '## 2. Topología',
  '## 3. Interfaces canónicas',
  '## 4. Pipeline compartido',
  '## 5. Matriz de ocho workflows',
  '## 6. Workflow activo candidato: carrusel',
  '## 7. Marca permanente',
  '## 8. Voz y tono',
  '## 9. Tokens y tipografías',
  '## 10. Estados y gate humano',
  '## 11. Presupuesto 10x sin expansión superior a 2x',
  '## 12. Disposición de archivos',
  '## 13. Privacidad y procedencia',
  '## 14. Criterio de done V2',
  '## 15. Coverage gaps',
] as const;

const workflowIds = [
  'IG-CAROUSEL-V1',
  'IG-FEED-TEXT-V1',
  'IG-FEED-PHOTO-V1',
  'IG-INFOGRAPHIC-V1',
  'IG-STORY-SEQUENCE-V1',
  'IG-REEL-MOTION-V1',
  'IG-MICROCOPY-V1',
  'IG-LIVE-KIT-V1',
] as const;

export const validateDocs = (root = process.cwd()): string[] => {
  const errors: string[] = [];
  const docPath = resolve(root, 'docs/program/instagram-content-network-v2.md');
  if (!existsSync(docPath)) return ['SOC-DOC001 central V2 document missing'];
  const document = readFileSync(docPath, 'utf8');
  const lineCount = document.split('\n').length;
  if (lineCount > 300) {
    errors.push(`SOC-DOC002 central document exceeds 300-line budget: ${lineCount}`);
  }
  for (const section of requiredSections) {
    if (!document.includes(section)) errors.push(`SOC-DOC003 required section missing: ${section}`);
  }
  for (const workflowId of workflowIds) {
    if (!document.includes(workflowId)) {
      errors.push(`SOC-DOC004 workflow absent from central document: ${workflowId}`);
    }
  }
  const workflowPositions = workflowIds.map((workflowId) => document.indexOf(workflowId));
  if (
    workflowPositions.some(
      (position, index) => position < 0 || (index > 0 && position <= workflowPositions[index - 1]!),
    )
  ) {
    errors.push('SOC-DOC008 workflow order drift in central document');
  }
  for (const marker of [
    'active_candidate',
    'BRAND_VALIDATED',
    'VOICE_CANDIDATE',
    'G15',
    'G16',
    'G17',
    'RENDERED_DRAFT',
    'HUMAN_APPROVED',
    'READY',
    'PUBLISHED',
    'RIGHTS_GAP',
  ]) {
    if (!document.includes(marker)) errors.push(`SOC-DOC005 state/gate marker missing: ${marker}`);
  }
  if (/\/Users\/|\/home\/|[A-Za-z]:\\Users\\/u.test(document)) {
    errors.push('SOC-DOC006 central document contains an absolute local locator');
  }
  if (!document.includes('Solo carrusel tiene implementación candidata')) {
    errors.push(
      'SOC-DOC007 planned workflows are not explicitly distinguished from implementation',
    );
  }
  for (const marker of [
    'RT-02…RT-10',
    'agentes especializados efímeros reales',
    'máximo operan dos instancias especialistas concurrentes',
    '2 + 2 + 1',
    'piloto usa exactamente 8',
  ]) {
    if (!document.includes(marker)) {
      errors.push(`SOC-DOC009 orchestration or pilot marker missing: ${marker}`);
    }
  }
  for (const forbidden of [
    'capability_projection',
    'Las antiguas especialidades RT-02…RT-10 son capacidades',
    'piloto usa 7',
  ]) {
    if (document.includes(forbidden)) {
      errors.push(`SOC-DOC010 obsolete orchestration or pilot claim present: ${forbidden}`);
    }
  }
  for (const budgetMarker of [
    'máximo de 2× sus palabras originales',
    'máximo de 1.5×',
    'binding generated/template',
    'hard cap de 2× palabras y 2× LOC',
    'immutable_history',
  ]) {
    if (!document.includes(budgetMarker)) {
      errors.push(`SOC-DOC011 approved budget contract missing: ${budgetMarker}`);
    }
  }
  for (const freshnessMarker of [
    'cuatro fuentes oficiales',
    '`observed_at`',
    '`stale_after_days: 30`',
    'permite pruebas locales',
    'no se presentan como máximos oficiales',
  ]) {
    if (!document.includes(freshnessMarker)) {
      errors.push(`SOC-DOC012 channel freshness contract missing: ${freshnessMarker}`);
    }
  }
  errors.push(...validateContentMatrix(root), ...validateDispositionLedger(root));
  return errors;
};

const isMain =
  process.argv[1] !== undefined && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isMain) {
  const errors = validateDocs();
  if (errors.length > 0) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
  } else {
    console.info(
      'PASS DOCS V2: network, exact 8-workflow matrix, budgets and 387/387 ledger are coherent.',
    );
  }
}
