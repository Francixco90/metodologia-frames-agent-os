import {hashBytes, hashFile, portableResolve} from './runtime-io.ts';
import type {TrainerRunManifestV1} from './trainer-run-manifest-v1.schema.ts';

export const verifyContinuity = (runPath: string, manifest: TrainerRunManifestV1) => {
  for (const output of [manifest.stateOutput, manifest.resumeOutput, manifest.handoffOutput])
    if (output && hashFile(portableResolve(runPath, output.ref)) !== output.sha256)
      throw new Error(`TRAINER_CONTINUITY_BYTES_CHANGED:${output.ref}`);
};

export const verifyWriteIsolation = (
  runPath: string,
  manifest: TrainerRunManifestV1,
  protectedRefs: string[],
  generatedRefs: string[],
) => {
  const writes = [manifest.stateRef, manifest.resumeRef, manifest.handoffRef, ...generatedRefs].map(
    (ref) => portableResolve(runPath, ref),
  );
  const protectedPaths = protectedRefs.map((ref) => portableResolve(runPath, ref));
  if (
    new Set(writes).size !== writes.length ||
    writes.some((path) => protectedPaths.includes(path))
  )
    throw new Error('TRAINER_WRITE_TARGET_ALIAS');
};

export const prepareContinuity = (manifest: TrainerRunManifestV1, mode: string) => {
  const next = {
    INTAKE: 'intake',
    CONTEXT_READY: 'spec',
    SPEC_READY: 'H01_DESIGN_DECISION',
    DESIGN_LOCKED: 'build',
    COMPILED: 'verify',
    VERIFIED: 'HUMAN_REVIEW',
    HUMAN_REVIEW: 'RENDERED_DRAFT',
    RENDERED_DRAFT: 'STOP',
  }[manifest.state];
  const state = `${JSON.stringify({schemaVersion: 'trainer-state-v1', runId: manifest.runId, state: manifest.state, invalidated: manifest.invalidated}, null, 2)}\n`;
  const resume = `# Resume ${manifest.runId}\n\nState: ${manifest.state}\nNext: ${next}\n`;
  const handoff = `${JSON.stringify(
    {
      schemaVersion: 'trainer-handoff-v1',
      runId: manifest.runId,
      completedMode: mode,
      state: manifest.state,
      intake: manifest.intake ?? null,
      routeSpec: manifest.routeSpec ?? null,
      invalidated: manifest.invalidated,
      coverageGaps:
        manifest.state === 'SPEC_READY'
          ? ['design_lock_pending_h01']
          : ['DESIGN_LOCKED', 'COMPILED'].includes(manifest.state)
            ? [`${next}_runtime_pending`]
            : [],
      nextGate: next,
      maximumState: 'RENDERED_DRAFT',
      publicationAuthority: false,
    },
    null,
    2,
  )}\n`;
  return {
    outputs: {
      stateOutput: {ref: manifest.stateRef, sha256: hashBytes(state)},
      resumeOutput: {ref: manifest.resumeRef, sha256: hashBytes(resume)},
      handoffOutput: {ref: manifest.handoffRef, sha256: hashBytes(handoff)},
    },
    writes: [
      [manifest.stateRef, state],
      [manifest.resumeRef, resume],
      [manifest.handoffRef, handoff],
    ] as const,
  };
};
