import {z} from 'zod';

const SafeText = z
  .string()
  .min(1)
  .refine((value) => !/(?:file:\/\/|\/Users\/|\/home\/|@|private-client)/iu.test(value));

const ScenarioInput = <T extends string>(scenarioId: T) =>
  z.strictObject({
    scenarioId: z.literal(scenarioId),
    topic: SafeText,
    audience: SafeText,
    purpose: SafeText,
    sources: z.array(SafeText.regex(/^SYNTHETIC:/u)).min(2),
    locales: z.tuple([z.literal('es'), z.literal('en'), z.literal('pt')]),
    artifacts: z.tuple([
      z.literal('landing'),
      z.literal('masterclass'),
      z.literal('workbook'),
      z.literal('playbook'),
      z.literal('prompt-library'),
    ]),
    acceptance: z.array(SafeText).min(3),
    promptBudget: z.strictObject({min: z.literal(3), max: z.literal(5)}),
  });

export const TrainerBenchmarkInputBundleSchema = z.strictObject({
  schemaVersion: z.literal('trainer-benchmark-inputs-v1'),
  scenarios: z.tuple([
    ScenarioInput('ai-literacy'),
    ScenarioInput('operational-productivity'),
    ScenarioInput('technical-training'),
  ]),
});
