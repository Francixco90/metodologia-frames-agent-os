import {z} from 'zod';

import {HashRefSchema, IdSchema, Sha256Schema, hashModel} from './common.ts';

const Text = z.string().min(1).max(500);
const Cta = z.strictObject({
  label: z
    .string()
    .min(1)
    .max(40)
    .refine((value) => value.trim().split(/\s+/u).length <= 3),
  href: z.string().regex(/^(?:https:\/\/[^\s]+|\/[a-z0-9][a-z0-9/_-]*)$/iu),
});
const Step = z.strictObject({id: IdSchema, title: Text, instruction: Text});
const Chapter = z.strictObject({
  id: IdSchema,
  title: Text,
  purpose: Text,
  steps: z.array(Step).min(1).max(8),
});
const Playbook = z.strictObject({
  kind: z.literal('playbook'),
  hero: z.strictObject({title: Text, lede: Text, cta: Cta}),
  essentialChapters: z.array(Chapter).length(12),
  optionalChapters: z.array(Chapter).max(7),
});
const Prompt = z.strictObject({
  id: IdSchema,
  stepId: IdSchema,
  title: Text,
  levels: z.tuple([
    z.strictObject({level: z.literal(1), body: Text}),
    z.strictObject({level: z.literal(2), body: Text}),
    z.strictObject({level: z.literal(3), body: Text}),
    z.strictObject({level: z.literal(4), body: Text}),
  ]),
});
const PromptLibrary = z.strictObject({
  kind: z.literal('prompt-library'),
  hero: z.strictObject({title: Text, lede: Text, cta: Cta}),
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
    if (
      new Set([...chapterIds, ...stepIds, ...promptIds]).size !==
      chapterIds.length + stepIds.length + promptIds.length
    )
      context.addIssue({code: 'custom', message: 'extended content ids must be globally unique'});
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
  });

export const TrainerExtendedContentSchema = z
  .strictObject({
    schemaVersion: z.literal('trainer-extended-content-v1'),
    contentId: IdSchema,
    contentSha256: Sha256Schema,
    routeSpec: HashRefSchema,
    designLock: HashRefSchema,
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
  });

export type TrainerExtendedLocale = z.infer<typeof Locale>;
