import type { RasterRenderer } from "../raster/RasterRenderer";
import { Shape } from "./Shape";
import type { Bounds, ShapeJSON, ShapeOptions } from "./types";

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

export class Line extends Shape {
  x1: number;
  y1: number;
  x2: number;
  y2: number;

  constructor(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    options: ShapeOptions = {}
  ) {
    const centerX = (x1 + x2) / 2;
    const centerY = (y1 + y2) / 2;

    super({
      ...options,
      transform: {
        ...options.transform,
        x: options.transform?.x ?? centerX,
        y: options.transform?.y ?? centerY,
      },
    });

    this.x1 = x1 - centerX;
    this.y1 = y1 - centerY;
    this.x2 = x2 - centerX;
    this.y2 = y2 - centerY;
  }

  private getDeviceEndpoints() {
    return {
      a: this.transformPointToDevice(this.x1, this.y1),
      b: this.transformPointToDevice(this.x2, this.y2),
    };
  }

  drawRaster(r: RasterRenderer) {
    const { a, b } = this.getDeviceEndpoints();

    if (this.strokeWidth <= 0 || this.strokeOpacity <= 0) {
      return;
    }

    r.strokeLine(
      a.x,
      a.y,
      b.x,
      b.y,
      this.getStrokeRGBA(),
      this.strokeWidth
    );
  }

  hitTest(px: number, py: number): boolean {
    const local = this.transformPointToLocal(px, py);

    const ax = this.x1;
    const ay = this.y1;
    const bx = this.x2;
    const by = this.y2;

    const abx = bx - ax;
    const aby = by - ay;

    const apx = local.x - ax;
    const apy = local.y - ay;

    const abLengthSquared = abx * abx + aby * aby;

    if (abLengthSquared <= 0.000001) {
      const dx = local.x - ax;
      const dy = local.y - ay;

      return Math.sqrt(dx * dx + dy * dy) <= this.strokeWidth / 2 + 3;
    }

    const t = clamp01((apx * abx + apy * aby) / abLengthSquared);

    const nearestX = ax + abx * t;
    const nearestY = ay + aby * t;

    const dx = local.x - nearestX;
    const dy = local.y - nearestY;

    const distance = Math.sqrt(dx * dx + dy * dy);

    const averageScale =
      (Math.abs(this.transform.scaleX) + Math.abs(this.transform.scaleY)) / 2;

    const safeScale = Math.max(0.000001, averageScale);

    const tolerance = this.strokeWidth / 2 / safeScale + 3;

    return distance <= tolerance;
  }

  getBounds(): Bounds {
    const { a, b } = this.getDeviceEndpoints();

    const pad = Math.max(0, this.strokeWidth / 2);

    return {
      minX: Math.min(a.x, b.x) - pad,
      minY: Math.min(a.y, b.y) - pad,
      maxX: Math.max(a.x, b.x) + pad,
      maxY: Math.max(a.y, b.y) + pad,
    };
  }

  getLocalBounds(): Bounds {
    return {
      minX: Math.min(this.x1, this.x2),
      minY: Math.min(this.y1, this.y2),
      maxX: Math.max(this.x1, this.x2),
      maxY: Math.max(this.y1, this.y2),
    };
  }

  clone(): Line {
    const { a, b } = this.getDeviceEndpoints();

    const cloned = new Line(a.x, a.y, b.x, b.y);

    cloned.x1 = this.x1;
    cloned.y1 = this.y1;
    cloned.x2 = this.x2;
    cloned.y2 = this.y2;

    return this.copyBaseTo(cloned);
  }

  toJSON(): ShapeJSON {
    return {
      id: this.id,
      kind: "line",
      transform: { ...this.transform },

      fillStyle: this.fillStyle,
      fillOpacity: this.fillOpacity,

      strokeStyle: this.strokeStyle,
      strokeWidth: this.strokeWidth,
      strokeOpacity: this.strokeOpacity,

      geometry: {
        x1: this.x1,
        y1: this.y1,
        x2: this.x2,
        y2: this.y2,
      },
    };
  }
}