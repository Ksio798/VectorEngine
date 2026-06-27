import type { RasterRenderer } from "../raster/RasterRenderer";
import { Shape, type Point2D } from "./Shape";
import {
  boundsFromPoints,
  cubicPoint,
  expandBounds,
  minDistanceToPolyline,
} from "./bezierUtils";
import type { Bounds, ShapeJSON, ShapeOptions } from "./types";

export class CubicBezier extends Shape {
  p0: Point2D;
  p1: Point2D;
  p2: Point2D;
  p3: Point2D;

  segments: number;

  constructor(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number,
    options: ShapeOptions & { segments?: number } = {}
  ) {
    const centerX = (x0 + x1 + x2 + x3) / 4;
    const centerY = (y0 + y1 + y2 + y3) / 4;

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

    this.p0 = { x: x0 - originX, y: y0 - originY };
    this.p1 = { x: x1 - originX, y: y1 - originY };
    this.p2 = { x: x2 - originX, y: y2 - originY };
    this.p3 = { x: x3 - originX, y: y3 - originY };

    this.segments = options.segments ?? 80;
  }

  evalLocal(t: number): Point2D {
    return cubicPoint(this.p0, this.p1, this.p2, this.p3, t);
  }

  flattenLocalPoints(segments = this.segments): Point2D[] {
    const points: Point2D[] = [];
    const count = Math.max(2, segments);

    for (let i = 0; i <= count; i++) {
      points.push(this.evalLocal(i / count));
    }

    return points;
  }

  flattenDevicePoints(segments = this.segments): Point2D[] {
    return this.flattenLocalPoints(segments).map((p) =>
      this.transformPointToDevice(p.x, p.y)
    );
  }

  getControlPoints(): Point2D[] {
    return [{ ...this.p0 }, { ...this.p1 }, { ...this.p2 }, { ...this.p3 }];
  }

  setControlPoint(index: number, point: Point2D) {
    if (index === 0) {
      this.p0 = { ...point };
    }

    if (index === 1) {
      this.p1 = { ...point };
    }

    if (index === 2) {
      this.p2 = { ...point };
    }

    if (index === 3) {
      this.p3 = { ...point };
    }
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

  clone(): CubicBezier {
    const devicePoints = this.getControlPoints().map((p) =>
      this.transformPointToDevice(p.x, p.y)
    );

    const cloned = new CubicBezier(
      devicePoints[0].x,
      devicePoints[0].y,
      devicePoints[1].x,
      devicePoints[1].y,
      devicePoints[2].x,
      devicePoints[2].y,
      devicePoints[3].x,
      devicePoints[3].y,
      {
        segments: this.segments,
      }
    );

    cloned.p0 = { ...this.p0 };
    cloned.p1 = { ...this.p1 };
    cloned.p2 = { ...this.p2 };
    cloned.p3 = { ...this.p3 };

    return this.copyBaseTo(cloned);
  }

  toJSON(): ShapeJSON {
    return {
      id: this.id,
      kind: "cubicBezier",
      transform: { ...this.transform },

      fillStyle: this.fillStyle,
      fillOpacity: this.fillOpacity,

      strokeStyle: this.strokeStyle,
      strokeWidth: this.strokeWidth,
      strokeOpacity: this.strokeOpacity,

      geometry: {
        p0: { ...this.p0 },
        p1: { ...this.p1 },
        p2: { ...this.p2 },
        p3: { ...this.p3 },
        segments: this.segments,
      },
    };
  }
}