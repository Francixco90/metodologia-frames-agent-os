export type CaseLongformRoi = {x: number; y: number; width: number; height: number};

export const clipCaseLongformRoi = (
  outer: CaseLongformRoi,
  inner: CaseLongformRoi,
): CaseLongformRoi | null => {
  const x = Math.max(outer.x, inner.x);
  const y = Math.max(outer.y, inner.y);
  const right = Math.min(outer.x + outer.width, inner.x + inner.width);
  const bottom = Math.min(outer.y + outer.height, inner.y + inner.height);
  return x < right && y < bottom ? {x, y, width: right - x, height: bottom - y} : null;
};

export const caseLongformRoiUnionArea = (rectangles: CaseLongformRoi[]): number => {
  const xs = [...new Set(rectangles.flatMap((v) => [v.x, v.x + v.width]))].sort((a, b) => a - b);
  return xs.slice(0, -1).reduce((area, x, index) => {
    const right = xs[index + 1]!;
    const intervals = rectangles
      .filter((v) => v.x < right && v.x + v.width > x)
      .map((v) => [v.y, v.y + v.height] as const)
      .sort((a, b) => a[0] - b[0]);
    let covered = 0;
    let end = -1;
    for (const [start, next] of intervals) {
      covered += Math.max(0, next - Math.max(start, end));
      end = Math.max(end, next);
    }
    return area + (right - x) * covered;
  }, 0);
};
