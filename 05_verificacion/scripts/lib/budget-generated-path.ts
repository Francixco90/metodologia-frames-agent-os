import {ledgerProjectionPaths} from './file-disposition-policy-v3.ts';
import {isGeneratedProjection} from '../ledger/decision.ts';

const physicalLedgerProjections = new Set([
  '01_intencion/program/file-disposition-ledger.yml',
  '01_intencion/program/file-disposition-ledger.md',
]);

export const isBudgetGeneratedPath = (path: string, logicalPath: string): boolean =>
  physicalLedgerProjections.has(path) ||
  ledgerProjectionPaths.has(logicalPath) ||
  /^02_proceso\/workflows\/multimedia\/p\d{2}-[^/]+\/schematic\.html$/u.test(path) ||
  /^02_proceso\/workflows\/multimedia\/_assets\/multimedia-library\.(?:md|html)$/u.test(path) ||
  /^02_proceso\/workflows\/multimedia\/p\d{2}-[^/]+\/templates\/[^/]+\.template\.(?:md|html)$/u.test(
    path,
  ) ||
  /^03_artefactos\/content\/experience\/(?:frames-experience-blueprint\.html|projection-manifest\.json)$/u.test(
    path,
  ) ||
  /^(?:\.agents\/plugins\/marketplace\.json|\.agents\/skills\/frames-assist\/SKILL\.md|\.claude\/(?:commands\/frames\/assist\.md|skills\/frames-assist\/SKILL\.md)|\.gemini\/commands\/frames\/assist\.toml)$/u.test(
    path,
  ) ||
  /^02_proceso\/workflows\/multimedia\/(?:_schema\/artifacts\/|_assets\/artifact-registry\.md$)/u.test(
    path,
  ) ||
  isGeneratedProjection(logicalPath);
