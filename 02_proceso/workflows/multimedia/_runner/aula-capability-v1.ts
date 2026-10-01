export const AULA_KINDS = [
  'immersive-class',
  'masterclass',
  'workbook',
  'lean-coffee',
  'playbook',
  'playbook-immersive',
  'index',
  'module',
  'dynamic-commercial-decks',
] as const;
export type AulaKind = (typeof AULA_KINDS)[number];
export type AulaEdition = 'metodologia' | 'white-label';

/** Recommendation only. Execution remains behind the brief approval and WorkOrder. */
export function selectAulaCapabilityV1(request: string, edition?: AulaEdition) {
  if (edition !== undefined && !['metodologia', 'white-label'].includes(edition)) {
    throw new Error('AULA_EDITION_INVALID');
  }
  const text = request
    .normalize('NFD')
    .replaceAll(/\p{Diacritic}/gu, '')
    .toLowerCase();
  const rules: Array<[AulaKind, RegExp]> = [
    ['module', /kit completo|taller completo|modulo formativo|ruta formativa|training kit/u],
    ['index', /indice del modulo|landing del modulo|module home/u],
    ['playbook-immersive', /playbook inmersivo|immersive playbook/u],
    ['playbook', /playbook|referencia posterior|manual de adopcion/u],
    ['lean-coffee', /lean coffee|lean-coffee|conversacion de cierre/u],
    ['workbook', /workbook|cuaderno de trabajo|practica guiada|laboratorio|hands-on/u],
    ['immersive-class', /clase inmersiva|sesion presentada|clase presentada|presenter-led/u],
    ['masterclass', /masterclass|fundamentos|conceptos|foundation deck/u],
    [
      'dynamic-commercial-decks',
      /deck|presentacion comercial|prospeccion|defensa tecnica|webinar|keynote/u,
    ],
  ];
  const kind = rules.find(([, pattern]) => pattern.test(text))?.[0];
  if (!kind) return null;
  const resolvedEdition =
    edition ?? (/marca blanca|white.label/u.test(text) ? 'white-label' : 'metodologia');
  const skillId =
    kind === 'dynamic-commercial-decks'
      ? `${resolvedEdition}-dynamic-commercial-decks`
      : `${resolvedEdition === 'metodologia' ? 'metodologia-' : ''}edu-${kind}`;
  return {
    schemaVersion: 'frames-aula-capability-v1',
    kind,
    edition: resolvedEdition,
    skillId,
    priority: 'pertinence',
    runtimeStatus: 'active_local_draft',
    handlerRef: '02_proceso/workflows/multimedia/_runner/aula-material-handler-v1.ts',
    nextGate: 'EXP_BRIEF_APPROVED',
    publicationAuthority: false,
  } as const;
}
