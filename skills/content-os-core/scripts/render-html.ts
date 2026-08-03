/**
 * Content OS Core — HTML→MP4 render adapter.
 *
 * Drives a headless Chromium (Playwright 1.61.1) per frame time, scrubs the
 * composition's paused GSAP timeline to `frame / fps`, screenshots PNG, and
 * pipes the frames to FFmpeg `image2pipe` → libx264 → MP4.
 *
 * Determinism: frame 0 is captured twice; sha256 must match (else abort).
 * Offline: any non-`file:`/`data:` request aborts the render.
 * No wall-clock: this file uses no Date.now/Math.random/new Date/fetch/setTimeout.
 * Timestamps in the receipt come from the composition spec (input), not a clock.
 *
 * Reference: skills/vendor/hyperframes/hyperframes-core/SKILL.md (Option D adapter,
 * upstream @hyperframes/engine kept as reference-only — see docs/content-os/architecture.md §2).
 * Pattern: renderers/static-social/scripts/render-carousel.ts.
 */
import {execFileSync, spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {dirname, resolve, relative, basename} from 'node:path';

import {chromium} from 'playwright';

const sha256 = (value: Uint8Array | string): string =>
  createHash('sha256').update(value).digest('hex');
const portable = (value: string): string => value.replaceAll('\\', '/');

type RenderOptions = {
  compositionPath: string;
  compositionId: string;
  width: number;
  height: number;
  fps: number;
  durationInFrames: number;
  outputMp4: string;
  root?: string;
};

const parseArgs = (argv: readonly string[]): RenderOptions => {
  const get = (flag: string): string => {
    const idx = argv.indexOf(flag);
    if (idx === -1 || argv[idx + 1] === undefined) {
      throw new Error(`COS-ARG-MISSING: ${flag}`);
    }
    return argv[idx + 1] as string;
  };
  const opts: RenderOptions = {
    compositionPath: get('--composition'),
    compositionId: get('--composition-id'),
    width: Number.parseInt(get('--width'), 10),
    height: Number.parseInt(get('--height'), 10),
    fps: Number.parseFloat(get('--fps')),
    durationInFrames: Number.parseInt(get('--duration'), 10),
    outputMp4: get('--output'),
  };
  if (
    !Number.isFinite(opts.width) ||
    !Number.isFinite(opts.height) ||
    !Number.isFinite(opts.fps) ||
    !Number.isInteger(opts.durationInFrames) ||
    opts.width <= 0 ||
    opts.height <= 0 ||
    opts.fps <= 0 ||
    opts.durationInFrames <= 0
  ) {
    throw new Error('COS-ARG-INVALID: width/height/fps/duration must be positive');
  }
  return opts;
};

const ffmpegVersion = (): string => {
  try {
    const out = execFileSync('ffmpeg', ['-version'], {encoding: 'utf8'});
    return out.split('\n')[0]?.trim() ?? 'ffmpeg-unknown';
  } catch {
    throw new Error('COS-FFMPEG-MISSING: ffmpeg 8.1.1 required on PATH');
  }
};

const scrub = ({
  compositionId,
  frame,
  fps,
}: {
  compositionId: string;
  frame: number;
  fps: number;
}): void => {
  const timeline = (
    window as unknown as {__timelines?: Record<string, {seek: (t: number) => void}>}
  ).__timelines?.[compositionId];
  if (timeline && typeof timeline.seek === 'function') {
    timeline.seek(frame / fps);
  }
  document.querySelectorAll('video, audio').forEach((media) => {
    const el = media as HTMLMediaElement;
    el.pause();
    el.currentTime = frame / fps;
  });
};

export const renderHtml = async (
  options: RenderOptions,
): Promise<{
  receiptPath: string;
  outputMp4: string;
  deterministic: boolean;
  frameCount: number;
}> => {
  const root = options.root ?? process.cwd();
  const compositionAbs = resolve(root, options.compositionPath);
  const outputAbs = resolve(root, options.outputMp4);
  mkdirSync(dirname(outputAbs), {recursive: true});

  const browser = await chromium.launch({headless: true, channel: 'chrome'});
  const networkViolations: string[] = [];
  const browserVersion = browser.version();
  const ffVersion = ffmpegVersion();

  const page = await browser.newPage({
    viewport: {width: options.width, height: options.height},
    deviceScaleFactor: 1,
  });
  page.on('request', (request) => {
    const url = request.url();
    if (!url.startsWith('file:') && !url.startsWith('data:')) {
      networkViolations.push(url);
    }
  });

  await page.goto(`file://${compositionAbs}`, {waitUntil: 'load'});
  await page.evaluate(async () => {
    await document.fonts.ready;
  });

  const geometry = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    scrollHeight: document.documentElement.scrollHeight,
    clientWidth: document.documentElement.clientWidth,
    clientHeight: document.documentElement.clientHeight,
  }));
  if (
    geometry.scrollWidth !== options.width ||
    geometry.scrollHeight !== options.height ||
    geometry.clientWidth !== options.width ||
    geometry.clientHeight !== options.height
  ) {
    throw new Error(
      `COS-OVERFLOW: composition geometry ${JSON.stringify(geometry)} != ${options.width}x${options.height}`,
    );
  }

  const capture = async (frame: number): Promise<Buffer> => {
    await page.evaluate(scrub, {compositionId: options.compositionId, frame, fps: options.fps});
    return Buffer.from(
      await page.screenshot({
        animations: 'disabled',
        caret: 'hide',
        fullPage: false,
        type: 'png',
        clip: {x: 0, y: 0, width: options.width, height: options.height},
      }),
    );
  };

  const first = await capture(0);
  const second = await capture(0);
  if (sha256(first) !== sha256(second)) {
    throw new Error(
      'COS-NONDETERMINISTIC: frame 0 double-capture mismatch (timeline not seekable or autonomous animation)',
    );
  }

  const proc = spawn(
    'ffmpeg',
    [
      '-y',
      '-f',
      'image2pipe',
      '-vcodec',
      'png',
      '-i',
      '-',
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-r',
      String(options.fps),
      '-frames:v',
      String(options.durationInFrames),
      '-movflags',
      '+faststart',
      outputAbs,
    ],
    {stdio: ['pipe', 'ignore', 'ignore']},
  );

  const closed = new Promise<number>((resolveClose) => {
    proc.on('close', resolveClose);
  });

  proc.stdin.write(first);
  for (let frame = 1; frame < options.durationInFrames; frame += 1) {
    const png = await capture(frame);
    proc.stdin.write(png);
  }
  proc.stdin.end();
  const code = await closed;
  if (code !== 0) {
    throw new Error(`COS-FFMPEG-EXIT: ffmpeg exited ${code}`);
  }

  await page.close();
  await browser.close();

  if (networkViolations.length > 0) {
    throw new Error(`COS-NETWORK-FORBIDDEN: ${networkViolations.join(', ')}`);
  }

  const outputBytes = readFileSync(outputAbs);
  const files = [
    {
      path: portable(relative(root, outputAbs)),
      sha256: sha256(outputBytes),
      bytes: outputBytes.byteLength,
    },
  ];
  const aggregateSha256 = sha256(files.map((f) => `${f.path}:${f.sha256}`).join('\n'));
  const receipt = {
    schemaVersion: 'content-os-render-receipt-v1',
    receiptId: 'RCP-COS-CORE-001-RENDER-001',
    compositionId: options.compositionId,
    compositionRef: portable(relative(root, compositionAbs)),
    state: 'RENDERED_DRAFT',
    browser: {engine: 'Chromium', version: browserVersion},
    ffmpeg: {version: ffVersion},
    frameCount: options.durationInFrames,
    fps: options.fps,
    dimensions: {width: options.width, height: options.height},
    networkRequests: 0,
    randomness: false,
    wallClock: false,
    deterministic: true,
    files,
    aggregateSha256,
    guardianPassed: false,
    humanApproved: false,
    ready: false,
    publicationAuthorized: false,
    nextGate: 'HUMAN_REVIEW',
  };
  const receiptPath = `${outputAbs}.receipt.json`;
  writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');

  return {
    receiptPath,
    outputMp4: outputAbs,
    deterministic: true,
    frameCount: options.durationInFrames,
  };
};

const invokedPath = process.argv[1];
if (invokedPath !== undefined && import.meta.url === `file://${invokedPath}`) {
  const opts = parseArgs(process.argv.slice(2));
  renderHtml(opts)
    .then((result) => {
      const out = `PASS CONTENT-OS RENDER: ${result.frameCount} frames, deterministic, offline, RENDERED_DRAFT -> ${basename(result.outputMp4)}`;
      console.info(out);
    })
    .catch((error: unknown) => {
      console.error(String((error as Error)?.message ?? error));
      process.exit(1);
    });
}
