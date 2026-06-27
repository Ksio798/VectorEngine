import type { RasterRenderer } from "../raster/RasterRenderer";
import { Shape, type Point2D } from "./Shape";
import {
  boundsFromPoints,
  catmullToBeziers,
  cubicPoint,
  expandBounds,
  minDistanceToPolyline,
  type CubicSegment,
} from "./bezierUtils";
import type {
  Bounds,
  PathBezierMode,
  ShapeJSON,
  ShapeOptions,
} from "./types";

export class PathBezier extends Shape {
  anchors: Point2D[];
  mode: PathBezierMode;
  closed: boolean;
  segments: number;

  constructor(
    points: Point2D[],
    mode: PathBezierMode = "polyline",
    closed = false,
    options: ShapeOptions & { segments?: number } = {}
  ) {
    const center =
      points.length > 0
        ? points.reduce(
            (acc, p) => {
              acc.x += p.x;
              acc.y += p.y;
              return acc;
            },
            { x: 0, y: 0 }
          )
        : { x: 0, y: 0 };

    const centerX = points.length > 0 ? center.x / points.length : 0;
    const centerY = points.length > 0 ? center.y / points.length : 0;

    const originX = options.transform?.x ?? centerX;
    const originY = options.transform?.y ?? centerY;

    super({
      ...options,
      transform: {
        ...options.transform,
        x: originX,
        y: originY,
      },
    });

    this.anchors = points.map((p) => ({
      x: p.x - originX,
      y: p.y - originY,
    }));

    this.mode = mode;
    this.closed = closed;
    this.segments = options.segments ?? 32;
  }

  getControlPoints(): Point2D[] {
    return this.anchors.map((p) => ({ ...p }));
  }

  setControlPoint(index: number, point: Point2D) {
    if (index < 0 || index >= this.anchors.length) {
      return;
    }

    this.anchors[index] = { ...point };
  }

  addPointLocal(point: Point2D, insertAtIndex?: number) {
    if (
      insertAtIndex === undefined ||
      insertAtIndex < 0 ||
      insertAtIndex > this.anchors.length
    ) {
      this.anchors.push({ ...point });
      return;
    }

    this.anchors.splice(insertAtIndex, 0, { ...point });
  }

  removePoint(index: number) {
    if (index < 0 || index >= this.anchors.length) {
      return;
    }

    this.anchors.splice(index, 1);
  }

  catmullToBeziers(): CubicSegment[] {
    return catmullToBeziers(this.anchors, this.closed);
  }

  private flattenBezierMode(): Point2D[] {
    const result: Point2D[] = [];

    if (this.anchors.length < 4) {
      return this.anchors.map((p) => ({ ...p }));
    }

    for (let i = 0; i + 3 < this.anchors.length; i += 3) {
      const p0 = this.anchors[i];
      const p1 = this.anchors[i + 1];
      const p2 = this.anchors[i + 2];
      const p3 = this.anchors[i + 3];

      for (let step = 0; step <= this.segments; step++) {
        if (result.length > 0 && step === 0) {
          continue;
        }

        result.push(cubicPoint(p0, p1, p2, p3, step / this.segments));
      }
    }

    if (this.closed && result.length > 1) {
      result.push({ ...result[0] });
    }

    return result;
  }

  private flattenCatmullMode(): Point2D[] {
    const result: Point2D[] = [];
    const segments = this.catmullToBeziers();

    for (const segment of segments) {
      const [p0, p1, p2, p3] = segment;

      for (let step = 0; step <= this.segments; step++) {
        if (result.length > 0 && step === 0) {
          continue;
        }

        result.push(cubicPoint(p0, p1, p2, p3, step / this.segments));
      }
    }

    if (this.closed && result.length > 1) {
      const first = result[0];
      const last = result[result.length - 1];

      if (first.x !== last.x || first.y !== last.y) {
        result.push({ ...first });
      }
    }

    return result;
  }

  flattenLocalPoints(): Point2D[] {
    if (this.mode === "bezier") {
      return this.flattenBezierMode();
    }

    if (this.mode === "catmull") {
      return this.flattenCatmullMode();
    }

    const points = this.anchors.map((p) => ({ ...p }));

    if (this.closed && points.length > 1) {
      points.push({ ...points[0] });
    }

    return points;
  }

  flattenDevicePoints(): Point2D[] {
    return this.flattenLocalPoints().map((p) =>
      this.transformPointToDevice(p.x, p.y)
    );
  }

  drawRaster(r: RasterRenderer) {
    const points = this.flattenDevicePoints();

    if (points.length < 2 || this.strokeWidth <= 0 || this.strokeOpacity <= 0) {
      return;
    }

    const color = this.getStrokeRGBA();

    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i];
      const b = points[i + 1];

      r.strokeLine(a.x, a.y, b.x, b.y, color, this.strokeWidth);
    }
  }

  hitTest(px: number, py: number): boolean {
    const points = this.flattenDevicePoints();

    const distance = minDistanceToPolyline(px, py, points);
    const tolerance = Math.max(6, this.strokeWidth / 2 + 4);

    return distance <= tolerance;
  }

  getBounds(): Bounds {
    const bounds = boundsFromPoints(this.flattenDevicePoints());

    return expandBounds(bounds, this.strokeWidth / 2);
  }

  getLocalBounds(): Bounds {
    return boundsFromPoints(this.flattenLocalPoints());
  }

  clone(): PathBezier {
    const devicePoints = this.anchors.map((p) =>
      this.transformPointToDevice(p.x, p.y)
    );

    const cloned = new PathBezier(devicePoints, this.mode, this.closed, {
      segments: this.segments,
    });

    cloned.anchors = this.anchors.map((p) => ({ ...p }));

    return this.copyBaseTo(cloned);
  }

  toJSON(): ShapeJSON {
    return {
      id: this.id,
      kind: "pathBezier",
      transform: { ...this.transform },

      fillStyle: this.fillStyle,
      fillOpacity: this.fillOpacity,

      strokeStyle: this.strokeStyle,
      strokeWidth: this.strokeWidth,
      strokeOpacity: this.strokeOpacity,

      geometry: {
        anchors: this.anchors.map((p) => ({ ...p })),
        mode: this.mode,
        closed: this.closed,
        segments: this.segments,
      },
    };
  }
}