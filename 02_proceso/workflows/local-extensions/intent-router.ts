import {createHash} from 'node:crypto';

export type LocalExtensionKind = 'skill' | 'workflow' | 'bundle';
export type LocalExtensionScope = 'PROJECT_LOCAL' | 'USER_LOCAL';

export interface LocalExtensionIntentInput {
  request: string;
  extension_kind?: LocalExtensionKind;
  scope?: LocalExtensionScope;
  desired_capability?: string;
}

export interface LocalExtensionIntentRoute {
  schema_version: 'frames-local-extension-intent-route-v1';
  route_id: 'R8';
  request_hash: string;
  normalized_request: string;
  extension_kind?: LocalExtensionKind;
  scope?: LocalExtensionScope;
  desired_capability: string;
  blocking_questions: string[];
  stage_path: ['L00', 'L01', 'L02', 'L03', 'L04', 'L05'];
  active_step: 'L00';
  next_gate: 'LX_BRIEF_APPROVED';
  write_policy: 'read_only_until_brief_approved';
  state: 'NEEDS_INPUT' | 'READY_FOR_BRIEF_APPROVAL';
}

const normalized = (value: string): string => value.trim().replace(/\s+/gu, ' ');
const canonical = (value: Record<string, string | undefined>): string =>
  JSON.stringify(
    Object.fromEntries(
      Object.entries(value)
        .filter((entry): entry is [string, string] => entry[1] !== undefined)
        .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0)),
    ),
  );

const inferKind = (request: string): LocalExtensionKind | undefined => {
  if (/\b(?:skill|habilidad)\b/iu.test(request)) return 'skill';
  if (/\b(?:workflow|flujo|recorrido)\b/iu.test(request)) return 'workflow';
  if (/\b(?:bundle|paquete)\b/iu.test(request)) return 'bundle';
  return undefined;
};

const inferScope = (request: string): LocalExtensionScope | undefined => {
  if (/\b(?:este proyecto|solo el proyecto|project local)\b/iu.test(request)) {
    return 'PROJECT_LOCAL';
  }
  if (/\b(?:todos mis proyectos|nivel usuario|user local)\b/iu.test(request)) {
    return 'USER_LOCAL';
  }
  return undefined;
};

export const routeLocalExtensionIntent = (
  input: LocalExtensionIntentInput,
): LocalExtensionIntentRoute => {
  const request = normalized(input.request);
  if (!request) throw new Error('LOCAL_EXTENSION_REQUEST_REQUIRED');
  const extensionKind = input.extension_kind ?? inferKind(request);
  const scope = input.scope ?? inferScope(request);
  const desiredCapability = normalized(input.desired_capability ?? request);
  const questions: string[] = [];
  if (!desiredCapability || desiredCapability.length < 8) {
    questions.push('¿Qué resultado concreto debe producir o mejorar esta capacidad?');
  }
  if (!extensionKind) {
    questions.push('¿Necesitas una skill, un workflow completo o un paquete de ambos?');
  }
  if (!scope) {
    questions.push('¿Debe estar disponible solo en este proyecto o en todos tus proyectos?');
  }
  const blockingQuestions = questions.slice(0, 3);
  const hashInput = {
    request,
    extension_kind: extensionKind,
    scope,
    desired_capability: desiredCapability,
  };
  return {
    schema_version: 'frames-local-extension-intent-route-v1',
    route_id: 'R8',
    request_hash: createHash('sha256').update(canonical(hashInput)).digest('hex'),
    normalized_request: request,
    ...(extensionKind ? {extension_kind: extensionKind} : {}),
    ...(scope ? {scope} : {}),
    desired_capability: desiredCapability,
    blocking_questions: blockingQuestions,
    stage_path: ['L00', 'L01', 'L02', 'L03', 'L04', 'L05'],
    active_step: 'L00',
    next_gate: 'LX_BRIEF_APPROVED',
    write_policy: 'read_only_until_brief_approved',
    state: blockingQuestions.length > 0 ? 'NEEDS_INPUT' : 'READY_FOR_BRIEF_APPROVAL',
  };
};
