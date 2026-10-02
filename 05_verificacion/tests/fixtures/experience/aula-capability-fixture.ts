import {readdirSync} from 'node:fs';
import {resolve} from 'node:path';
export const requests = [
  ['workshop-immersive', 'Crear un deck para facilitar un workshop inmersivo'],
  ['immersive-class', 'Crear una clase inmersiva para una sesión presentada'],
  ['masterclass', 'Crear una masterclass sobre conceptos'],
  ['workbook', 'Crear un workbook de práctica guiada'],
  ['lean-coffee', 'Crear Lean Coffee de cierre'],
  ['playbook', 'Crear un playbook de adopción'],
  ['playbook-immersive', 'Crear un playbook inmersivo'],
  ['index', 'Crear el índice del módulo'],
  ['module', 'Crear un kit completo para un taller'],
  ['dynamic-commercial-decks', 'Crear un deck de prospección'],
] as const;
export function engineFiles(dir: string, prefix = ''): string[] {
  return readdirSync(dir, {withFileTypes: true}).flatMap((entry) => {
    if (entry.isSymbolicLink()) throw new Error('FIXTURE_ENGINE_SYMLINK');
    return entry.isDirectory()
      ? engineFiles(resolve(dir, entry.name), prefix + entry.name + '/')
      : [prefix + entry.name];
  });
}
export type Execution = {
  local_execution: {
    status: string;
    materialized: boolean;
    coverageGap?: string;
    specRef?: string;
    receiptRef?: string;
  };
};
