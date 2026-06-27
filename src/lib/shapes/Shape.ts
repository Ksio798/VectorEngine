import { hexToRGBA } from "../raster/RasterRenderer";
import type { RasterRenderer, RGBA } from "../raster/RasterRenderer";
import { mat3 } from "../math/mat3";
import type { Bounds, ShapeJSON, ShapeOptions, Transform } from "./types";

export type Point2D = {
  x: number;
  y: number;
};

function createShapeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `shape-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

export abstract class Shape {
  id: string;

  transform: Transform;

  fillStyle: string;
  fillOpacity: number;

  strokeStyle: string;
  strokeWidth: number;
  strokeOpacity: number;

  constructor(options: ShapeOptions = {}) {
    const t = options.transform ?? {};

    this.id = options.id ?? createShapeId();

    this.transform = {
      x: t.x ?? 0,
      y: t.y ?? 0,
      rotation: t.rotation ?? 0,
      scaleX: t.scaleX ?? 1,
      scaleY: t.scaleY ?? 1,
    };

    this.fillStyle = options.fillStyle ?? "#3B82F6";
    this.fillOpacity = options.fillOpacity ?? 1;

    this.strokeStyle = options.strokeStyle ?? "#0F172A";
    this.strokeWidth = options.strokeWidth ?? 2;
    this.strokeOpacity = options.strokeOpacity ?? 1;
  }

  getLocalToDeviceMatrix() {
    return mat3.fromTransform(
      this.transform.x,
      this.transform.y,
      this.transform.rotation,
      this.transform.scaleX,
      this.transform.scaleY
    );
  }

  getDeviceToLocalMatrix() {
    const inverse = mat3.invert(this.getLocalToDeviceMatrix());

    if (!inverse) {
      return mat3.identity();
    }

    return inverse;
  }

  transformPointToDevice(px: number, py: number): Point2D {
    return mat3.transformPoint(this.getLocalToDeviceMatrix(), px, py);
  }

  transformPointToLocal(px: number, py: number): Point2D {
    return mat3.transformPoint(this.getDeviceToLocalMatrix(), px, py);
  }

  getCenter(): Point2D {
    const bounds = this.getBounds();

    return {
      x: (bounds.minX + bounds.maxX) / 2,
      y: (bounds.minY + bounds.maxY) / 2,
    };
  }

  resizeFromDeviceAABB(
    minX: number,
    minY: number,
    maxX: number,
    maxY: number
  ) {
    const localBounds = this.getLocalBounds();

    const localWidth = localBounds.maxX - localBounds.minX;
    const localHeight = localBounds.maxY - localBounds.minY;

    const deviceWidth = maxX - minX;
    const deviceHeight = maxY - minY;

    this.transform.x = (minX + maxX) / 2;
    this.transform.y = (minY + maxY) / 2;

    if (Math.abs(localWidth) > 0.000001) {
      this.transform.scaleX = deviceWidth / localWidth;
    }

    if (Math.abs(localHeight) > 0.000001) {
      this.transform.scaleY = deviceHeight / localHeight;
    }

    this.transform.rotation = 0;
  }

  setBounds(minX: number, minY: number, maxX: number, maxY: number) {
    this.resizeFromDeviceAABB(minX, minY, maxX, maxY);
  }

  protected getFillRGBA(): RGBA {
    return hexToRGBA(this.fillStyle, Math.round(clamp01(this.fillOpacity) * 255));
  }

  protected getStrokeRGBA(): RGBA {
    return hexToRGBA(
      this.strokeStyle,
      Math.round(clamp01(this.strokeOpacity) * 255)
    );
  }

  protected boundsFromPoints(points: Point2D[]): Bounds {
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

  protected copyBaseTo<T extends Shape>(target: T): T {
    target.transform = { ...this.transform };

    target.fillStyle = this.fillStyle;
    target.fillOpacity = this.fillOpacity;

    target.strokeStyle = this.strokeStyle;
    target.strokeWidth = this.strokeWidth;
    target.strokeOpacity = this.strokeOpacity;

    return target;
  }

  abstract clone(): Shape;

  abstract drawRaster(r: RasterRenderer): void;

  abstract hitTest(px: number, py: number): boolean;

  abstract getBounds(): Bounds;

  abstract getLocalBounds(): Bounds;

  abstract toJSON(): ShapeJSON;
}