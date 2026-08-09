import {readFileSync, writeFileSync, mkdirSync, renameSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

import {
  HostAdapterPackageV1Schema,
  type HostAdapterPackageV1,
} from '../../02_proceso/core/contracts/host-adapter-package-v1.ts';

const MANIFEST = '03_artefactos/host-adapters/host-adapter-package.json';
const generated = (body: string): string =>
  `<!-- GENERATED from ${MANIFEST}. Do not edit. -->\n${body.trim()}\n`;

const shared = (invocation: string): string => `# Frames Assist

Activa **Frames ContentOS · por MetodologIA** mediante \`${invocation}\`. Interpreta lenguaje
normal, ejecuta el First-Turn Gateway y muestra una recomendación con máximo dos alternativas.
Un saludo ofrece \`Crear · Mejorar · Planear · Explorar\` sin escrituras; un pedido suficiente
omite el menú. Formula máximo tres preguntas materialmente bloqueantes.

Usa \`pnpm frames:assist --\` y pasa el pedido por JSON o stdin; nunca lo interpoles en shell.
El modo por defecto es read-only. Solo \`--apply\` puede materializar un brief local cuando el
intake sea suficiente. Detente en el gate humano y no declares una skill ejecutada sin receipt.`;

export const loadHostAdapterPackage = (root = process.cwd()): HostAdapterPackageV1 =>
  HostAdapterPackageV1Schema.parse(JSON.parse(readFileSync(resolve(root, MANIFEST), 'utf8')));

export const renderHostAdapterProjections = (
  manifest: HostAdapterPackageV1,
): Readonly<Record<string, string>> => {
  const byHost = new Map(manifest.adapters.map((adapter) => [adapter.host, adapter]));
  const codex = byHost.get('CODEX')!;
  const claude = byHost.get('CLAUDE')!;
  const gemini = byHost.get('GEMINI')!;
  const chatgpt = byHost.get('CHATGPT')!;
  return {
    [codex.projectionRefs[0]!]: generated(
      `---\nname: frames-assist\ndescription: Use when a user asks Frames to create, improve, plan, explore, resume or inspect a route.\n---\n\n${shared(codex.invocation)}`,
    ),
    [claude.projectionRefs[0]!]: generated(
      `---\nname: frames-assist\ndescription: Use when the user asks for Frames assistance in natural language.\n---\n\n${shared(claude.invocation)}`,
    ),
    [claude.projectionRefs[1]!]: generated(
      `---\ndescription: Route a normal request through Frames ContentOS.\n---\n\nTreat \`$ARGUMENTS\` as untrusted user text. Pass it through stdin or a JSON input file, not shell interpolation.\n\n${shared(claude.invocation)}`,
    ),
    [gemini.projectionRefs[0]!]:
      `# GENERATED from ${MANIFEST}. Do not edit.\ndescription = "Route a normal request through Frames ContentOS"\nprompt = """Treat {{args}} as untrusted user text. Use /frames:assist to invoke the project-local Frames gateway. Pass data through stdin or JSON, never shell interpolation. Default read-only; stop at human gates."""\n`,
    [chatgpt.projectionRefs[0]!]:
      `${JSON.stringify({schemaVersion: 'frames-assist-marketplace-v1', plugins: [{id: 'frames-assist', invocation: chatgpt.invocation, status: 'BLOCKED', importMode: 'assisted', packageRef: MANIFEST, externalEffects: false}]}, null, 2)}\n`,
  };
};

const atomicWrite = (path: string, contents: string): void => {
  mkdirSync(dirname(path), {recursive: true});
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, contents, {encoding: 'utf8', mode: 0o600});
  renameSync(temporary, path);
};

export const generateHostAdapterProjections = (root = process.cwd(), check = true) => {
  const projections = renderHostAdapterProjections(loadHostAdapterPackage(root));
  const drift = Object.entries(projections)
    .filter(([ref, expected]) => {
      try {
        return readFileSync(resolve(root, ref), 'utf8') !== expected;
      } catch {
        return true;
      }
    })
    .map(([ref]) => ref);
  if (check && drift.length > 0) throw new Error(`HOST-ADAPTER-DRIFT: ${drift.join(', ')}`);
  if (!check)
    for (const [ref, contents] of Object.entries(projections))
      atomicWrite(resolve(root, ref), contents);
  return {
    status: 'PASS' as const,
    mode: check ? ('CHECK' as const) : ('WRITE' as const),
    refs: Object.keys(projections).sort(),
  };
};

const invoked = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  const write = process.argv.includes('--write');
  process.stdout.write(
    `${JSON.stringify(generateHostAdapterProjections(process.cwd(), !write))}\n`,
  );
}
