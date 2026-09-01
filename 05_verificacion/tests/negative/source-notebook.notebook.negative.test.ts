import {groundingRequestSchema, notebookBindingSchema} from '../../../adapters/notebooklm/index.ts';

const digest = 'a'.repeat(64);
const validDigestBinding = () => ({
  mode: 'digest' as const,
  bindingDigest: digest,
  coverage: {
    sourceCount: 1,
    citedSourceCount: 1,
    coverageDigest: digest,
    observedAt: '2026-07-19T20:38:02Z',
  },
  locatorMaterialPresent: false as const,
});

describe('NotebookLM adversarial rejection', () => {
  it('rejects explicit write operations and locator material flags', () => {
    expect(
      groundingRequestSchema.safeParse({
        operation: 'add_source',
        binding: {mode: 'none', reasonCode: 'binding-not-selected', locatorMaterialPresent: false},
        claimIds: [],
      }).success,
    ).toBe(false);
    expect(
      notebookBindingSchema.safeParse({...validDigestBinding(), locatorMaterialPresent: true})
        .success,
    ).toBe(false);
  });

  it('rejects an undeclared absolute locator field instead of stripping it', () => {
    const notebookLocator = ['', 'private', 'forbidden', 'notebook'].join('/');
    const adversarialJson = JSON.parse(
      JSON.stringify({...validDigestBinding(), notebookLocator}),
    ) as unknown;
    expect(notebookBindingSchema.safeParse(adversarialJson).success).toBe(false);
  });

  it('rejects undeclared live mutation instructions on a read operation', () => {
    const adversarialJson = JSON.parse(
      JSON.stringify({
        operation: 'query_grounding',
        binding: validDigestBinding(),
        claimIds: ['CLM-VS001-001'],
        liveMutation: {operation: 'add_source', activate: true},
      }),
    ) as unknown;
    expect(groundingRequestSchema.safeParse(adversarialJson).success).toBe(false);
  });

  it('rejects malformed coverage timestamps', () => {
    const binding = validDigestBinding();
    binding.coverage.observedAt = 'not-an-iso-timestamp';
    expect(notebookBindingSchema.safeParse(binding).success).toBe(false);
  });

  it('rejects digest material in none mode', () => {
    expect(
      notebookBindingSchema.safeParse({
        mode: 'none',
        reasonCode: 'binding-not-selected',
        locatorMaterialPresent: false,
        bindingDigest: digest,
      }).success,
    ).toBe(false);
  });

  it('rejects grounding queries without a claim/source mapping', () => {
    expect(
      groundingRequestSchema.safeParse({
        operation: 'query_grounding',
        binding: validDigestBinding(),
        claimIds: [],
      }).success,
    ).toBe(false);
  });
});
