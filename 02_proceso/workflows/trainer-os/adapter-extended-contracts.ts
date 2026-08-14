import {z} from 'zod';

import {TrainerEvidenceIdsSchema, TrainerEvidenceSchema} from './adapter-contracts.ts';
import {HashRefSchema, IdSchema, Sha256Schema, hashModel} from './common.ts';

const Text = z.string().min(1).max(500);
const Cta = z.strictObject({
  label: z
    .string()
    .min(1)
    .max(40)
    .refine((value) => value.trim().split(/\s+/u).length <= 3),
  href: z.string().regex(/^#[a-z][a-z0-9_-]*$/iu),
});
const Step = z.strictObject({
  id: IdSchema,
  title: Text,
  instruction: Text,
  evidenceIds: TrainerEvidenceIdsSchema,
});
const Chapter = z.strictObject({
  id: IdSchema,
  title: Text,
  purpose: Text,
  evidenceIds: TrainerEvidenceIdsSchema,
  steps: z.array(Step).min(1).max(8),
});
const Playbook = z.strictObject({
  kind: z.literal('playbook'),
  hero: z.strictObject({title: Text, lede: Text, cta: Cta, evidenceIds: TrainerEvidenceIdsSchema}),
  essentialChapters: z.array(Chapter).length(12),
  optionalChapters: z.array(Chapter).max(7),
});
const Prompt = z.strictObject({
  id: IdSchema,
  stepId: IdSchema,
  title: Text,
  evidenceIds: TrainerEvidenceIdsSchema,
  levels: z.tuple([
    z.strictObject({level: z.literal(1), body: Text}),
    z.strictObject({level: z.literal(2), body: Text}),
    z.strictObject({level: z.literal(3), body: Text}),
    z.strictObject({level: z.literal(4), body: Text}),
  ]),
});
const PromptLibrary = z.strictObject({
  kind: z.literal('prompt-library'),
  hero: z.strictObject({title: Text, lede: Text, cta: Cta, evidenceIds: TrainerEvidenceIdsSchema}),
  prompts: z.array(Prompt).min(1).max(152),
});
const Locale = z
  .strictObject({playbook: Playbook, promptLibrary: PromptLibrary})
  .superRefine((value, context) => {
    const chapters = [...value.playbook.essentialChapters, ...value.playbook.optionalChapters];
    const chapterIds = chapters.map(({id}) => id);
    const stepIds = chapters.flatMap(({steps}) => steps.map(({id}) => id));
    const promptIds = value.promptLibrary.prompts.map(({id}) => id);
    const promptSteps = value.promptLibrary.prompts.map(({stepId}) => stepId);
    const domIds = [
      'content',
      'copy-status',
      ...chapterIds,
      ...stepIds,
      ...promptIds.flatMap((id) => [
        id,
        `${id}-title`,
        ...[1, 2, 3, 4].flatMap((level) => [`${id}-level-${level}`, `${id}-level-${level}-body`]),
      ]),
    ];
    if (
      new Set([...chapterIds, ...stepIds, ...promptIds]).size !==
      chapterIds.length + stepIds.length + promptIds.length
    )
      context.addIssue({code: 'custom', message: 'extended content ids must be globally unique'});
    if (new Set(domIds).size !== domIds.length)
      context.addIssue({code: 'custom', message: 'extended derived DOM ids must be unique'});
    if (
      new Set(promptSteps).size !== promptSteps.length ||
      promptSteps.some((id) => !stepIds.includes(id))
    )
      context.addIssue({
        code: 'custom',
        message: 'every prompt must bind one unique playbook step',
      });
    if (promptSteps.length !== stepIds.length || stepIds.some((id) => !promptSteps.includes(id)))
      context.addIssue({code: 'custom', message: 'every playbook step must have one prompt'});
    if (
      !chapterIds.includes(value.playbook.hero.cta.href.slice(1)) ||
      !promptIds.includes(value.promptLibrary.hero.cta.href.slice(1))
    )
      context.addIssue({code: 'custom', message: 'extended CTA fragments must resolve'});
  });

export const TrainerExtendedContentSchema = z
  .strictObject({
    schemaVersion: z.literal('trainer-extended-content-v1'),
    contentId: IdSchema,
    contentSha256: Sha256Schema,
    routeSpec: HashRefSchema,
    designLock: HashRefSchema,
    evidence: z
      .array(TrainerEvidenceSchema)
      .min(1)
      .refine((items) => new Set(items.map(({evidenceId}) => evidenceId)).size === items.length),
    locales: z.strictObject({es: Locale, en: Locale.optional(), pt: Locale.optional()}),
    requestedLocales: z
      .array(z.enum(['es', 'en', 'pt']))
      .min(1)
      .max(3)
      .refine((items) => new Set(items).size === items.length),
    brandId: z.literal('metodologia'),
    publicationAuthority: z.literal(false),
  })
  .superRefine((value, context) => {
    const available = Object.entries(value.locales)
      .filter(([, item]) => item)
      .map(([key]) => key)
      .sort();
    if (available.join(',') !== [...value.requestedLocales].sort().join(','))
      context.addIssue({
        code: 'custom',
        path: ['requestedLocales'],
        message: 'requested locales must exactly match content',
      });
    if (hashModel(value, 'contentSha256') !== value.contentSha256)
      context.addIssue({
        code: 'custom',
        path: ['contentSha256'],
        message: 'extended content hash drift',
      });
    const declared = new Set(value.evidence.map(({evidenceId}) => evidenceId));
    const used = Object.values(value.locales).flatMap((item) =>
      item
        ? [
            ...item.playbook.hero.evidenceIds,
            ...item.playbook.essentialChapters.flatMap(({evidenceIds, steps}) => [
              ...evidenceIds,
              ...steps.flatMap(({evidenceIds: ids}) => ids),
            ]),
            ...item.playbook.optionalChapters.flatMap(({evidenceIds, steps}) => [
              ...evidenceIds,
              ...steps.flatMap(({evidenceIds: ids}) => ids),
            ]),
            ...item.promptLibrary.hero.evidenceIds,
            ...item.promptLibrary.prompts.flatMap(({evidenceIds}) => evidenceIds),
          ]
        : [],
    );
    if (
      used.some((id) => !declared.has(id)) ||
      value.evidence.some(({evidenceId}) => !used.includes(evidenceId))
    )
      context.addIssue({
        code: 'custom',
        path: ['evidence'],
        message: 'extended evidence ids must resolve and be used',
      });
  });

export type TrainerExtendedLocale = z.infer<typeof Locale>;
