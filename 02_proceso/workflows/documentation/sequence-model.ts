import type {SequenceMessageV1, SequenceModelV1, WorkflowDocumentationV1} from './contracts.ts';

export const buildSequenceModel = (workflow: WorkflowDocumentationV1): SequenceModelV1 => {
  const actors = ['Persona', 'Frames'];
  const messages: SequenceMessageV1[] = [
    {from: 'Persona', to: 'Frames', label: `Solicita ${workflow.title}`, kind: 'request'},
  ];
  const summaries: string[] = [`La persona solicita ${workflow.title}.`];
  for (const step of workflow.steps) {
    const verifier = step.verifier === 'unassigned' ? null : step.verifier;
    const recorder = step.recorder ?? null;
    const decisionActor = step.decisionActor ?? verifier ?? 'Frames';
    if (!actors.includes(step.primarySkill)) actors.push(step.primarySkill);
    for (const actor of [verifier, recorder, decisionActor]) {
      if (actor !== null && !actors.includes(actor)) actors.push(actor);
    }
    messages.push({
      from: 'Frames',
      to: step.primarySkill,
      label: `${step.id}: ${step.purpose}`,
      kind: 'work',
    });
    let currentActor = step.primarySkill;
    if (verifier !== null) {
      const verifierEvidence = recorder === null ? step.outputs : step.inputs;
      messages.push({
        from: currentActor,
        to: verifier,
        label: `Evidencia: ${verifierEvidence.join(', ')}`,
        kind: 'evidence',
      });
      currentActor = verifier;
    }
    if (recorder !== null && recorder !== currentActor) {
      const verdictOutputs = step.outputs.filter(
        (output) => output.includes('verdict') && !output.includes('receipt'),
      );
      messages.push({
        from: currentActor,
        to: recorder,
        label: `Veredicto para registro: ${verdictOutputs.join(', ') || 'verdict hash-bound'}`,
        kind: 'evidence',
      });
      currentActor = recorder;
    }
    if (decisionActor !== currentActor) {
      messages.push({
        from: currentActor,
        to: decisionActor,
        label: `Solicitud: ${step.outputs.join(', ') || step.gate}`,
        kind: 'evidence',
      });
    }
    messages.push({
      from: decisionActor,
      to: 'Frames',
      label: `Gate ${step.gate}`,
      kind: 'decision',
    });
    if (recorder !== null && verifier !== null) {
      summaries.push(
        `${step.id}: ${step.primarySkill} reúne ${step.inputs.join(', ') || 'evidencia'}; ${verifier} emite el verdict; ${recorder} persiste ${step.outputs.filter((output) => output.includes('receipt')).join(', ') || 'el receipt'}; ${decisionActor} resuelve ${step.gate}.`,
      );
    } else {
      const controls = [
        verifier === null ? null : `${verifier} verifica`,
        `${decisionActor} decide ${step.gate}`,
      ].filter((item): item is string => item !== null);
      summaries.push(
        `${step.id}: ${step.primarySkill} prepara ${step.outputs.join(', ') || 'evidencia'}; ${controls.join('; ')}.`,
      );
    }
  }
  messages.push({
    from: 'Frames',
    to: 'Persona',
    label: `Entrega o siguiente paso: ${workflow.nextWorkflow || 'cierre'}`,
    kind: 'decision',
  });
  summaries.push(
    `Frames entrega el resultado y ${workflow.nextWorkflow ? `propone ${workflow.nextWorkflow}` : 'cierra el recorrido'}.`,
  );
  return {
    schemaVersion: 'sequence-model-v1',
    workflowId: workflow.id,
    actors,
    messages,
    accessibleSummary: summaries,
  };
};
