import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const root = process.cwd();
const required = [
  'skills/motion-library-adapters/SKILL.md',
  'skills/motion-library-adapters/LINEAGE.yml',
  'skills/motion-library-adapters/schemas/motion-adapter-spec-v1.schema.json',
  'skills/motion-library-adapters/fixtures/positive/local-frame-seek.yml',
  'skills/motion-library-adapters/fixtures/negative/hostile-adapters.yml',
  'skills/motion-library-adapters/examples/minimal.ts',
  'skills/motion-library-adapters/receipts/runtime-boundary.yml',
  'renderers/remotion/src/adapters/adapter-runtime.ts',
  'renderers/remotion/src/adapters/gsap-adapter.ts',
  'renderers/remotion/src/adapters/three-adapter.ts',
  'renderers/remotion/src/adapters/lottie-adapter.ts',
  'renderers/remotion/src/adapters/remotion-adapter.ts',
  'renderers/remotion/src/adapters/h03-probe-components.tsx',
];

const contents = new Map(required.map((path) => [path, readFileSync(resolve(root, path), 'utf8')]));
const packageJson = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
for (const [name, version] of Object.entries({
  '@remotion/lottie': '4.0.494',
  '@remotion/three': '4.0.494',
  '@react-three/fiber': '9.2.0',
  gsap: '3.15.0',
  'lottie-web': '5.13.0',
  remotion: '4.0.494',
  three: '0.178.0',
})) {
  if (packageJson.dependencies?.[name] !== version) {
    throw new Error(
      `MOTION_ADAPTER_PIN_MISMATCH: ${name}@${String(packageJson.dependencies?.[name])}`,
    );
  }
}

const combined = [...contents.values()].join('\n');
const runtimeCombined = [
  'renderers/remotion/src/adapters/adapter-runtime.ts',
  'renderers/remotion/src/adapters/gsap-adapter.ts',
  'renderers/remotion/src/adapters/three-adapter.ts',
  'renderers/remotion/src/adapters/lottie-adapter.ts',
  'renderers/remotion/src/adapters/remotion-adapter.ts',
  'renderers/remotion/src/adapters/h03-probe-components.tsx',
]
  .map((path) => contents.get(path))
  .join('\n');
for (const token of [
  'createExplicitFrameContext',
  'timeline({paused: true})',
  'ticker.sleep()',
  'ThreeCanvas',
  'loop={false}',
  'useCurrentFrame',
]) {
  if (!combined.includes(token)) {
    throw new Error(`MOTION_ADAPTER_CONTRACT_MISSING: ${token}`);
  }
}
for (const pattern of [
  /\bMath\.random\s*\(/u,
  /\bDate\.now\s*\(/u,
  /\bnew\s+Date\s*\(/u,
  /\bfetch\s*\(/u,
  /\bsetTimeout\s*\(/u,
  /\bsetInterval\s*\(/u,
  /\buseFrame\s*\(/u,
]) {
  if (pattern.test(runtimeCombined)) {
    throw new Error(`MOTION_ADAPTER_FORBIDDEN_API: ${String(pattern)}`);
  }
}

console.info(`PASS motion-library-adapters: ${required.length} governed resources.`);
