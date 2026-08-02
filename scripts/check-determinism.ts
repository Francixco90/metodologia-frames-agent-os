import {existsSync, readdirSync, readFileSync, statSync} from 'node:fs';
import {join, relative, resolve} from 'node:path';

type Finding = {path: string; line: number; rule: string};

const rendererRoot = resolve(process.cwd(), 'renderers/remotion');
const findings: Finding[] = [];
const rules: Array<[string, RegExp]> = [
  ['Math.random', /\bMath\.random\s*\(/u],
  ['Date.now', /\bDate\.now\s*\(/u],
  ['new Date', /\bnew\s+Date\s*\(/u],
  ['performance.now', /\bperformance\.now\s*\(/u],
  ['setTimeout', /\bsetTimeout\s*\(/u],
  ['setInterval', /\bsetInterval\s*\(/u],
  ['requestAnimationFrame', /\brequestAnimationFrame\s*\(/u],
  ['network fetch', /\bfetch\s*\(/u],
  ['CSS animation', /\banimation(?:Name|Duration|TimingFunction)?\s*:/u],
  ['CSS transition', /\btransition(?:Property|Duration|TimingFunction)?\s*:/u],
  ['GSAP ticker', /\bgsap\.ticker\b/u],
  ['D3 transition', /\.transition\s*\(/u],
  ['R3F useFrame', /\buseFrame\s*\(/u],
];

const walk = (path: string): string[] => {
  if (!existsSync(path)) return [];
  return readdirSync(path).flatMap((name) => {
    const child = join(path, name);
    return statSync(child).isDirectory() ? walk(child) : [child];
  });
};

for (const path of walk(rendererRoot).filter((candidate) => /\.[cm]?[jt]sx?$/u.test(candidate))) {
  const portablePath = relative(process.cwd(), path).replaceAll('\\', '/');
  const lines = readFileSync(path, 'utf8').split('\n');
  lines.forEach((line, index) => {
    for (const [rule, pattern] of rules) {
      if (pattern.test(line)) {
        const isGovernedTickerStop =
          rule === 'GSAP ticker' &&
          portablePath === 'renderers/remotion/src/adapters/gsap-adapter.ts' &&
          line.trim() === 'const sleepAutonomousTicker = (): void => gsap.ticker.sleep();';
        if (!isGovernedTickerStop) {
          findings.push({path: portablePath, line: index + 1, rule});
        }
      }
    }
  });
}

if (findings.length > 0) {
  console.error(
    findings
      .map(({path, line, rule}) => `${path}:${line}: API no determinista: ${rule}`)
      .join('\n'),
  );
  process.exitCode = 1;
} else {
  console.info(
    'PASS DETERMINISM STATIC: renderer sin APIs temporales, red o animaciones no gobernadas.',
  );
}
