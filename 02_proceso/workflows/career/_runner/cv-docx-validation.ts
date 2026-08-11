import JSZip from 'jszip';

import {parseCareerCv} from './document-model.ts';

const textFromXml = (xml: string): string[] =>
  [...xml.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/gu)].map((match) =>
    (match[1] ?? '')
      .replaceAll('&amp;', '&')
      .replaceAll('&lt;', '<')
      .replaceAll('&gt;', '>')
      .replaceAll('&quot;', '"')
      .replaceAll('&apos;', "'"),
  );

/** Observa estructura y orden ATS sin inferir una puntuación propietaria. */
export const validateCareerCvAtsDocx = async (
  buffer: Buffer,
  input: unknown,
): Promise<string[]> => {
  const cv = parseCareerCv(input);
  const zip = await JSZip.loadAsync(buffer);
  const issues: string[] = [];
  const documentXml = await zip.file('word/document.xml')?.async('string');
  if (!documentXml) return ['DOCX_DOCUMENT_XML_MISSING'];
  if (/<w:tbl(?:\s|>)/u.test(documentXml)) issues.push('DOCX_TABLE_FORBIDDEN');
  if (/<w:(?:drawing|pict|txbxContent)(?:\s|>)/u.test(documentXml)) {
    issues.push('DOCX_GRAPHIC_OR_TEXTBOX_FORBIDDEN');
  }
  if (/<w:cols[^>]*w:num="[2-9][0-9]*"/u.test(documentXml)) issues.push('DOCX_MULTICOLUMN');
  if (!/<w:numPr(?:\s|>)/u.test(documentXml)) issues.push('DOCX_NATIVE_BULLETS_MISSING');
  if (Object.keys(zip.files).some((name) => /^word\/(?:header|footer)[0-9]*\.xml$/u.test(name))) {
    issues.push('DOCX_HEADER_OR_FOOTER_FORBIDDEN');
  }
  const extracted = textFromXml(documentXml).join('\n');
  for (const contact of cv.contact_lines) {
    if (!extracted.includes(contact)) issues.push(`DOCX_CONTACT_NOT_IN_BODY:${contact}`);
  }
  const labels =
    cv.language === 'es'
      ? {
          summary: 'Perfil',
          experience: 'Experiencia',
          skills: 'Capacidades',
          education: 'Formación',
        }
      : cv.language === 'pt'
        ? {
            summary: 'Perfil',
            experience: 'Experiência',
            skills: 'Competências',
            education: 'Formação',
          }
        : {
            summary: 'Profile',
            experience: 'Experience',
            skills: 'Capabilities',
            education: 'Education',
          };
  const sections = {
    summary: [labels.summary, cv.summary],
    experience: [
      labels.experience,
      ...cv.experience.flatMap((item) => [
        `${item.role} — ${item.organization}`,
        `${item.period}${item.location ? ` · ${item.location}` : ''}`,
        ...item.achievements.map(({text}) => text),
      ]),
    ],
    skills: [labels.skills, ...cv.skills],
    education: cv.education.length ? [labels.education, ...cv.education] : [],
  };
  const order =
    cv.schema_version === 'career-cv-v2'
      ? cv.section_order
      : (['summary', 'experience', 'skills', 'education'] as const);
  const expectedOrder = [
    cv.name,
    cv.headline,
    ...cv.contact_lines,
    ...order.flatMap((section) => sections[section]),
  ];
  let cursor = -1;
  for (const text of expectedOrder) {
    const next = extracted.indexOf(text, cursor + 1);
    if (next < 0) issues.push(`DOCX_TEXT_MISSING:${text}`);
    else if (next < cursor) issues.push(`DOCX_READING_ORDER:${text}`);
    else cursor = next;
  }
  return issues;
};
