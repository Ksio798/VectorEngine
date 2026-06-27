// src/lib/raster/RasterRenderer.ts

export type RGBA = {
  r: number;
  g: number;
  b: number;
  a: number;
};

export type LineAlg = "bresenham" | "wu";

export type Point2D = {
  x: number;
  y: number;
};

export function clampByte(v: number): number {
  if (Number.isNaN(v)) {
    return 0;
  }

  return Math.max(0, Math.min(255, Math.round(v)));
}

export function hexToRGBA(hex: string, alpha = 255): RGBA {
  let value = hex.trim();

  if (value.startsWith("#")) {
    value = value.slice(1);
  }

  if (value.length === 3) {
    value = value
      .split("")
      .map((char) => char + char)
      .join("");
  }

  if (value.length === 4) {
    value = value
      .split("")
      .map((char) => char + char)
      .join("");
  }

  if (value.length !== 6 && value.length !== 8) {
    throw new Error(`Invalid HEX color: ${hex}`);
  }

  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);

  const parsedAlpha =
    value.length === 8 ? parseInt(value.slice(6, 8), 16) : alpha;

  return {
    r: clampByte(r),
    g: clampByte(g),
    b: clampByte(b),
    a: clampByte(parsedAlpha),
  };
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function ipart(x: number): number {
  return Math.floor(x);
}

function roundNearest(x: number): number {
  return Math.floor(x + 0.5);
}

function fpart(x: number): number {
  return x - Math.floor(x);
}

function rfpart(x: number): number {
  return 1 - fpart(x);
}

export class RasterRenderer {
  private ctx: CanvasRenderingContext2D;
  private imageData: ImageData | null = null;
  private buf!: Uint8ClampedArray;

  width = 0;
  height = 0;
  dpr = 1;

  private canvas: HTMLCanvasElement;
  private _onWindowResize: () => void;
  private lineAlg: LineAlg = "bresenham";

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("No 2D context");
    }

    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;

    this._onWindowResize = () => this.resize();
    window.addEventListener("resize", this._onWindowResize);

    this.resize();
  }

  dispose() {
    window.removeEventListener("resize", this._onWindowResize);
  }

  setLineAlgorithm(a: LineAlg) {
    this.lineAlg = a;
  }

  getLineAlgorithm(): LineAlg {
    return this.lineAlg;
  }

  drawLine(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    color: RGBA
  ) {
    if (this.lineAlg === "wu") {
      this.drawLineWu(x0, y0, x1, y1, color);
    } else {
      this.drawLineBrassenham(x0, y0, x1, y1, color);
    }
  }

  private idx(x: number, y: number): number {
    return (y * this.width + x) * 4;
  }

  private isInside(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  setPixel(x: number, y: number, color: RGBA) {
    const px = Math.round(x);
    const py = Math.round(y);

    if (!this.isInside(px, py)) {
      return;
    }

    const i = this.idx(px, py);

    this.buf[i] = clampByte(color.r);
    this.buf[i + 1] = clampByte(color.g);
    this.buf[i + 2] = clampByte(color.b);
    this.buf[i + 3] = clampByte(color.a);
  }

  private blendPixel(
    x: number,
    y: number,
    color: RGBA,
    alphaFactor = 1
  ) {
    const px = Math.round(x);
    const py = Math.round(y);

    if (!this.isInside(px, py)) {
      return;
    }

    const i = this.idx(px, py);

    const srcA = clamp01((clampByte(color.a) / 255) * alphaFactor);
    const dstA = this.buf[i + 3] / 255;

    const outA = srcA + dstA * (1 - srcA);

    if (outA <= 0) {
      this.buf[i] = 0;
      this.buf[i + 1] = 0;
      this.buf[i + 2] = 0;
      this.buf[i + 3] = 0;
      return;
    }

    const srcR = clampByte(color.r);
    const srcG = clampByte(color.g);
    const srcB = clampByte(color.b);

    const dstR = this.buf[i];
    const dstG = this.buf[i + 1];
    const dstB = this.buf[i + 2];

    const outR = (srcR * srcA + dstR * dstA * (1 - srcA)) / outA;
    const outG = (srcG * srcA + dstG * dstA * (1 - srcA)) / outA;
    const outB = (srcB * srcA + dstB * dstA * (1 - srcA)) / outA;

    this.buf[i] = clampByte(outR);
    this.buf[i + 1] = clampByte(outG);
    this.buf[i + 2] = clampByte(outB);
    this.buf[i + 3] = clampByte(outA * 255);
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();

    const cssWidth = Math.max(
      1,
      Math.round(rect.width || this.canvas.clientWidth || 800)
    );

    const cssHeight = Math.max(
      1,
      Math.round(rect.height || this.canvas.clientHeight || 600)
    );

    this.dpr = window.devicePixelRatio || 1;

    const physicalWidth = Math.max(1, Math.round(cssWidth * this.dpr));
    const physicalHeight = Math.max(1, Math.round(cssHeight * this.dpr));

    if (
      this.canvas.width === physicalWidth &&
      this.canvas.height === physicalHeight &&
      this.imageData
    ) {
      return;
    }

    this.canvas.width = physicalWidth;
    this.canvas.height = physicalHeight;

    this.width = physicalWidth;
    this.height = physicalHeight;

    this.ctx.imageSmoothingEnabled = false;

    this.imageData = this.ctx.createImageData(this.width, this.height);
    this.buf = this.imageData.data;
  }

  beginFrame(clear = true) {
    if (!this.imageData) {
      this.resize();
    }

    if (clear) {
      this.buf.fill(0);
    }
  }

  commit() {
    if (!this.imageData) {
      return;
    }

    this.ctx.putImageData(this.imageData, 0, 0);
  }

  drawLineBrassenham(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    color: RGBA
  ) {
    let xStart = Math.round(x0);
    let yStart = Math.round(y0);
    const xEnd = Math.round(x1);
    const yEnd = Math.round(y1);

    const dx = Math.abs(xEnd - xStart);
    const dy = Math.abs(yEnd - yStart);

    const sx = xStart < xEnd ? 1 : -1;
    const sy = yStart < yEnd ? 1 : -1;

    let err = dx - dy;

    while (true) {
      this.setPixel(xStart, yStart, color);

      if (xStart === xEnd && yStart === yEnd) {
        break;
      }

      const e2 = err * 2;

      if (e2 > -dy) {
        err -= dy;
        xStart += sx;
      }

      if (e2 < dx) {
        err += dx;
        yStart += sy;
      }
    }
  }

  drawLineWu(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    color: RGBA
  ) {
    let xStart = x0;
    let yStart = y0;
    let xEnd = x1;
    let yEnd = y1;

    const steep = Math.abs(yEnd - yStart) > Math.abs(xEnd - xStart);

    if (steep) {
      [xStart, yStart] = [yStart, xStart];
      [xEnd, yEnd] = [yEnd, xEnd];
    }

    if (xStart > xEnd) {
      [xStart, xEnd] = [xEnd, xStart];
      [yStart, yEnd] = [yEnd, yStart];
    }

    const dx = xEnd - xStart;
    const dy = yEnd - yStart;

    if (Math.abs(dx) < 0.000001) {
      this.blendPixel(xStart, yStart, color, 1);
      return;
    }

    const gradient = dy / dx;

    const xEndStart = roundNearest(xStart);
    const yEndStart = yStart + gradient * (xEndStart - xStart);
    const xGapStart = rfpart(xStart + 0.5);

    const xPixelStart = xEndStart;
    const yPixelStart = ipart(yEndStart);

    if (steep) {
      this.blendPixel(
        yPixelStart,
        xPixelStart,
        color,
        rfpart(yEndStart) * xGapStart
      );
      this.blendPixel(
        yPixelStart + 1,
        xPixelStart,
        color,
        fpart(yEndStart) * xGapStart
      );
    } else {
      this.blendPixel(
        xPixelStart,
        yPixelStart,
        color,
        rfpart(yEndStart) * xGapStart
      );
      this.blendPixel(
        xPixelStart,
        yPixelStart + 1,
        color,
        fpart(yEndStart) * xGapStart
      );
    }

    let intery = yEndStart + gradient;

    const xEndFinish = roundNearest(xEnd);
    const yEndFinish = yEnd + gradient * (xEndFinish - xEnd);
    const xGapFinish = fpart(xEnd + 0.5);

    const xPixelFinish = xEndFinish;
    const yPixelFinish = ipart(yEndFinish);

    if (steep) {
      this.blendPixel(
        yPixelFinish,
        xPixelFinish,
        color,
        rfpart(yEndFinish) * xGapFinish
      );
      this.blendPixel(
        yPixelFinish + 1,
        xPixelFinish,
        color,
        fpart(yEndFinish) * xGapFinish
      );
    } else {
      this.blendPixel(
        xPixelFinish,
        yPixelFinish,
        color,
        rfpart(yEndFinish) * xGapFinish
      );
      this.blendPixel(
        xPixelFinish,
        yPixelFinish + 1,
        color,
        fpart(yEndFinish) * xGapFinish
      );
    }

    for (let x = xPixelStart + 1; x < xPixelFinish; x++) {
      const y = ipart(intery);

      if (steep) {
        this.blendPixel(y, x, color, rfpart(intery));
        this.blendPixel(y + 1, x, color, fpart(intery));
      } else {
        this.blendPixel(x, y, color, rfpart(intery));
        this.blendPixel(x, y + 1, color, fpart(intery));
      }

      intery += gradient;
    }
  }

  private drawHSpan(y: number, x0: number, x1: number, color: RGBA) {
    const py = Math.round(y);

    if (py < 0 || py >= this.height) {
      return;
    }

    let start = Math.round(Math.min(x0, x1));
    let end = Math.round(Math.max(x0, x1));

    if (end < 0 || start >= this.width) {
      return;
    }

    start = Math.max(0, start);
    end = Math.min(this.width - 1, end);

    for (let x = start; x <= end; x++) {
      this.blendPixel(x, py, color, 1);
    }
  }

  fillPolygon(points: Point2D[], color: RGBA) {
    if (points.length < 3) {
      return;
    }

    let minY = points[0].y;
    let maxY = points[0].y;

    for (const p of points) {
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }

    const yStart = Math.max(0, Math.floor(minY));
    const yEnd = Math.min(this.height - 1, Math.ceil(maxY));

    for (let y = yStart; y <= yEnd; y++) {
      const scanY = y + 0.5;
      const intersections: number[] = [];

      for (let i = 0; i < points.length; i++) {
        const p1 = points[i];
        const p2 = points[(i + 1) % points.length];

        if (p1.y === p2.y) {
          continue;
        }

        const yMin = Math.min(p1.y, p2.y);
        const yMax = Math.max(p1.y, p2.y);

        if (scanY >= yMin && scanY < yMax) {
          const t = (scanY - p1.y) / (p2.y - p1.y);
          const x = p1.x + t * (p2.x - p1.x);
          intersections.push(x);
        }
      }

      intersections.sort((a, b) => a - b);

      for (let i = 0; i + 1 < intersections.length; i += 2) {
        const x0 = Math.ceil(intersections[i]);
        const x1 = Math.floor(intersections[i + 1]);

        this.drawHSpan(y, x0, x1, color);
      }
    }
  }

  fillCircle(cx: number, cy: number, radius: number, color: RGBA) {
    if (radius <= 0) {
      return;
    }

    const r = Math.abs(radius);
    const r2 = r * r;

    const yStart = Math.max(0, Math.floor(cy - r));
    const yEnd = Math.min(this.height - 1, Math.ceil(cy + r));

    for (let y = yStart; y <= yEnd; y++) {
      const dy = y + 0.5 - cy;
      const dx2 = r2 - dy * dy;

      if (dx2 < 0) {
        continue;
      }

      const dx = Math.sqrt(dx2);
      const x0 = Math.ceil(cx - dx);
      const x1 = Math.floor(cx + dx);

      this.drawHSpan(y, x0, x1, color);
    }
  }

  strokeLine(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    color: RGBA,
    width = 1
  ) {
    if (width <= 1) {
      this.drawLine(x0, y0, x1, y1, color);
      return;
    }

    const dx = x1 - x0;
    const dy = y1 - y0;
    const length = Math.sqrt(dx * dx + dy * dy);

    if (length < 0.000001) {
      this.fillCircle(x0, y0, width / 2, color);
      return;
    }

    const half = width / 2;

    const nx = (-dy / length) * half;
    const ny = (dx / length) * half;

    const body: Point2D[] = [
      { x: x0 + nx, y: y0 + ny },
      { x: x1 + nx, y: y1 + ny },
      { x: x1 - nx, y: y1 - ny },
      { x: x0 - nx, y: y0 - ny },
    ];

    this.fillPolygon(body, color);

    this.fillCircle(x0, y0, half, color);
    this.fillCircle(x1, y1, half, color);
  }

  strokePolygon(points: Point2D[], color: RGBA, width = 1) {
    if (points.length < 2) {
      return;
    }

    for (let i = 0; i < points.length; i++) {
      const a = points[i];
      const b = points[(i + 1) % points.length];

      this.strokeLine(a.x, a.y, b.x, b.y, color, width);
    }

    if (width > 1) {
      const jointRadius = width / 2;

      for (const point of points) {
        this.fillCircle(point.x, point.y, jointRadius, color);
      }
    }
  }
}