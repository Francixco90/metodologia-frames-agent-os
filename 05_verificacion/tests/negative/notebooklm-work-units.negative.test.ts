import {NotebookWorkUnitDeclarationSchema} from '../../../core/contracts/index.ts';

const validNoneDeclaration = () => ({
  contract_ref: 'registries/notebooks/work-unit-binding-contract.yml' as const,
  adapter_id: 'notebooklm-grounding-readonly-v1' as const,
  binding_id: 'NB-BINDING-INSTAGRAM-CONTENT-001',
  purpose: 'Verify evidence coverage',
  question: 'Which governed sources support this work unit?',
  binding: {
    mode: 'none' as const,
    reason_code: 'binding_not_selected',
    locator_material_present: false as const,
  },
  coverage: {
    status: 'coverage_gap' as const,
    expected_source_ids: ['SRC-PROMPT-MAESTRO-V6', 'SRC-SYNTH-VS001'],
    covered_source_ids: [] as string[],
    missing_source_ids: ['SRC-PROMPT-MAESTRO-V6', 'SRC-SYNTH-VS001'],
    evidence_refs: [] as string[],
  },
  permissions: {
    access_mode: 'read_only' as const,
    mutation: 'forbidden' as const,
    evidence_promotion: 'forbidden_without_source_mapping' as const,
    source_locked_effect: 'none' as const,
  },
});

describe('NotebookLM work-unit fail-closed rejection', () => {
  it('rejects claimed evidence or coverage when binding mode is none', () => {
    const declaration = validNoneDeclaration();
    declaration.coverage.covered_source_ids = ['SRC-SYNTH-VS001'];
    declaration.coverage.missing_source_ids = ['SRC-PROMPT-MAESTRO-V6'];
    declaration.coverage.evidence_refs = ['receipts/fabricated.yml'];

    expect(NotebookWorkUnitDeclarationSchema.safeParse(declaration).success).toBe(false);
  });

  it('rejects an incomplete coverage partition', () => {
    const declaration = validNoneDeclaration();
    declaration.coverage.missing_source_ids = ['SRC-PROMPT-MAESTRO-V6'];

    expect(NotebookWorkUnitDeclarationSchema.safeParse(declaration).success).toBe(false);
  });

  it('rejects locator material and write permissions as undeclared fields or values', () => {
    const withLocator = {
      ...validNoneDeclaration(),
      binding: {
        ...validNoneDeclaration().binding,
        notebook_id: 'invented-live-notebook',
      },
    };
    const withMutation = {
      ...validNoneDeclaration(),
      permissions: {
        ...validNoneDeclaration().permissions,
        mutation: 'allowed',
      },
    };

    expect(NotebookWorkUnitDeclarationSchema.safeParse(withLocator).success).toBe(false);
    expect(NotebookWorkUnitDeclarationSchema.safeParse(withMutation).success).toBe(false);
  });
});
