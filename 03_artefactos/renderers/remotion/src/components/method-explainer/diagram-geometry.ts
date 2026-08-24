import {DiagramContractV2Schema} from 'workflows/video-os/_schema/method-explainer-execution-v1.schema.ts';
import {canonicalSha256} from 'workflows/video-os/_schema/method-explainer-planning-v1.schema.ts';
import type {z} from 'zod';

type DiagramContractV2 = z.infer<typeof DiagramContractV2Schema>;
type DiagramEdge = DiagramContractV2['edges'][number];

export interface LayoutPoint {
  readonly x: number;
  readonly y: number;
}

export interface LayoutRect {
  readonly bottom: number;
  readonly left: number;
  readonly right: number;
  readonly top: number;
}

export interface NormalizedBounds {
  readonly height: number;
  readonly width: number;
  readonly x: number;
  readonly y: number;
}

const finite = (values: readonly number[]): boolean => values.every(Number.isFinite);
const finitePoint = ({x, y}: LayoutPoint): boolean => finite([x, y]);
const assertGeometry = (...points: readonly LayoutPoint[]): void => {
  if (!points.every(finitePoint)) throw new Error('DIAGRAM_GEOMETRY_INVALID');
};

export const parseDiagramContract = (diagram: unknown): DiagramContractV2 => {
  const parsed = DiagramContractV2Schema.safeParse(diagram);
  if (!parsed.success) throw new Error('DIAGRAM_CONTRACT_INVALID');
  return parsed.data;
};

export const canonicalDiagramBinding = (diagram: unknown, diagramSha256: string): string => {
  const parsed = parseDiagramContract(diagram);
  if (!/^[a-f0-9]{64}$/u.test(diagramSha256)) throw new Error('DIAGRAM_SHA256_INVALID');
  if (canonicalSha256(diagram) !== diagramSha256) throw new Error('DIAGRAM_SHA256_MISMATCH');
  return `${diagramSha256}:${parsed.spec_sha256}:${parsed.beat_budget_sha256}`;
};

export const canonicalVisualEdgeKey = ({direction, source, target}: DiagramEdge): string => {
  const endpoints = direction === 'bidirectional' ? [source, target].sort() : [source, target];
  return `${direction}:${endpoints.join(':')}`;
};

export const normalizeDiagramText = (value: string): string =>
  value.normalize('NFC').replace(/\s+/gu, ' ').trim();

export const isFinitePositiveRect = (rect: LayoutRect): boolean =>
  finite([rect.bottom, rect.left, rect.right, rect.top]) &&
  rect.right > rect.left &&
  rect.bottom > rect.top;

export const isValidNormalizedBounds = (bounds: NormalizedBounds): boolean =>
  finite([bounds.x, bounds.y, bounds.width, bounds.height]) &&
  bounds.x >= 0 &&
  bounds.y >= 0 &&
  bounds.width > 0 &&
  bounds.height > 0 &&
  bounds.x + bounds.width <= 1 &&
  bounds.y + bounds.height <= 1;

export const normalizedBoundsToLayoutRect = ({
  bounds,
  compositionHeight,
  compositionWidth,
}: {
  readonly bounds: NormalizedBounds;
  readonly compositionHeight: number;
  readonly compositionWidth: number;
}): LayoutRect => {
  if (
    !isValidNormalizedBounds(bounds) ||
    !finite([compositionHeight, compositionWidth]) ||
    compositionHeight <= 0 ||
    compositionWidth <= 0
  )
    throw new Error('DIAGRAM_GEOMETRY_INVALID');
  return {
    bottom: (bounds.y + bounds.height) * compositionHeight,
    left: bounds.x * compositionWidth,
    right: (bounds.x + bounds.width) * compositionWidth,
    top: bounds.y * compositionHeight,
  };
};

export const isInsideLayoutRect = (inner: LayoutRect, outer: LayoutRect, epsilon = 0): boolean =>
  isFinitePositiveRect(inner) &&
  isFinitePositiveRect(outer) &&
  Number.isFinite(epsilon) &&
  epsilon >= 0 &&
  inner.left >= outer.left - epsilon &&
  inner.top >= outer.top - epsilon &&
  inner.right <= outer.right + epsilon &&
  inner.bottom <= outer.bottom + epsilon;

export const layoutRectsOverlap = (left: LayoutRect, right: LayoutRect): boolean =>
  isFinitePositiveRect(left) &&
  isFinitePositiveRect(right) &&
  left.left < right.right &&
  left.right > right.left &&
  left.top < right.bottom &&
  left.bottom > right.top;

export const layoutRectCenter = (rect: LayoutRect): LayoutPoint => ({
  x: (rect.left + rect.right) / 2,
  y: (rect.top + rect.bottom) / 2,
});

const turn = (a: LayoutPoint, b: LayoutPoint, c: LayoutPoint): number => {
  const abX = b.x - a.x;
  const abY = b.y - a.y;
  const acX = c.x - a.x;
  const acY = c.y - a.y;
  const cross = abX * acY - abY * acX;
  const scale = Math.max(1, Math.abs(abX), Math.abs(abY), Math.abs(acX), Math.abs(acY));
  return Math.abs(cross) <= Number.EPSILON * 64 * scale * scale ? 0 : cross;
};
export const segmentsOverlapBeyondSharedEndpoint = (
  shared: LayoutPoint,
  left: LayoutPoint,
  right: LayoutPoint,
): boolean => {
  assertGeometry(shared, left, right);
  return (
    turn(shared, left, right) === 0 &&
    (left.x - shared.x) * (right.x - shared.x) + (left.y - shared.y) * (right.y - shared.y) > 0
  );
};
const onSegment = (a: LayoutPoint, b: LayoutPoint, point: LayoutPoint): boolean =>
  turn(a, b, point) === 0 &&
  point.x >= Math.min(a.x, b.x) &&
  point.x <= Math.max(a.x, b.x) &&
  point.y >= Math.min(a.y, b.y) &&
  point.y <= Math.max(a.y, b.y);

export const segmentsIntersect = (
  a: LayoutPoint,
  b: LayoutPoint,
  c: LayoutPoint,
  d: LayoutPoint,
): boolean => {
  assertGeometry(a, b, c, d);
  const abC = turn(a, b, c);
  const abD = turn(a, b, d);
  const cdA = turn(c, d, a);
  const cdB = turn(c, d, b);
  return (
    (abC * abD < 0 && cdA * cdB < 0) ||
    onSegment(a, b, c) ||
    onSegment(a, b, d) ||
    onSegment(c, d, a) ||
    onSegment(c, d, b)
  );
};

export const segmentIntersectsRect = (start: LayoutPoint, end: LayoutPoint, rect: LayoutRect) => {
  assertGeometry(start, end);
  if (!isFinitePositiveRect(rect)) throw new Error('DIAGRAM_GEOMETRY_INVALID');
  const inside = ({x, y}: LayoutPoint) =>
    x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  if (inside(start) || inside(end)) return true;
  const corners = [
    {x: rect.left, y: rect.top},
    {x: rect.right, y: rect.top},
    {x: rect.right, y: rect.bottom},
    {x: rect.left, y: rect.bottom},
  ] as const;
  return corners.some((corner, index) => {
    const next = corners[(index + 1) % corners.length] ?? corners[0];
    return segmentsIntersect(start, end, corner, next);
  });
};

export const rectsApproximatelyEqual = (
  left: LayoutRect,
  right: LayoutRect,
  epsilon = 1,
): boolean =>
  isFinitePositiveRect(left) &&
  isFinitePositiveRect(right) &&
  [
    left.bottom - right.bottom,
    left.left - right.left,
    left.right - right.right,
    left.top - right.top,
  ].every((difference) => Math.abs(difference) <= epsilon);
