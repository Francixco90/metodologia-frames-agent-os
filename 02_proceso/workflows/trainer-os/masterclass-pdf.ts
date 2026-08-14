import {Buffer} from 'node:buffer';

import type {TrainerMasterclassContent} from './masterclass-contracts.ts';

type PdfTheme = {
  colors: {navy: string; gold: string; lightCanvas: string};
  typography: {heading: string; body: string};
};

const hex = (value: string) => Buffer.from(value, 'latin1').toString('hex').toUpperCase();
const lines = (value: string, maximum = 68) => {
  const words = value
    .split(/\s+/u)
    .flatMap((word) =>
      word.length > maximum ? (word.match(new RegExp(`.{1,${maximum}}`, 'gu')) ?? []) : [word],
    );
  return words.reduce<string[]>((result, word) => {
    const last = result.at(-1);
    if (!last || `${last} ${word}`.length > maximum) result.push(word);
    else result[result.length - 1] = `${last} ${word}`;
    return result;
  }, []);
};
const textLines = (items: string[], leading: number) =>
  items.map((item, index) => `${index ? `0 -${leading} Td ` : ''}<${hex(item)}> Tj`).join(' ');
const rgb = (color: string) =>
  [1, 3, 5]
    .map((offset) => (Number.parseInt(color.slice(offset, offset + 2), 16) / 255).toFixed(3))
    .join(' ');
const footer = {
  es: {base: 'min base', extension: 'min extra', route: 'Ruta 90 + 30'},
  en: {base: 'base min', extension: 'extra min', route: 'Route 90 + 30'},
  pt: {base: 'min base', extension: 'min extra', route: 'Rota 90 + 30'},
};
const stream = (
  title: string,
  lede: string,
  body: string,
  locale: 'es' | 'en' | 'pt',
  index: number,
  base: number,
  extended: number,
  theme: PdfTheme,
) => {
  const titleLines = lines(title, 44);
  const ledeLines = lines(lede);
  const bodyLines = lines(body);
  if (titleLines.length > 2 || ledeLines.length > 3 || bodyLines.length > 6)
    throw new Error(`TRAINER_MASTERCLASS_TEXT_OVERFLOW:${index}`);
  const ink = rgb(theme.colors.navy);
  const timing = footer[locale];
  return `/Artifact BMC q ${rgb(theme.colors.lightCanvas)} rg 0 0 960 540 re f ${rgb(theme.colors.gold)} rg 60 54 620 32 re f Q EMC /H1 <</MCID 0>> BDC BT ${ink} rg /F1 22 Tf 72 455 Td ${textLines(titleLines, 28)} ET EMC /P <</MCID 1>> BDC BT ${ink} rg /F1 15 Tf 72 345 Td ${textLines(ledeLines, 20)} ET EMC /P <</MCID 2>> BDC BT ${ink} rg /F1 13 Tf 72 265 Td ${textLines(bodyLines, 20)} ET EMC /P <</MCID 3>> BDC BT ${ink} rg /F1 10 Tf 72 66 Td <${hex(`${index} / 18 · ${base} ${timing.base} · ${extended} ${timing.extension} · ${timing.route}`)}> Tj ET EMC`;
};

export const renderMasterclassPdf = (
  content: TrainerMasterclassContent,
  locale: 'es' | 'en' | 'pt',
  theme: PdfTheme,
) => {
  const localized = content.locales[locale];
  if (!localized) throw new Error(`TRAINER_MASTERCLASS_LOCALE_MISSING:${locale}`);
  const objects: string[] = ['', ''];
  const fontId = 39;
  for (const [index, moment] of localized.moments.entries()) {
    const pageId = 3 + index * 2;
    const contentId = pageId + 1;
    const bytes = stream(
      moment.title,
      localized.lede,
      moment.body,
      locale,
      index + 1,
      moment.baseMinutes,
      moment.extendedMinutes,
      theme,
    );
    objects.push(
      `<< /Type /Page /Parent 2 0 R /StructParents ${index} /MediaBox [0 0 960 540] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`,
    );
    objects.push(
      `<< /Length ${Buffer.byteLength(bytes, 'latin1')} >>\nstream\n${bytes}\nendstream`,
    );
  }
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  objects.push(
    `<< /Type /StructTreeRoot /K [${localized.moments.flatMap((_, page) => Array.from({length: 4}, (_, item) => `${41 + page * 4 + item} 0 R`)).join(' ')}] /ParentTree 113 0 R >>`,
  );
  for (const [page] of localized.moments.entries())
    for (const [item, role] of ['H1', 'P', 'P', 'P'].entries())
      objects.push(
        `<< /Type /StructElem /S /${role} /P 40 0 R /Pg ${3 + page * 2} 0 R /K ${item} >>`,
      );
  objects.push(
    `<< /Nums [${localized.moments.map((_, page) => `${page} [${Array.from({length: 4}, (_, item) => `${41 + page * 4 + item} 0 R`).join(' ')}]`).join(' ')}] >>`,
  );
  objects.push(
    `<< /Title <${hex(localized.title)}> /Subject <${hex(`${theme.typography.heading} + ${theme.typography.body} design intent; Helvetica PDF Standard-14 fallback`)}> /Producer <${hex('MetodologIA trainer-native-pdf-v1')}> >>`,
  );
  objects[0] = `<< /Type /Catalog /Pages 2 0 R /Lang (${locale}) /MarkInfo << /Marked true >> /StructTreeRoot 40 0 R >>`;
  objects[1] = `<< /Type /Pages /Count 18 /Kids [${localized.moments.map((_, index) => `${3 + index * 2} 0 R`).join(' ')}] >>`;
  const chunks = [Buffer.from('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n', 'latin1')];
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.concat(chunks).length);
    chunks.push(Buffer.from(`${index + 1} 0 obj\n${object}\nendobj\n`, 'latin1'));
  }
  const xref = Buffer.concat(chunks).length;
  chunks.push(
    Buffer.from(
      `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets
        .slice(1)
        .map((offset) => `${String(offset).padStart(10, '0')} 00000 n `)
        .join(
          '\n',
        )}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info 114 0 R >>\nstartxref\n${xref}\n%%EOF\n`,
      'latin1',
    ),
  );
  return Buffer.concat(chunks);
};

export const renderMasterclassQaViewer = (pdfRef: string, locale: 'es' | 'en' | 'pt') => {
  const match = /^(?:\.\.\/)*dist\/masterclass\/(es|en|pt)\/masterclass\.pdf$/u.exec(pdfRef);
  if (!match || match[1] !== locale) throw new Error('TRAINER_MASTERCLASS_QA_REF_INVALID');
  return `<!doctype html><html lang="${locale}"><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><title>Masterclass QA</title><body data-qa-only="true" data-publication="false"><nav><a href="${pdfRef}">PDF oficial</a></nav><object data="${pdfRef}" type="application/pdf"><a href="${pdfRef}">Abrir PDF</a></object></body></html>`;
};

export const countPdfPages = (bytes: Buffer) =>
  bytes.toString('latin1').match(/\/Type \/Page\b/gu)?.length ?? 0;
