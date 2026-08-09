export const CONTENT_SIGNALS_V1 = [
  'contenido',
  'pieza',
  'campana',
  'carrusel',
  'historia',
  'reel',
  'video',
  'imagen',
  'brief',
] as const;
export const CAREER_SIGNALS_V1 = [
  'cv',
  'resume',
  'hoja de vida',
  'cover letter',
  'carta',
  'vacante',
  'empleo',
  'linkedin',
  'postular',
] as const;
export const RESUME_SIGNALS_V1 = ['continuar', 'retomar', 'reanudar', 'seguir con'] as const;
export const PROJECT_SIGNALS_V1 = ['crear proyecto', 'nuevo proyecto'] as const;
export const TASK_SIGNALS_V1 = ['crear tarea', 'nueva tarea'] as const;
export const EVAL_SIGNALS_V1 = ['eval', 'evaluacion', 'ablation', 'ablacion'] as const;

export const normalizeFirstTurnPromptV1 = (prompt: string): string =>
  prompt
    .normalize('NFD')
    .replaceAll(/\p{Diacritic}/gu, '')
    .trim()
    .toLowerCase()
    .replace(/^[\p{P}\p{S}\s]+|[\p{P}\p{S}\s]+$/gu, '');

export const hasFirstTurnSignalV1 = (prompt: string, signals: readonly string[]): boolean =>
  signals.some((signal) => prompt.includes(signal));

export const classifyGovernedLegacyRouteV1 = (
  prompt: string,
  hasActiveProject: boolean,
): 'R1' | 'R2' | 'R3' | 'R3-LOOSE' | 'R5' | null => {
  if (hasFirstTurnSignalV1(prompt, EVAL_SIGNALS_V1)) return 'R5';
  if (hasFirstTurnSignalV1(prompt, PROJECT_SIGNALS_V1)) return 'R1';
  if (hasFirstTurnSignalV1(prompt, TASK_SIGNALS_V1)) return hasActiveProject ? 'R3' : 'R3-LOOSE';
  if (hasFirstTurnSignalV1(prompt, RESUME_SIGNALS_V1)) return 'R2';
  return null;
};
