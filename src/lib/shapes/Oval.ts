import type { RasterRenderer } from "../raster/RasterRenderer";
import { Shape } from "./Shape";
import type { Bounds, ShapeJSON, ShapeOptions } from "./types";

export class Oval extends Shape {
  rx: number;
  ry: number;

  constructor(
    x: number,
    y: number,
    rx: number,
    ry: number,
    options: ShapeOptions = {}
  ) {
    super({
      ...options,
      transform: {
        ...options.transform,
        x: options.transform?.x ?? x,
        y: options.transform?.y ?? y,
      },
    });

    this.rx = Math.max(0, rx);
    this.ry = Math.max(0, ry);
  }

  private getLocalPoints(segments = 64) {
    const points: { x: number; y: number }[] = [];

    for (let i = 0; i < segments; i++) {
      const angle = (Math.PI * 2 * i) / segments;

      points.push({
        x: this.rx * Math.cos(angle),
        y: this.ry * Math.sin(angle),
      });
    }

    return points;
  }

  private getDevicePoints(segments = 64) {
    return this.getLocalPoints(segments).map((p) =>
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
    if (this.rx <= 0 || this.ry <= 0) {
      return false;
    }

    const local = this.transformPointToLocal(px, py);

    const nx = local.x / this.rx;
    const ny = local.y / this.ry;

    return nx * nx + ny * ny <= 1;
  }

  getBounds(): Bounds {
    return this.boundsFromPoints(this.getDevicePoints());
  }

  getLocalBounds(): Bounds {
    return {
      minX: -this.rx,
      minY: -this.ry,
      maxX: this.rx,
      maxY: this.ry,
    };
  }

  clone(): Oval {
    const cloned = new Oval(this.transform.x, this.transform.y, this.rx, this.ry);

    return this.copyBaseTo(cloned);
  }

  toJSON(): ShapeJSON {
    return {
      id: this.id,
      kind: "oval",
      transform: { ...this.transform },

      fillStyle: this.fillStyle,
      fillOpacity: this.fillOpacity,

      strokeStyle: this.strokeStyle,
      strokeWidth: this.strokeWidth,
      strokeOpacity: this.strokeOpacity,

      geometry: {
        rx: this.rx,
        ry: this.ry,
      },
    };
  }
}