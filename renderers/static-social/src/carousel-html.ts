import type {
  CarouselCardV1,
  CarouselSpecV1,
} from '../../../workflows/content/types/carousel/schema.ts';

const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const renderWordmark = () =>
  '<span class="brand-wordmark" aria-label="MetodologIA">Metodolog<span>IA</span></span>';

const renderCardBody = (card: CarouselCardV1): string => {
  const eyebrow =
    card.eyebrow === undefined ? '' : `<p class="card__eyebrow">${escapeHtml(card.eyebrow)}</p>`;
  const bullets =
    card.bullets.length === 0
      ? ''
      : `<ol class="card__bullets">${card.bullets
          .map((bullet) => `<li>${escapeHtml(bullet)}</li>`)
          .join('')}</ol>`;
  const pillar =
    card.pillar === undefined ? '' : `<span class="card__pillar">${escapeHtml(card.pillar)}</span>`;

  return `
    <article
      class="carousel-card carousel-card--${escapeHtml(card.role)}"
      id="${escapeHtml(card.cardId)}"
      aria-label="${escapeHtml(card.altText)}"
    >
      <header class="card__header">
        ${renderWordmark()}
        <span class="card__position">${String(card.position).padStart(2, '0')}</span>
      </header>
      <div class="card__signal" aria-hidden="true">
        <span></span><span></span><span></span>
      </div>
      <main class="card__content">
        ${eyebrow}
        <h1>${escapeHtml(card.title)}</h1>
        <p class="card__body">${escapeHtml(card.body)}</p>
        ${bullets}
      </main>
      <footer class="card__footer">
        ${pillar}
        <span class="card__evidence">${escapeHtml(card.evidence.shortLabel)}</span>
        <span>${String(card.position)} / 8</span>
      </footer>
    </article>`;
};

const baseStyles = `
  * { box-sizing: border-box; }
  html, body { margin: 0; min-height: 100%; background: var(--brand-darker); }
  body { color: var(--brand-text); font-family: var(--font-body); }
  .carousel-card {
    position: relative; display: grid; grid-template-rows: auto 1fr auto;
    width: 1080px; height: 1350px; overflow: hidden;
    padding: 84px 88px 72px; background: var(--brand-surface);
    border: 1px solid var(--brand-border); isolation: isolate;
  }
  .carousel-card::before {
    content: ""; position: absolute; inset: 0 0 auto; height: 18px;
    background: var(--brand-gold); z-index: -1;
  }
  .carousel-card::after {
    content: ""; position: absolute; width: 520px; height: 520px;
    right: -275px; bottom: -300px; border: 78px solid var(--brand-gold-soft);
    border-radius: 50%; opacity: .28; z-index: -1;
  }
  .card__header, .card__footer { display: flex; align-items: center; justify-content: space-between; }
  .brand-wordmark { color: var(--brand-text); font-family: var(--font-head); font-size: 34px; font-weight: 800; }
  .brand-wordmark span { color: var(--brand-gold-text); }
  .card__position {
    display: grid; place-items: center; width: 64px; height: 64px;
    color: var(--brand-text); border: 2px solid var(--brand-gold);
    border-radius: 50%; font-family: var(--font-head); font-size: 23px; font-weight: 700;
  }
  .card__signal {
    position: absolute; top: 260px; right: 88px; display: flex; gap: 13px;
    align-items: end; height: 112px;
  }
  .card__signal span { display: block; width: 13px; background: var(--brand-gold); border-radius: 8px; }
  .card__signal span:nth-child(1) { height: 38px; }
  .card__signal span:nth-child(2) { height: 72px; }
  .card__signal span:nth-child(3) { height: 112px; }
  .card__content { align-self: center; max-width: 850px; padding: 72px 0 38px; }
  .card__eyebrow {
    margin: 0 0 26px; color: var(--brand-gold-text); font-family: var(--font-head);
    font-size: 25px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase;
  }
  h1 {
    max-width: 850px; margin: 0; color: var(--brand-text); font-family: var(--font-head);
    font-size: 84px; font-weight: 800; letter-spacing: -.045em; line-height: 1.01;
  }
  .card__body {
    max-width: 790px; margin: 45px 0 0; color: var(--brand-text-soft);
    font-size: 38px; font-weight: 500; line-height: 1.35;
  }
  .card__bullets { margin: 42px 0 0; padding-left: 48px; color: var(--brand-text-soft); font-size: 31px; line-height: 1.45; }
  .card__bullets li { padding: 7px 0 7px 12px; }
  .card__bullets li::marker { color: var(--brand-gold-text); font-family: var(--font-head); font-weight: 800; }
  .card__footer { color: var(--brand-muted); font-size: 28px; font-weight: 600; letter-spacing: .03em; text-transform: uppercase; }
  .card__footer > * + * { margin-left: 24px; }
  .card__pillar {
    margin-right: auto; padding: 9px 16px; color: var(--brand-text);
    background: var(--brand-gold); border-radius: 999px; font-family: var(--font-head); font-weight: 800;
  }
  .carousel-card--conclusion, .carousel-card--cta {
    --brand-surface: var(--brand-navy); --brand-text: var(--brand-white);
    --brand-text-soft: var(--brand-white-soft); --brand-muted: var(--brand-white-muted);
    --brand-gold-text: var(--brand-gold);
  }
  .carousel-card--conclusion h1, .carousel-card--cta h1 { max-width: 800px; font-size: 94px; }
  .carousel-card--evidence .card__signal span { width: 22px; }
  @media (prefers-reduced-motion: reduce) { *, *::before, *::after { scroll-behavior: auto !important; } }
`;

const galleryStyles = `
  body { padding: 48px; }
  .review-header { max-width: 1180px; margin: 0 auto 38px; }
  .review-header h1 { font-size: 42px; }
  .review-header p { color: var(--brand-text-soft); font-size: 18px; }
  .gallery { display: grid; grid-template-columns: repeat(2, minmax(280px, 540px)); gap: 28px; justify-content: center; }
  .gallery__item { background: var(--brand-surface-alt); border: 1px solid var(--brand-border); padding: 12px; border-radius: var(--brand-radius); }
  .gallery__item .carousel-card { width: 100%; height: auto; aspect-ratio: 4 / 5; padding: 7.8% 8.1% 6.7%; }
  .gallery__item .brand-wordmark { font-size: clamp(11px, 2.8vw, 17px); }
  .gallery__item .card__position { width: clamp(24px, 5.5vw, 34px); height: clamp(24px, 5.5vw, 34px); font-size: clamp(9px, 2vw, 13px); }
  .gallery__item .card__signal { top: 19%; right: 8%; height: 8%; gap: 5px; }
  .gallery__item .card__signal span { width: 5px; }
  .gallery__item .card__signal span:nth-child(1) { height: 34%; }
  .gallery__item .card__signal span:nth-child(2) { height: 64%; }
  .gallery__item .card__signal span:nth-child(3) { height: 100%; }
  .gallery__item .card__content { max-width: 82%; padding: 7% 0 3%; }
  .gallery__item .card__eyebrow { margin-bottom: 3%; font-size: clamp(8px, 2vw, 13px); }
  .gallery__item h1 { font-size: clamp(28px, 6.4vw, 46px); }
  .gallery__item .card__body { margin-top: 5%; font-size: clamp(13px, 3.2vw, 21px); }
  .gallery__item .card__bullets { margin-top: 4%; padding-left: 7%; font-size: clamp(11px, 2.6vw, 17px); }
  .gallery__item .card__footer { font-size: clamp(7px, 1.5vw, 10px); }
  .gallery__item .card__pillar { padding: 4px 7px; }
  @media (max-width: 760px) { body { padding: 20px; } .gallery { grid-template-columns: 1fr; } }
`;

const renderedGalleryStyles = `
  * { box-sizing: border-box; }
  html, body { margin: 0; min-height: 100%; background: var(--brand-navy); }
  body { padding: 48px; color: var(--brand-white); font-family: var(--font-body); }
  .review-header { max-width: 1180px; margin: 0 auto 38px; }
  .review-header h1 {
    margin: 0; color: var(--brand-white); font-family: var(--font-head);
    font-size: 42px; line-height: 1.1;
  }
  .review-header p { margin: 14px 0 0; color: var(--brand-white-soft); font-size: 18px; }
  .gallery {
    display: grid; grid-template-columns: repeat(2, minmax(280px, 540px));
    gap: 28px; justify-content: center;
  }
  .gallery__item {
    margin: 0; padding: 12px; background: var(--brand-navy);
    border: 1px solid var(--brand-white-muted); border-radius: var(--brand-radius);
  }
  .gallery__item img { display: block; width: 100%; height: auto; aspect-ratio: 4 / 5; }
  .gallery__item figcaption {
    padding: 10px 2px 0; color: var(--brand-white-soft);
    font-size: 13px; line-height: 1.35;
  }
  @media (max-width: 760px) {
    body { padding: 20px; }
    .gallery { grid-template-columns: 1fr; }
  }
`;

type DocumentOptions = {
  readonly spec: CarouselSpecV1;
  readonly tokensCss: string;
  readonly fontCss: string;
  readonly card?: CarouselCardV1;
  readonly contactSheet?: boolean;
};

export const buildCarouselDocument = ({
  spec,
  tokensCss,
  fontCss,
  card,
  contactSheet = false,
}: DocumentOptions): string => {
  const isSingle = card !== undefined;
  const visibleCards = isSingle ? [card] : spec.cards;
  const content = isSingle
    ? renderCardBody(visibleCards[0] as CarouselCardV1)
    : `<header class="review-header">
        <h1>${escapeHtml(spec.carouselId)} · revisión offline</h1>
        <p>Estado: RENDERED_DRAFT · publicación bloqueada · ${visibleCards.length} tarjetas</p>
      </header>
      <main class="gallery">${visibleCards
        .map((item) => `<div class="gallery__item">${renderCardBody(item)}</div>`)
        .join('')}</main>`;
  const contactCss = contactSheet
    ? '.review-header{display:none}.gallery{grid-template-columns:repeat(4,270px);gap:16px}.gallery__item{padding:6px}.gallery__item .carousel-card{width:258px}body{padding:22px}'
    : '';

  return `<!doctype html>
<html lang="es" data-theme="light">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(spec.carouselId)} · carrusel MetodologIA</title>
  <style>${tokensCss}\n${fontCss}\n${baseStyles}\n${isSingle ? 'body{width:1080px;height:1350px;overflow:hidden}' : galleryStyles}\n${contactCss}</style>
</head>
<body>${content}</body>
</html>`;
};

type RenderedReviewDocumentOptions = {
  readonly spec: CarouselSpecV1;
  readonly tokensCss: string;
  readonly fontCss: string;
  readonly contactSheet?: boolean;
};

export const buildRenderedCarouselReviewDocument = ({
  spec,
  tokensCss,
  fontCss,
  contactSheet = false,
}: RenderedReviewDocumentOptions): string => {
  const cards = [...spec.cards].sort((left, right) => left.position - right.position);
  const content = cards
    .map((card) => {
      const label = String(card.position).padStart(2, '0');
      return `<figure class="gallery__item">
        <img src="slide-${label}.png" alt="${escapeHtml(card.altText)}" width="1080" height="1350">
        <figcaption>Tarjeta ${card.position}: ${escapeHtml(card.title)}</figcaption>
      </figure>`;
    })
    .join('');
  const contactCss = contactSheet
    ? `
      body { padding: 20px; background: var(--brand-canvas-deep); }
      .review-header, .gallery__item figcaption { display: none; }
      .gallery { grid-template-columns: repeat(4, 262px); gap: 16px; }
      .gallery__item { width: 262px; padding: 0; border: 0; border-radius: 0; }
    `
    : '';

  return `<!doctype html>
<html lang="es" data-theme="light">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(spec.carouselId)} · revisión de PNG</title>
  <style>${tokensCss}\n${fontCss}\n${renderedGalleryStyles}\n${contactCss}</style>
</head>
<body>
  <header class="review-header">
    <h1>${escapeHtml(spec.carouselId)} · revisión offline</h1>
    <p>Estado: RENDERED_DRAFT · publicación bloqueada · ${cards.length} PNG verificados</p>
  </header>
  <main class="gallery">${content}</main>
</body>
</html>`;
};
