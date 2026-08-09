import {type ContextSurfaceV1} from '../../02_proceso/core/contracts/context-surface-v1.ts';

const REGISTRY_PATH = '02_proceso/governance/context-surfaces/registry.yml';

const list = (items: string[], empty: string): string =>
  items.length === 0 ? `- ${empty}` : items.map((item) => `- \`${item}\``).join('\n');

const inline = (items: string[], empty: string): string =>
  items.length === 0 ? `\`${empty}\`` : items.map((value) => `\`${value}\``).join(', ');

export const renderContextSurface = (surface: ContextSurfaceV1): string => `<!--
GENERATED from ${REGISTRY_PATH}. Do not edit this projection.
context_id: ${surface.context_id}
-->

# Contexto: ${surface.root}

## 1. Propósito y activación

${surface.applies_when}

## 2. Autoridad y precedencia

Owner: \`${surface.owner}\`. Cargar en este orden:

${list(surface.authority_refs, 'Sin autoridad resoluble: bloquear.')}

## 3. Carga mínima y contexto diferido

Primero:

${list(surface.load_first, 'Bloquear.')}

Solo bajo demanda:

${list(surface.load_on_demand, 'Ningún contexto adicional.')}

Diferir:

${list(surface.defer, 'Nada.')}

## 4. Routing, workflow y skills

Rutas: ${inline(surface.routes, 'ninguna')}  
Workflows: ${inline(surface.workflows, 'ninguno')}  
Skills primarias: ${inline(surface.primary_skills, 'ninguna')}

## 5. Tools, efectos y write policy

Tools: ${inline(surface.tools, 'ninguna')}  
Modo: \`${surface.write_policy.mode}\`. Read set mínimo:

${list(surface.read_set, 'Bloquear.')}

Write set:

${list(surface.write_policy.paths, 'Sin escrituras.')}

Privacidad: \`${surface.privacy}\`. Nunca persistir secretos, PII ni razonamiento privado.

## 6. Gates, handoff y contextos hijos

Gates: ${inline(surface.gates, 'ninguno')}  
Stop rules: ${surface.stop_rules.join(' · ')}

Hijos:

${list(surface.children, 'Ninguno; devolver handoff al contexto padre.')}
`;
