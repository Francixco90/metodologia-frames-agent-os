import type {PageModel} from './model.ts';

const escapeHtml = (value: string): string =>
  value.replace(
    /[&<>"']/gu,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
      })[character] ?? character,
  );

const renderClaim = (claim: PageModel['claims'][number]): string => `
  <li class="claim claim--${claim.status}">
    <span class="claim__id">${escapeHtml(claim.claimId)}</span>
    <span>${escapeHtml(claim.statement)}</span>
    <span class="claim__source">${escapeHtml(claim.sourceId)} · ${escapeHtml(claim.status)}</span>
  </li>`;

const renderSection = (section: PageModel['sections'][number], index: number): string => `
  <article class="chapter" id="${escapeHtml(section.id)}">
    <div class="chapter__number" aria-hidden="true">${String(index + 1).padStart(2, '0')}</div>
    <div class="chapter__content">
      <p class="eyebrow">${escapeHtml(section.eyebrow)}</p>
      <h2>${escapeHtml(section.title)}</h2>
      <p class="chapter__lead">${escapeHtml(section.body)}</p>
      <ul class="chapter__list">
        ${section.items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
      </ul>
      <p class="chapter__claims">Claims: ${section.claimIds.map(escapeHtml).join(' · ')}</p>
    </div>
  </article>`;

export const renderPage = (model: PageModel, css: string): string => `<!doctype html>
<html lang="${model.language}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${escapeHtml(model.description)}">
  <meta name="robots" content="noindex,nofollow">
  <meta name="color-scheme" content="dark">
  <title>${escapeHtml(model.title)}</title>
  <style>${css}</style>
</head>
<body>
  <a class="skip-link" href="#contenido">Saltar al contenido</a>
  <header class="masthead">
    <a class="brand" href="#inicio" aria-label="MetodologIA, volver al inicio">
      <span class="brand__mark" aria-hidden="true">M</span>
      <span>MetodologIA</span>
    </a>
    <span class="status">${escapeHtml(model.status.replace('_', ' '))}</span>
  </header>
  <main id="contenido">
    <section class="hero" id="inicio" aria-labelledby="hero-title">
      <div class="hero__signal" aria-hidden="true">
        <span></span><span></span><span></span><span></span><span></span>
      </div>
      <p class="eyebrow">${escapeHtml(model.eyebrow)}</p>
      <h1 id="hero-title">${escapeHtml(model.thesis)}</h1>
      <p class="hero__summary">${escapeHtml(model.summary)}</p>
      <div class="hero__meta" aria-label="Metadatos del demostrador">
        <span>${escapeHtml(model.pageId)}</span>
        <span>${escapeHtml(model.sourceSnapshotId)}</span>
        <span>${escapeHtml(model.deterministicTimestamp.slice(0, 10))}</span>
      </div>
    </section>
    <section class="principle" aria-label="Principio operativo">
      <p>Fuente</p><span aria-hidden="true">→</span>
      <p>Decisión</p><span aria-hidden="true">→</span>
      <p>Producto</p><span aria-hidden="true">→</span>
      <p>Evidencia</p>
    </section>
    <section class="chapters" aria-label="Cómo opera el sistema">
${model.sections.map(renderSection).join('')}
    </section>
    <section class="evidence" aria-labelledby="evidence-title">
      <p class="eyebrow">Trazabilidad visible</p>
      <h2 id="evidence-title">Lo que afirmamos, y con qué respaldo</h2>
      <ul class="claims">${model.claims.map(renderClaim).join('')}</ul>
    </section>
    <section class="boundary" aria-labelledby="boundary-title">
      <div>
        <p class="eyebrow">Límite deliberado</p>
        <h2 id="boundary-title">Este artefacto demuestra el flujo; no simula una aprobación.</h2>
      </div>
      <p>Sin source lock canónico, Guardian y decisión humana, el estado permanece en borrador renderizado.</p>
    </section>
  </main>
  <footer>
    <span>MetodologIA Creative Agent OS</span>
    <span>Demostrador local · sin publicación</span>
  </footer>
</body>
</html>`;
