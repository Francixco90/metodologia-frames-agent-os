import {readFileSync} from 'node:fs';

const hidden =
  /(?:display\s*:\s*none|visibility\s*:\s*hidden|opacity\s*:\s*0(?:\D|$)|font-size\s*:\s*0(?:\D|$)|hidden(?:\s|=|>))/iu;
const remoteAsset =
  /(?:<(?:script|img|iframe|source)[^>]+src|<link[^>]+href)\s*=\s*["']https?:\/\//iu;
const executableAttribute = /\son\w+\s*=|(?:href|src)\s*=\s*["']javascript\s*:/iu;

const scriptIssues = (html) => {
  const issues = [];
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/giu)];
  const unmatched = html.replaceAll(/<script\b[^>]*>[\s\S]*?<\/script>/giu, '');
  if (/<script\b/iu.test(unmatched)) issues.push('HTML_SCRIPT_UNCLOSED');
  for (const [, attributes, payload] of scripts) {
    const inert = /\btype\s*=\s*["']application\/json["']/iu.test(attributes);
    const expectedId = /\bid\s*=\s*["']career-document-data["']/iu.test(attributes);
    if (!inert || !expectedId || /\bsrc\s*=/iu.test(attributes)) {
      issues.push('HTML_JAVASCRIPT');
      continue;
    }
    try {
      JSON.parse(payload.trim());
    } catch {
      issues.push('HTML_INERT_JSON_INVALID');
    }
  }
  return issues;
};

export const textContent = (html) =>
  html
    .replaceAll(/<style\b[^>]*>[\s\S]*?<\/style>/giu, ' ')
    .replaceAll(/<script\b[^>]*>[\s\S]*?<\/script>/giu, ' ')
    .replaceAll(/<[^>]+>/gu, ' ')
    .replaceAll(/\s+/gu, ' ')
    .trim();

export const parityFields = (html) =>
  Object.fromEntries(
    [...html.matchAll(/<[^>]+data-parity-key=["']([^"']+)["'][^>]*>([\s\S]*?)<\/[^>]+>/giu)].map(
      ([, key, value]) => [key, textContent(value)],
    ),
  );

export const verifyHtml = (path, pageBudget) => {
  const html = readFileSync(path, 'utf8');
  const issues = scriptIssues(html);
  const tags = [...html.matchAll(/<[^>]+>/gu)].map(([tag]) => tag).join('\n');
  if (executableAttribute.test(tags)) issues.push('HTML_JAVASCRIPT');
  if (remoteAsset.test(html) || /@import\s+url\s*\(\s*["']?https?:\/\//iu.test(html)) {
    issues.push('HTML_REMOTE_DEPENDENCY');
  }
  if (hidden.test(html)) issues.push('HTML_HIDDEN_CONTENT');
  for (const required of [
    /<html\s+lang=/iu,
    /<meta\s+name=["']viewport["']/iu,
    /<main\b/iu,
    /<h1\b/iu,
  ]) {
    if (!required.test(html)) issues.push('HTML_SEMANTICS');
  }
  const pages = [...html.matchAll(/data-print-page=["']([0-9]+)["']/giu)].map((match) =>
    Number(match[1]),
  );
  if (new Set(pages).size !== pages.length || Math.max(0, ...pages) > pageBudget) {
    issues.push('PAGE_BUDGET_EXCEEDED');
  }
  return {
    status: issues.length ? 'BLOCKED' : 'PASS',
    layout_status: issues.includes('PAGE_BUDGET_EXCEEDED') ? 'BLOCKED' : 'UNKNOWN',
    issues,
    structural_page_segments: pages.length,
    html,
  };
};
