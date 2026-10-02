export function measureAulaFrame110() {
  const errors = [];
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
  };
  if (document.documentElement.scrollWidth > innerWidth + 1) errors.push('horizontal-overflow');
  for (const svg of document.querySelectorAll('svg.scene')) {
    if (!visible(svg)) continue;
    const box = svg.getBoundingClientRect();
    const texts = [...svg.querySelectorAll('text')].filter(visible);
    for (const text of texts) {
      const r = text.getBoundingClientRect(),
        m = text.getScreenCTM();
      const size = parseFloat(getComputedStyle(text).fontSize) * Math.hypot(m.c, m.d);
      if (innerWidth <= 600 && size < 13.9) errors.push('mobile-small-label:' + text.textContent);
      if (
        r.left < box.left - 2 ||
        r.right > box.right + 2 ||
        r.top < box.top - 2 ||
        r.bottom > box.bottom + 2
      )
        errors.push('scene-text-outside:' + text.textContent);
    }
    // ponytail: pairwise check is bounded to a scene's small label set; spatial index if that contract grows.
    for (let i = 0; i < texts.length; i++)
      for (let j = i + 1; j < texts.length; j++) {
        const a = texts[i].getBoundingClientRect(),
          b = texts[j].getBoundingClientRect();
        if (
          Math.min(a.right, b.right) - Math.max(a.left, b.left) > 2 &&
          Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 2
        )
          errors.push('scene-label-overlap:' + texts[i].textContent + '/' + texts[j].textContent);
      }
  }
  for (const el of document.querySelectorAll('button,input,select,textarea,summary')) {
    if (!visible(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 24 || r.height < 24) errors.push('small-control:' + el.tagName);
  }
  const rgb = (color) =>
    color
      .match(/[\d.]+/g)
      ?.slice(0, 3)
      .map(Number);
  const luminance = (color) =>
    rgb(color)
      ?.map((n) => {
        const c = n / 255;
        return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      })
      .reduce((n, c, i) => n + c * [0.2126, 0.7152, 0.0722][i], 0);
  for (const el of document.querySelectorAll(
    'h1,h2,h3,p,li,dt,dd,figcaption,summary,button,label,svg text',
  )) {
    if (!visible(el) || el.disabled || !el.textContent.trim()) continue;
    let parent = el,
      background;
    while (parent) {
      const color = getComputedStyle(parent).backgroundColor;
      if (!color.endsWith(', 0)') && color !== 'transparent') {
        background = color;
        break;
      }
      parent = parent.parentElement;
    }
    const style = getComputedStyle(el),
      foreground = el.matches('svg text') ? style.fill : style.color;
    const a = luminance(foreground),
      b = luminance(background || 'rgb(255,255,255)');
    if (a === undefined || b === undefined) {
      errors.push('contrast-sensor-gap');
      continue;
    }
    const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
      large = parseFloat(style.fontSize) >= 24;
    if (ratio < (large ? 3 : 4.5))
      errors.push('text-contrast:' + ratio.toFixed(2) + ':' + el.textContent.slice(0, 60));
  }
  for (const icon of document.querySelectorAll('.asset-icon')) {
    if (!visible(icon)) continue;
    const style = getComputedStyle(icon),
      a = luminance(style.color),
      b = luminance(style.backgroundColor);
    if (a === undefined || b === undefined) errors.push('icon-contrast-sensor-gap');
    else if ((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) < 3) errors.push('icon-contrast');
  }
  for (const card of document.querySelectorAll('section.card')) {
    if (!visible(card)) continue;
    const box = card.getBoundingClientRect();
    for (const child of card.children) {
      if (!visible(child)) continue;
      const r = child.getBoundingClientRect();
      if (r.top < box.top - 2 || r.bottom > box.bottom + 2)
        errors.push('card-content-outside:' + child.tagName);
    }
  }
  const fonts = [...document.fonts].map((f) => ({family: f.family, status: f.status}));
  return {
    errors,
    fonts,
    visibleScenes: [...document.querySelectorAll('svg.scene')].filter(visible).length,
  };
}
