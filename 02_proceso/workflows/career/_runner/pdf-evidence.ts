import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';

const sha256 = (value: Buffer | string): string => createHash('sha256').update(value).digest('hex');

const normalize = (value: string): string =>
  value
    .normalize('NFC')
    .replaceAll('\r\n', '\n')
    .replace(/[ \t]+/gu, ' ')
    .replace(/ *\n */gu, '\n')
    .trim();

export type PdfTextEvidence = {
  text_sha256: string;
  semantic_sha256: string;
  page_count: number;
};

export const extractPdfTextEvidence = (bytes: Buffer): PdfTextEvidence | null => {
  const result = spawnSync('pdftotext', ['-', '-'], {input: bytes, encoding: 'utf8'});
  if (result.status !== 0 || !result.stdout.trim()) return null;
  const pages = result.stdout.split('\f').map(normalize).filter(Boolean);
  const text = normalize(pages.join('\n\n'));
  return {
    text_sha256: sha256(text),
    semantic_sha256: sha256(`${text}\npage_count:${pages.length}`),
    page_count: pages.length,
  };
};
