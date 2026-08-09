import {
  CareerCvV1Schema,
  CareerLetterV1Schema,
  type CareerCvV1,
  type CareerLetterV1,
} from '../_schema/document-v1.schema.ts';
import {sha256Text, stableStringify} from './canonical.ts';

type CareerDocument = CareerCvV1 | CareerLetterV1;

const payload = (document: CareerDocument): unknown =>
  Object.fromEntries(Object.entries(document).filter(([key]) => key !== 'content_sha256'));

export const calculateCareerDocumentHash = (document: CareerDocument): string =>
  sha256Text(stableStringify(payload(document)));

export const parseCareerCv = (input: unknown): CareerCvV1 => {
  const document = CareerCvV1Schema.parse(input);
  if (calculateCareerDocumentHash(document) !== document.content_sha256) {
    throw new Error('Career CV content_sha256 mismatch');
  }
  return document;
};

export const parseCareerLetter = (input: unknown): CareerLetterV1 => {
  const document = CareerLetterV1Schema.parse(input);
  if (calculateCareerDocumentHash(document) !== document.content_sha256) {
    throw new Error('Career letter content_sha256 mismatch');
  }
  const words = document.paragraphs.join(' ').trim().split(/\s+/u).length;
  const range: readonly [number, number] =
    document.channel === 'letter' ? [180, 280] : document.channel === 'form' ? [80, 140] : [40, 70];
  if (words < range[0] || words > range[1]) {
    throw new Error(
      `${document.channel} requires ${range[0]}-${range[1]} words; received ${words}`,
    );
  }
  return document;
};
