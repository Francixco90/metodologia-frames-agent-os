import {createReadStream} from 'node:fs';
import {realpath, stat} from 'node:fs/promises';
import {isAbsolute, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

import {z} from 'zod';

import {DiagramContractV2Schema} from '../../../../02_proceso/workflows/video-os/_schema/method-explainer-execution-v1.schema.ts';
import {canonicalSha256} from '../../../../02_proceso/workflows/video-os/_schema/method-explainer-planning-v1.schema.ts';
import {Sha256Schema} from '../../../../02_proceso/workflows/video-os/_schema/video-os-v1.schema.ts';

const MAX_INPUT_BYTES = 8 * 1024 * 1024;
const InputSchema = z.strictObject({
  schema_version: z.literal('diagram-contract-validation-input-v1'),
  total_frames: z.number().int().min(450).max(5_400),
  expected_spec_sha256: Sha256Schema,
  expected_beat_budget_sha256: Sha256Schema,
  diagram: DiagramContractV2Schema,
});

type ValidationInput = z.infer<typeof InputSchema>;
type DiagramContract = ValidationInput['diagram'];

export class DiagramContractValidationError extends Error {
  public constructor(public readonly code: string) {
    super(code);
    this.name = 'DiagramContractValidationError';
  }
}

const fail = (code: string): never => {
  throw new DiagramContractValidationError(code);
};

export const sanitizedDiagramError = (error: unknown): string =>
  error instanceof DiagramContractValidationError && /^DIAGRAM_[A-Z0-9_]{3,80}$/u.test(error.code)
    ? error.code
    : 'DIAGRAM_VALIDATION_FAILED';

const inside = (
  child: {x: number; y: number; width: number; height: number},
  parent: {x: number; y: number; width: number; height: number},
): boolean =>
  child.x >= parent.x &&
  child.y >= parent.y &&
  child.x + child.width <= parent.x + parent.width &&
  child.y + child.height <= parent.y + parent.height;

export const assertDiagramContractInput = (raw: unknown): ValidationInput => {
  const parsed = InputSchema.safeParse(raw);
  const input = parsed.success ? parsed.data : fail('DIAGRAM_SCHEMA_INVALID');
  const {diagram, total_frames: totalFrames} = input;
  if (
    diagram.spec_sha256 !== input.expected_spec_sha256 ||
    diagram.beat_budget_sha256 !== input.expected_beat_budget_sha256
  )
    fail('DIAGRAM_HASH_BINDING_MISMATCH');

  const safe = diagram.stage.safe_zone;
  if (safe.x + safe.width > 1 || safe.y + safe.height > 1) fail('DIAGRAM_SAFE_ZONE_INVALID');
  const nodes = new Map(diagram.nodes.map((node) => [node.id, node]));
  if (nodes.size !== diagram.nodes.length) fail('DIAGRAM_DUPLICATE_NODE_ID');
  if (new Set(diagram.edges.map((edge) => edge.id)).size !== diagram.edges.length)
    fail('DIAGRAM_DUPLICATE_EDGE_ID');

  for (const node of diagram.nodes) {
    if (!inside(node.bounds, safe)) fail('DIAGRAM_NODE_OUTSIDE_SAFE_ZONE');
    if (
      node.settle_frame < node.enter_frame ||
      node.enter_frame >= totalFrames ||
      node.settle_frame >= totalFrames
    )
      fail('DIAGRAM_NODE_TIMING_INVALID');
  }
  const firstEnter = Math.min(...diagram.nodes.map((node) => node.enter_frame));
  const lastSettle = Math.max(...diagram.nodes.map((node) => node.settle_frame));
  for (const edge of diagram.edges) {
    if (!nodes.has(edge.source) || !nodes.has(edge.target)) fail('DIAGRAM_EDGE_ENDPOINT_MISSING');
    if (
      edge.start_frame < lastSettle + 6 ||
      edge.end_frame <= edge.start_frame ||
      edge.end_frame >= totalFrames
    )
      fail('DIAGRAM_EDGE_TIMING_INVALID');
  }

  const lastEdge = Math.max(0, ...diagram.edges.map((edge) => edge.end_frame));
  const poses = diagram.required_poses;
  if (
    poses.container_frame > firstEnter ||
    firstEnter > lastSettle ||
    poses.components_settled_frame < lastSettle ||
    poses.connectors_complete_frame < poses.components_settled_frame ||
    poses.connectors_complete_frame < lastEdge ||
    poses.closing_frame < poses.connectors_complete_frame ||
    Object.values(poses).some((frame) => frame >= totalFrames)
  )
    fail('DIAGRAM_POSE_ORDER_INVALID');
  return input;
};

const readLimited = async (stream: NodeJS.ReadableStream): Promise<string> => {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const value of stream) {
    const chunk = Buffer.isBuffer(value)
      ? value
      : typeof value === 'string'
        ? Buffer.from(value, 'utf8')
        : Buffer.from(value);
    size += chunk.length;
    if (size > MAX_INPUT_BYTES) fail('DIAGRAM_INPUT_TOO_LARGE');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks, size).toString('utf8');
};

const parseJson = (body: string): unknown => {
  try {
    return JSON.parse(body) as unknown;
  } catch {
    return fail('DIAGRAM_INPUT_JSON_INVALID');
  }
};

export const readDiagramInput = async (args: string[]): Promise<unknown> => {
  if (args.length > 1) fail('DIAGRAM_INPUT_ARGS_INVALID');
  const ref = args[0];
  if (!ref || ref === '-') return parseJson(await readLimited(process.stdin));
  if (
    isAbsolute(ref) ||
    ref.startsWith('~') ||
    ref.includes('\\') ||
    ref.split('/').includes('..') ||
    ref.split('/').some((segment) => /^(?:private|\.runtime)$/iu.test(segment)) ||
    /^[a-z][a-z0-9+.-]*:/iu.test(ref)
  )
    fail('DIAGRAM_INPUT_PATH_INVALID');
  try {
    const root = await realpath(process.cwd());
    const target = await realpath(resolve(root, ref));
    const fromRoot = relative(root, target);
    if (fromRoot.startsWith('..') || isAbsolute(fromRoot)) fail('DIAGRAM_INPUT_PATH_INVALID');
    const info = await stat(target);
    if (!info.isFile()) fail('DIAGRAM_INPUT_NOT_FILE');
    if (info.size > MAX_INPUT_BYTES) fail('DIAGRAM_INPUT_TOO_LARGE');
    return parseJson(await readLimited(createReadStream(target)));
  } catch (error) {
    if (error instanceof DiagramContractValidationError) throw error;
    return fail('DIAGRAM_INPUT_READ_FAILED');
  }
};

export const validateDiagramContract = (raw: unknown) => {
  const input = assertDiagramContractInput(raw);
  return {
    schema_version: 'diagram-contract-validation-result-v1',
    status: 'PASS',
    diagram_sha256: canonicalSha256(input.diagram),
  } as const;
};

const main = async (): Promise<void> => {
  try {
    const result = validateDiagramContract(await readDiagramInput(process.argv.slice(2)));
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } catch (error) {
    process.stderr.write(
      `${JSON.stringify({schema_version: 'diagram-contract-validation-result-v1', status: 'BLOCKED', error_code: sanitizedDiagramError(error)})}\n`,
    );
    process.exitCode = 2;
  }
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();

export type {DiagramContract, ValidationInput};
