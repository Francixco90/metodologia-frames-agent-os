import {AlignmentType, Document, HeadingLevel, LevelFormat, Packer, Paragraph, TextRun} from 'docx';
import JSZip from 'jszip';

import type {CareerCvV1} from '../_schema/document-v1.schema.ts';
import type {CareerCvV2} from '../_schema/document-v2.schema.ts';
import {assertCareerEvidence} from './evidence-gate.ts';
import {parseCareerCv} from './document-model.ts';

export {validateCareerCvAtsDocx} from './cv-docx-validation.ts';

const FIXED_ZIP_DATE = new Date('2000-01-01T00:00:00.000Z');
const BULLET_REFERENCE = 'career-ats-bullets';
type CareerCv = CareerCvV1 | CareerCvV2;

const heading = (text: string): Paragraph =>
  new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: {before: 180, after: 60},
    children: [new TextRun({text, bold: true, size: 22, font: 'Arial'})],
  });

const textParagraph = (text: string, options: {bold?: boolean; after?: number} = {}): Paragraph =>
  new Paragraph({
    spacing: {after: options.after ?? 40},
    children: [new TextRun({text, bold: options.bold ?? false, size: 20, font: 'Arial'})],
  });

const bullet = (text: string): Paragraph =>
  new Paragraph({
    numbering: {reference: BULLET_REFERENCE, level: 0},
    spacing: {after: 40},
    children: [new TextRun({text, size: 20, font: 'Arial'})],
  });

const bodyParagraphs = (cv: CareerCv): Paragraph[] => {
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
  const sections: Record<'summary' | 'experience' | 'skills' | 'education', Paragraph[]> = {
    summary: [heading(labels.summary), textParagraph(cv.summary)],
    experience: [
      heading(labels.experience),
      ...cv.experience.flatMap((item) => [
        textParagraph(`${item.role} — ${item.organization}`, {bold: true, after: 10}),
        textParagraph(`${item.period}${item.location ? ` · ${item.location}` : ''}`, {after: 30}),
        ...item.achievements.map(({text}) => bullet(text)),
      ]),
    ],
    skills: [heading(labels.skills), ...cv.skills.map((skill) => bullet(skill))],
    education: cv.education.length
      ? [heading(labels.education), ...cv.education.map((item) => bullet(item))]
      : [],
  };
  const order =
    cv.schema_version === 'career-cv-v2'
      ? cv.section_order
      : (['summary', 'experience', 'skills', 'education'] as const);
  return [
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: {after: 40},
      children: [new TextRun({text: cv.name, bold: true, size: 36, font: 'Arial'})],
    }),
    textParagraph(cv.headline, {bold: true, after: 20}),
    ...cv.contact_lines.map((line) => textParagraph(line, {after: 10})),
    ...order.flatMap((section) => sections[section]),
  ];
};

const normalizeDocx = async (buffer: Buffer): Promise<Buffer> => {
  const loaded = await JSZip.loadAsync(buffer);
  const normalized = new JSZip();
  for (const name of Object.keys(loaded.files).sort((left, right) =>
    left.localeCompare(right, 'en'),
  )) {
    const item = loaded.files[name];
    if (!item) continue;
    // [CÓDIGO] Las entradas de directorio son opcionales en OPC y JSZip les
    // asigna metadata temporal. Omitirlas evita volatilidad sin alterar partes.
    if (item.dir) continue;
    let content: Buffer | string = await item.async('nodebuffer');
    if (name === 'docProps/core.xml') {
      content = content
        .toString('utf8')
        .replaceAll(/<dcterms:(created|modified)[^>]*>[^<]*<\/dcterms:\1>/gu, (value) =>
          value.replace(/>[^<]*</u, '>2000-01-01T00:00:00Z<'),
        );
    }
    normalized.file(name, content, {date: FIXED_ZIP_DATE, createFolders: false});
  }
  return normalized.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: {level: 9},
    platform: 'DOS',
  });
};

/** Genera DOCX ATS de una columna; contacto, contenido y bullets permanecen en el body. */
export const renderCareerCvAtsDocx = async (
  input: unknown,
  evidenceBank: unknown,
): Promise<Buffer> => {
  const cv = parseCareerCv(input);
  if (cv.design_profile !== 'candidate-neutral-ats') {
    throw new Error('ATS_DOCX_REQUIRES_CANDIDATE_NEUTRAL_PROFILE');
  }
  assertCareerEvidence(cv, evidenceBank);
  const document = new Document({
    creator: 'MetodologIA',
    lastModifiedBy: 'MetodologIA',
    title: cv.name,
    subject: cv.headline,
    description: 'ATS-safe CV projection bound to a canonical Career OS document',
    numbering: {
      config: [
        {
          reference: BULLET_REFERENCE,
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: '•',
              alignment: AlignmentType.LEFT,
              style: {paragraph: {indent: {left: 360, hanging: 180}}},
            },
          ],
        },
      ],
    },
    styles: {
      default: {
        document: {run: {font: 'Arial', size: 20}},
        heading2: {run: {font: 'Arial', size: 22, bold: true}},
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: {width: 11_906, height: 16_838},
            margin: {top: 792, right: 936, bottom: 792, left: 936},
          },
        },
        children: bodyParagraphs(cv),
      },
    ],
  });
  return normalizeDocx(await Packer.toBuffer(document));
};
