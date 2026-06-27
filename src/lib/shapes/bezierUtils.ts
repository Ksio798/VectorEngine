import type { Bounds } from "./types";

export type BezierPoint = {
  x: number;
  y: number;
};

export type CubicSegment = [
  BezierPoint,
  BezierPoint,
  BezierPoint,
  BezierPoint
];

export function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

export function boundsFromPoints(points: BezierPoint[]): Bounds {
  if (points.length === 0) {
    return {
      minX: 0,
      minY: 0,
      maxX: 0,
      maxY: 0,
    };
  }

  let minX = points[0].x;
  let minY = points[0].y;
  let maxX = points[0].x;
  let maxY = points[0].y;

  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
  };
}

export function expandBounds(bounds: Bounds, pad: number): Bounds {
  return {
    minX: bounds.minX - pad,
    minY: bounds.minY - pad,
    maxX: bounds.maxX + pad,
    maxY: bounds.maxY + pad,
  };
}

export function distancePointToSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
): number {
  const abx = bx - ax;
  const aby = by - ay;

  const apx = px - ax;
  const apy = py - ay;

  const abLengthSquared = abx * abx + aby * aby;

  if (abLengthSquared <= 0.000001) {
    const dx = px - ax;
    const dy = py - ay;

    return Math.sqrt(dx * dx + dy * dy);
  }

  const t = clamp01((apx * abx + apy * aby) / abLengthSquared);

  const nearestX = ax + abx * t;
  const nearestY = ay + aby * t;

  const dx = px - nearestX;
  const dy = py - nearestY;

  return Math.sqrt(dx * dx + dy * dy);
}

export function minDistanceToPolyline(
  px: number,
  py: number,
  points: BezierPoint[]
): number {
  if (points.length < 2) {
    return Number.POSITIVE_INFINITY;
  }

  let minDistance = Number.POSITIVE_INFINITY;

  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];

    const distance = distancePointToSegment(px, py, a.x, a.y, b.x, b.y);

    minDistance = Math.min(minDistance, distance);
  }

  return minDistance;
}

export function quadraticPoint(
  p0: BezierPoint,
  p1: BezierPoint,
  p2: BezierPoint,
  t: number
): BezierPoint {
  const mt = 1 - t;

  return {
    x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
    y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
  };
}

export function cubicPoint(
  p0: BezierPoint,
  p1: BezierPoint,
  p2: BezierPoint,
  p3: BezierPoint,
  t: number
): BezierPoint {
  const mt = 1 - t;

  return {
    x:
      mt * mt * mt * p0.x +
      3 * mt * mt * t * p1.x +
      3 * mt * t * t * p2.x +
      t * t * t * p3.x,
    y:
      mt * mt * mt * p0.y +
      3 * mt * mt * t * p1.y +
      3 * mt * t * t * p2.y +
      t * t * t * p3.y,
  };
}

export function catmullToBeziers(
  points: BezierPoint[],
  closed = false
): CubicSegment[] {
  const segments: CubicSegment[] = [];

  if (points.length < 2) {
    return segments;
  }

  if (closed) {
    const n = points.length;

    for (let i = 0; i < n; i++) {
      const p0 = points[(i - 1 + n) % n];
      const p1 = points[i];
      const p2 = points[(i + 1) % n];
      const p3 = points[(i + 2) % n];

      const c1 = {
        x: p1.x + (p2.x - p0.x) / 6,
        y: p1.y + (p2.y - p0.y) / 6,
      };

      const c2 = {
        x: p2.x - (p3.x - p1.x) / 6,
        y: p2.y - (p3.y - p1.y) / 6,
      };

      segments.push([p1, c1, c2, p2]);
    }

    return segments;
  }

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = i === 0 ? points[i] : points[i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = i + 2 >= points.length ? p2 : points[i + 2];

    const c1 = {
      x: p1.x + (p2.x - p0.x) / 6,
      y: p1.y + (p2.y - p0.y) / 6,
    };

    const c2 = {
      x: p2.x - (p3.x - p1.x) / 6,
      y: p2.y - (p3.y - p1.y) / 6,
    };

    segments.push([p1, c1, c2, p2]);
  }

  return segments;
}