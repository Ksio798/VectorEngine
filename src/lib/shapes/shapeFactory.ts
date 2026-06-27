import {
  CubicBezier,
  Line,
  Oval,
  PathBezier,
  QuadraticBezier,
  Rect,
  Triangle,
} from "./index";
import type { Shape, Point2D } from "./Shape";
import type { ShapeJSON, Transform } from "./types";

type SavedPoint = {
  x: number;
  y: number;
};

function isPoint(value: unknown): value is SavedPoint {
  return (
    typeof value === "object" &&
    value !== null &&
    "x" in value &&
    "y" in value &&
    typeof (value as SavedPoint).x === "number" &&
    typeof (value as SavedPoint).y === "number"
  );
}

function isPointArray(value: unknown): value is SavedPoint[] {
  return Array.isArray(value) && value.every(isPoint);
}

function applyBase(shape: Shape, data: ShapeJSON): Shape {
  shape.id = data.id;

  shape.transform = { ...data.transform };

  shape.fillStyle = data.fillStyle;
  shape.fillOpacity = data.fillOpacity;

  shape.strokeStyle = data.strokeStyle;
  shape.strokeWidth = data.strokeWidth;
  shape.strokeOpacity = data.strokeOpacity;

  return shape;
}

function getTransform(data: ShapeJSON): Transform {
  return data.transform ?? {
    x: 0,
    y: 0,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
  };
}

export function shapeFromJSON(data: ShapeJSON): Shape | null {
  const g = data.geometry;
  const t = getTransform(data);

  if (data.kind === "rect") {
    const w = Number(g.w ?? 100);
    const h = Number(g.h ?? 100);

    return applyBase(new Rect(t.x, t.y, w, h), data);
  }

  if (data.kind === "oval") {
    const rx = Number(g.rx ?? 50);
    const ry = Number(g.ry ?? 30);

    return applyBase(new Oval(t.x, t.y, rx, ry), data);
  }

  if (data.kind === "line") {
    const shape = new Line(0, 0, 100, 0);

    if (
      typeof g.x1 === "number" &&
      typeof g.y1 === "number" &&
      typeof g.x2 === "number" &&
      typeof g.y2 === "number"
    ) {
      shape.x1 = g.x1;
      shape.y1 = g.y1;
      shape.x2 = g.x2;
      shape.y2 = g.y2;
    }

    return applyBase(shape, data);
  }

  if (data.kind === "triangle") {
    const shape = new Triangle(0, 0, 100, 0, 50, 100);

    if (isPoint(g.p0) && isPoint(g.p1) && isPoint(g.p2)) {
      shape.p0 = { ...g.p0 };
      shape.p1 = { ...g.p1 };
      shape.p2 = { ...g.p2 };
    }

    return applyBase(shape, data);
  }

  if (data.kind === "quadraticBezier") {
    const shape = new QuadraticBezier(0, 0, 50, 100, 100, 0, {
      segments: Number(g.segments ?? 64),
    });

    if (isPoint(g.p0) && isPoint(g.p1) && isPoint(g.p2)) {
      shape.p0 = { ...g.p0 };
      shape.p1 = { ...g.p1 };
      shape.p2 = { ...g.p2 };
    }

    return applyBase(shape, data);
  }

  if (data.kind === "cubicBezier") {
    const shape = new CubicBezier(0, 0, 30, 100, 70, -100, 100, 0, {
      segments: Number(g.segments ?? 80),
    });

    if (isPoint(g.p0) && isPoint(g.p1) && isPoint(g.p2) && isPoint(g.p3)) {
      shape.p0 = { ...g.p0 };
      shape.p1 = { ...g.p1 };
      shape.p2 = { ...g.p2 };
      shape.p3 = { ...g.p3 };
    }

    return applyBase(shape, data);
  }

  if (data.kind === "pathBezier") {
    const anchors = isPointArray(g.anchors) ? g.anchors : [];

    const mode =
      g.mode === "polyline" || g.mode === "bezier" || g.mode === "catmull"
        ? g.mode
        : "polyline";

    const shape = new PathBezier(
      anchors.map((p): Point2D => ({ x: p.x, y: p.y })),
      mode,
      Boolean(g.closed),
      {
        segments: Number(g.segments ?? 32),
      }
    );

    shape.anchors = anchors.map((p) => ({ x: p.x, y: p.y }));
    shape.mode = mode;
    shape.closed = Boolean(g.closed);
    shape.segments = Number(g.segments ?? 32);

    return applyBase(shape, data);
  }

  return null;
}