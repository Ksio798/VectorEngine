import type { RasterRenderer } from "../raster/RasterRenderer";
import { Shape } from "./Shape";
import type { Bounds, ShapeJSON, ShapeOptions } from "./types";

export class Rect extends Shape {
  w: number;
  h: number;

  constructor(x: number, y: number, w: number, h: number, options: ShapeOptions = {}) {
    super({
      ...options,
      transform: {
        ...options.transform,
        x: options.transform?.x ?? x,
        y: options.transform?.y ?? y,
      },
    });

    this.w = Math.max(0, w);
    this.h = Math.max(0, h);
  }

  private getLocalCorners() {
    const halfW = this.w / 2;
    const halfH = this.h / 2;

    return [
      { x: -halfW, y: -halfH },
      { x: halfW, y: -halfH },
      { x: halfW, y: halfH },
      { x: -halfW, y: halfH },
    ];
  }

  private getDeviceCorners() {
    return this.getLocalCorners().map((p) =>
      this.transformPointToDevice(p.x, p.y)
    );
  }

  drawRaster(r: RasterRenderer) {
    const points = this.getDeviceCorners();

    if (this.fillOpacity > 0) {
      r.fillPolygon(points, this.getFillRGBA());
    }

    if (this.strokeWidth > 0 && this.strokeOpacity > 0) {
      r.strokePolygon(points, this.getStrokeRGBA(), this.strokeWidth);
    }
  }

  hitTest(px: number, py: number): boolean {
    const local = this.transformPointToLocal(px, py);

    return (
      local.x >= -this.w / 2 &&
      local.x <= this.w / 2 &&
      local.y >= -this.h / 2 &&
      local.y <= this.h / 2
    );
  }

  getBounds(): Bounds {
    return this.boundsFromPoints(this.getDeviceCorners());
  }

  getLocalBounds(): Bounds {
    return {
      minX: -this.w / 2,
      minY: -this.h / 2,
      maxX: this.w / 2,
      maxY: this.h / 2,
    };
  }

  clone(): Rect {
    const cloned = new Rect(this.transform.x, this.transform.y, this.w, this.h);

    return this.copyBaseTo(cloned);
  }

  toJSON(): ShapeJSON {
    return {
      id: this.id,
      kind: "rect",
      transform: { ...this.transform },

      fillStyle: this.fillStyle,
      fillOpacity: this.fillOpacity,

      strokeStyle: this.strokeStyle,
      strokeWidth: this.strokeWidth,
      strokeOpacity: this.strokeOpacity,

      geometry: {
        w: this.w,
        h: this.h,
      },
    };
  }
}