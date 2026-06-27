export type ShapeKind = "rect" | "line" | "oval";

export type Transform = {
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
};

export type Bounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

export type ShapeOptions = {
  id?: string;
  transform?: Partial<Transform>;

  fillStyle?: string;
  fillOpacity?: number;

  strokeStyle?: string;
  strokeWidth?: number;
  strokeOpacity?: number;
};

export type ShapeJSON = {
  id: string;
  kind: ShapeKind;
  transform: Transform;

  fillStyle: string;
  fillOpacity: number;

  strokeStyle: string;
  strokeWidth: number;
  strokeOpacity: number;

  geometry: Record<string, number>;
};