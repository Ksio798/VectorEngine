import type { RasterRenderer } from "../raster/RasterRenderer";
import { Shape, type Point2D } from "./Shape";
import type { Bounds, ShapeJSON, ShapeOptions } from "./types";

function sign(p1: Point2D, p2: Point2D, p3: Point2D): number {
  return (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
}

export class Triangle extends Shape {
  p0: Point2D;
  p1: Point2D;
  p2: Point2D;

  constructor(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    options: ShapeOptions = {}
  ) {
    const centerX = (x0 + x1 + x2) / 3;
    const centerY = (y0 + y1 + y2) / 3;

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
  }

  private getLocalPoints(): Point2D[] {
    return [this.p0, this.p1, this.p2];
  }

  private getDevicePoints(): Point2D[] {
    return this.getLocalPoints().map((p) =>
      this.transformPointToDevice(p.x, p.y)
    );
  }

  drawRaster(r: RasterRenderer) {
    const points = this.getDevicePoints();

    if (this.fillOpacity > 0) {
      r.fillPolygon(points, this.getFillRGBA());
    }

    if (this.strokeWidth > 0 && this.strokeOpacity > 0) {
      r.strokePolygon(points, this.getStrokeRGBA(), this.strokeWidth);
    }
  }

  hitTest(px: number, py: number): boolean {
    const p = this.transformPointToLocal(px, py);

    const d1 = sign(p, this.p0, this.p1);
    const d2 = sign(p, this.p1, this.p2);
    const d3 = sign(p, this.p2, this.p0);

    const hasNegative = d1 < 0 || d2 < 0 || d3 < 0;
    const hasPositive = d1 > 0 || d2 > 0 || d3 > 0;

    return !(hasNegative && hasPositive);
  }

  getBounds(): Bounds {
    return this.boundsFromPoints(this.getDevicePoints());
  }

  getLocalBounds(): Bounds {
    return this.boundsFromPoints(this.getLocalPoints());
  }

  getControlPoints(): Point2D[] {
    return this.getLocalPoints().map((p) => ({ ...p }));
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
  }

  clone(): Triangle {
    const points = this.getDevicePoints();

    const cloned = new Triangle(
      points[0].x,
      points[0].y,
      points[1].x,
      points[1].y,
      points[2].x,
      points[2].y
    );

    cloned.p0 = { ...this.p0 };
    cloned.p1 = { ...this.p1 };
    cloned.p2 = { ...this.p2 };

    return this.copyBaseTo(cloned);
  }

  toJSON(): ShapeJSON {
    return {
      id: this.id,
      kind: "triangle",
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
      },
    };
  }
}