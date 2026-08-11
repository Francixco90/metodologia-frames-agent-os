import {spawnSync} from 'node:child_process';
import {existsSync} from 'node:fs';

const available = () => spawnSync('unzip', ['-v'], {stdio: 'ignore'}).status === 0;
const inspect = (path, member) => spawnSync('unzip', ['-p', path, member], {encoding: 'utf8'});

export const verifyDocx = (path, capability = available) => {
  if (!existsSync(path)) return {status: 'BLOCKED', issues: ['DOCX_MISSING']};
  if (!capability()) return {status: 'UNKNOWN', issues: ['DOCX_TOOLCHAIN_UNAVAILABLE']};
  const listing = spawnSync('unzip', ['-Z1', path], {encoding: 'utf8'});
  if (listing.status !== 0) return {status: 'BLOCKED', issues: ['DOCX_INVALID_ZIP']};
  const files = listing.stdout.split(/\r?\n/u);
  const document = inspect(path, 'word/document.xml');
  const issues = [];
  if (document.status !== 0 || !document.stdout) issues.push('DOCX_DOCUMENT_MISSING');
  if (files.some((name) => /^word\/(?:header|footer)[0-9]+\.xml$/u.test(name))) {
    issues.push('DOCX_HEADER_FOOTER');
  }
  if (
    /<w:tbl\b|<w:cols\b[^>]*w:num=["'][2-9]|<w:txbxContent\b|<w:drawing\b/iu.test(document.stdout)
  ) {
    issues.push('DOCX_FORBIDDEN_STRUCTURE');
  }
  const extracted = document.stdout
    .replaceAll(/<[^>]+>/gu, ' ')
    .replaceAll(/\s+/gu, ' ')
    .trim();
  if (!extracted) issues.push('DOCX_TEXT_NOT_EXTRACTABLE');
  return {status: issues.length ? 'BLOCKED' : 'PASS', issues, extracted};
};
