import {spawnSync} from 'node:child_process';
import {existsSync, mkdtempSync, readFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const available = (command) => spawnSync(command, ['-v'], {stdio: 'ignore'}).status === 0;

export const verifyPdf = (path, pageBudget, capability = available) => {
  if (!existsSync(path)) return {status: 'BLOCKED', issues: ['PDF_MISSING']};
  if (!capability('pdfinfo') || !capability('pdftotext') || !capability('mutool')) {
    return {status: 'UNKNOWN', issues: ['PDF_TOOLCHAIN_UNAVAILABLE']};
  }
  const directory = mkdtempSync(join(tmpdir(), 'cv-pdf-'));
  const textPath = join(directory, 'text.txt');
  try {
    const info = spawnSync('pdfinfo', [path], {encoding: 'utf8'});
    const text = spawnSync('pdftotext', [path, textPath], {encoding: 'utf8'});
    const links = spawnSync('mutool', ['show', path, 'pages/1/Annots'], {encoding: 'utf8'});
    const pages = Number(info.stdout.match(/^Pages:\s+(\d+)/mu)?.[1] ?? 0);
    const extracted = existsSync(textPath) ? readFileSync(textPath, 'utf8').trim() : '';
    const issues = [];
    if (info.status !== 0 || text.status !== 0 || pages === 0) issues.push('PDF_PARSE');
    if (!extracted) issues.push('PDF_TEXT_NOT_SELECTABLE');
    if (pages > pageBudget) issues.push('PAGE_BUDGET_EXCEEDED');
    if (links.status !== 0 || !/\/URI\b/u.test(links.stdout)) issues.push('PDF_LINKS_NOT_OBSERVED');
    return {status: issues.length ? 'BLOCKED' : 'PASS', issues, pages};
  } finally {
    rmSync(directory, {recursive: true, force: true});
  }
};
