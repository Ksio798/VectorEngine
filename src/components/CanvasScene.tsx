import { useEffect, useRef, useState } from "react";
import {
  RasterRenderer,
  type LineAlg,
  type RGBA,
} from "../lib/raster/RasterRenderer";
import type { EditorTool } from "../lib/editor/toolTypes";
import {
  CubicBezier,
  Line,
  Oval,
  PathBezier,
  QuadraticBezier,
  Rect,
  Triangle,
  type Bounds,
  type Point2D,
  type Shape,
  type Transform,
} from "../lib/shapes";

export type SceneLayer = {
  id: string;
  name: string;
  index: number;
};

export type SceneCreationStyle = {
  fillStyle: string;
  fillOpacity: number;
  strokeStyle: string;
  strokeOpacity: number;
  strokeWidth: number;
};

export type ScenePanelState = {
  selectedId: string | null;
  selectedName: string | null;
  selectedKind: string | null;
  canFill: boolean;
  canClosePath: boolean;
  pathClosed: boolean;
  fillStyle: string;
  fillOpacity: number;
  strokeStyle: string;
  strokeOpacity: number;
  strokeWidth: number;
  layers: SceneLayer[];
};

export type SceneCommand =
  | {
      id: number;
      type: "select";
      shapeId: string;
    }
  | {
      id: number;
      type: "deleteSelected";
    }
  | {
      id: number;
      type: "moveLayer";
      direction: 1 | -1;
    }
  | {
      id: number;
      type: "setStrokeStyle";
      value: string;
    }
  | {
      id: number;
      type: "setFillStyle";
      value: string;
    }
  | {
      id: number;
      type: "setStrokeWidth";
      value: number;
    }
  | {
      id: number;
      type: "setFillOpacity";
      value: number;
    }
  | {
      id: number;
      type: "setStrokeOpacity";
      value: number;
    }
  | {
      id: number;
      type: "setPathClosed";
      value: boolean;
    }
  | {
      id: number;
      type: "addPathPoint";
    }
  | {
      id: number;
      type: "removePathPoint";
    };

type CanvasSceneProps = {
  lineAlg: LineAlg;
  activeTool: EditorTool;
  creationStyle: SceneCreationStyle;
  onToolChange: (tool: EditorTool) => void;
  onSceneStateChange: (state: ScenePanelState) => void;
  sceneCommand: SceneCommand | null;
  onCommandHandled: () => void;
};

type ResizeHandle = "nw" | "ne" | "se" | "sw";
type CreationTool = Exclude<EditorTool, "select">;

type ControlPointShape = Shape & {
  getControlPoints: () => Point2D[];
  setControlPoint: (index: number, point: Point2D) => void;
};

type InteractionState =
  | {
      mode: "idle";
    }
  | {
      mode: "create";
      tool: CreationTool;
      startPointer: Point2D;
      shapeId: string;
    }
  | {
      mode: "move";
      shape: Shape;
      startPointer: Point2D;
      startTransform: Transform;
    }
  | {
      mode: "resize";
      shape: Shape;
      handle: ResizeHandle;
      startPointer: Point2D;
      startBounds: Bounds;
      startTransform: Transform;
    }
  | {
      mode: "rotate";
      shape: Shape;
      startAngle: number;
      startRotation: number;
      center: Point2D;
    }
  | {
      mode: "control";
      shape: ControlPointShape;
      controlIndex: number;
    };

function isCreationTool(tool: EditorTool): tool is CreationTool {
  return tool !== "select";
}

function clampOpacity(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function hasControlPoints(shape: Shape | null): shape is ControlPointShape {
  return (
    !!shape &&
    "getControlPoints" in shape &&
    "setControlPoint" in shape &&
    typeof (shape as ControlPointShape).getControlPoints === "function" &&
    typeof (shape as ControlPointShape).setControlPoint === "function"
  );
}

function getShapeName(shape: Shape): string {
  const kind = shape.toJSON().kind;

  if (kind === "rect") return "Прямоугольник";
  if (kind === "line") return "Линия";
  if (kind === "oval") return "Овал";
  if (kind === "triangle") return "Треугольник";
  if (kind === "quadraticBezier") return "Квадр. Безье";
  if (kind === "cubicBezier") return "Кубич. Безье";
  if (kind === "pathBezier") return "PathBezier";

  return "Фигура";
}

function canShapeHaveFill(shape: Shape | null): boolean {
  if (!shape) {
    return false;
  }

  const kind = shape.toJSON().kind;

  return kind === "rect" || kind === "oval" || kind === "triangle";
}

function distance(a: Point2D, b: Point2D): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;

  return Math.sqrt(dx * dx + dy * dy);
}

function getBoundsCenter(bounds: Bounds): Point2D {
  return {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2,
  };
}

function getBoundsCorners(bounds: Bounds) {
  return [
    { id: "nw" as const, x: bounds.minX, y: bounds.minY },
    { id: "ne" as const, x: bounds.maxX, y: bounds.minY },
    { id: "se" as const, x: bounds.maxX, y: bounds.maxY },
    { id: "sw" as const, x: bounds.minX, y: bounds.maxY },
  ];
}

function clampMinSize(
  bounds: Bounds,
  handle: ResizeHandle,
  minSize: number
): Bounds {
  let { minX, minY, maxX, maxY } = bounds;

  if (maxX - minX < minSize) {
    if (handle === "nw" || handle === "sw") {
      minX = maxX - minSize;
    } else {
      maxX = minX + minSize;
    }
  }

  if (maxY - minY < minSize) {
    if (handle === "nw" || handle === "ne") {
      minY = maxY - minSize;
    } else {
      maxY = minY + minSize;
    }
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
  };
}

function getDragEnd(
  start: Point2D,
  current: Point2D,
  minSize: number
): Point2D {
  const dx = current.x - start.x;
  const dy = current.y - start.y;

  const sx = dx >= 0 ? 1 : -1;
  const sy = dy >= 0 ? 1 : -1;

  return {
    x: Math.abs(dx) < minSize ? start.x + sx * minSize : current.x,
    y: Math.abs(dy) < minSize ? start.y + sy * minSize : current.y,
  };
}

function getDragBounds(
  start: Point2D,
  current: Point2D,
  minSize: number
) {
  const end = getDragEnd(start, current, minSize);

  const minX = Math.min(start.x, end.x);
  const minY = Math.min(start.y, end.y);
  const maxX = Math.max(start.x, end.x);
  const maxY = Math.max(start.y, end.y);

  const width = maxX - minX;
  const height = maxY - minY;

  return {
    minX,
    minY,
    maxX,
    maxY,
    width,
    height,
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
    end,
  };
}

function buildShapeFromDrag(
  tool: CreationTool,
  start: Point2D,
  current: Point2D,
  r: RasterRenderer,
  style: SceneCreationStyle,
  id?: string
): Shape | null {
  const minSize = 8 * r.dpr;
  const bounds = getDragBounds(start, current, minSize);

  const strokeWidth = Math.max(1, style.strokeWidth) * r.dpr;

  if (tool === "rect") {
    return new Rect(bounds.cx, bounds.cy, bounds.width, bounds.height, {
      id,
      fillStyle: style.fillStyle,
      fillOpacity: style.fillOpacity,
      strokeStyle: style.strokeStyle,
      strokeOpacity: style.strokeOpacity,
      strokeWidth,
    });
  }

  if (tool === "oval") {
    return new Oval(bounds.cx, bounds.cy, bounds.width / 2, bounds.height / 2, {
      id,
      fillStyle: style.fillStyle,
      fillOpacity: style.fillOpacity,
      strokeStyle: style.strokeStyle,
      strokeOpacity: style.strokeOpacity,
      strokeWidth,
    });
  }

  if (tool === "line") {
    return new Line(start.x, start.y, bounds.end.x, bounds.end.y, {
      id,
      strokeStyle: style.strokeStyle,
      strokeOpacity: style.strokeOpacity,
      strokeWidth,
    });
  }

  if (tool === "triangle") {
    return new Triangle(
      bounds.cx,
      bounds.minY,
      bounds.maxX,
      bounds.maxY,
      bounds.minX,
      bounds.maxY,
      {
        id,
        fillStyle: style.fillStyle,
        fillOpacity: style.fillOpacity,
        strokeStyle: style.strokeStyle,
        strokeOpacity: style.strokeOpacity,
        strokeWidth,
      }
    );
  }

  if (tool === "quadratic") {
    return new QuadraticBezier(
      bounds.minX,
      bounds.maxY,
      bounds.cx,
      bounds.minY,
      bounds.maxX,
      bounds.maxY,
      {
        id,
        strokeStyle: style.strokeStyle,
        strokeOpacity: style.strokeOpacity,
        strokeWidth,
        segments: 80,
      }
    );
  }

  if (tool === "cubic") {
    return new CubicBezier(
      bounds.minX,
      bounds.cy,
      bounds.minX + bounds.width * 0.25,
      bounds.minY,
      bounds.minX + bounds.width * 0.75,
      bounds.maxY,
      bounds.maxX,
      bounds.cy,
      {
        id,
        strokeStyle: style.strokeStyle,
        strokeOpacity: style.strokeOpacity,
        strokeWidth,
        segments: 100,
      }
    );
  }

  if (tool === "path") {
    return new PathBezier(
      [
        { x: bounds.minX, y: bounds.cy },
        { x: bounds.minX + bounds.width * 0.25, y: bounds.minY },
        { x: bounds.cx, y: bounds.maxY },
        { x: bounds.minX + bounds.width * 0.75, y: bounds.minY },
        { x: bounds.maxX, y: bounds.cy },
      ],
      "catmull",
      false,
      {
        id,
        strokeStyle: style.strokeStyle,
        strokeOpacity: style.strokeOpacity,
        strokeWidth,
        segments: 32,
      }
    );
  }

  return null;
}

function CanvasScene({
  lineAlg,
  activeTool,
  creationStyle,
  onToolChange,
  onSceneStateChange,
  sceneCommand,
  onCommandHandled,
}: CanvasSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<RasterRenderer | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const shapesRef = useRef<Shape[]>([]);
  const interactionRef = useRef<InteractionState>({ mode: "idle" });

  const [selectedId, setSelectedIdState] = useState<string | null>(null);
  const selectedIdRef = useRef<string | null>(null);

  const [, forceRender] = useState(0);

  const getSelectedShape = (): Shape | null => {
    const id = selectedIdRef.current;

    if (!id) {
      return null;
    }

    return shapesRef.current.find((shape) => shape.id === id) ?? null;
  };

  const getPanelState = (): ScenePanelState => {
    const selectedShape = getSelectedShape();

    return {
      selectedId: selectedShape?.id ?? null,
      selectedName: selectedShape ? getShapeName(selectedShape) : null,
      selectedKind: selectedShape?.toJSON().kind ?? null,
      canFill: canShapeHaveFill(selectedShape),
      canClosePath: selectedShape instanceof PathBezier,
      pathClosed: selectedShape instanceof PathBezier ? selectedShape.closed : false,
      fillStyle: selectedShape?.fillStyle ?? "#000000",
      fillOpacity: selectedShape?.fillOpacity ?? 1,
      strokeStyle: selectedShape?.strokeStyle ?? "#000000",
      strokeOpacity: selectedShape?.strokeOpacity ?? 1,
      strokeWidth: selectedShape?.strokeWidth ?? 1,
      layers: shapesRef.current.map((shape, index) => ({
        id: shape.id,
        name: getShapeName(shape),
        index,
      })),
    };
  };

  const emitPanelState = () => {
    onSceneStateChange(getPanelState());
  };

  const redrawUI = () => {
    forceRender((v) => v + 1);
    emitPanelState();
  };

  const setSelectedId = (id: string | null) => {
    selectedIdRef.current = id;
    setSelectedIdState(id);
  };

  const clientToDevice = (
    event: React.PointerEvent<HTMLCanvasElement>
  ): Point2D => {
    const canvas = canvasRef.current;
    const renderer = rendererRef.current;

    if (!canvas || !renderer) {
      return { x: 0, y: 0 };
    }

    const rect = canvas.getBoundingClientRect();

    return {
      x: (event.clientX - rect.left) * renderer.dpr,
      y: (event.clientY - rect.top) * renderer.dpr,
    };
  };

  const findTopShapeAt = (point: Point2D): Shape | null => {
    const shapes = shapesRef.current;

    for (let i = shapes.length - 1; i >= 0; i--) {
      if (shapes[i].hitTest(point.x, point.y)) {
        return shapes[i];
      }
    }

    return null;
  };

  const getRotateHandle = (shape: Shape): Point2D => {
    const renderer = rendererRef.current;
    const dpr = renderer?.dpr ?? 1;
    const bounds = shape.getBounds();

    return {
      x: (bounds.minX + bounds.maxX) / 2,
      y: bounds.minY - 38 * dpr,
    };
  };

  const hitResizeHandle = (
    shape: Shape,
    point: Point2D
  ): ResizeHandle | null => {
    const renderer = rendererRef.current;
    const dpr = renderer?.dpr ?? 1;
    const radius = 10 * dpr;

    const handles = getBoundsCorners(shape.getBounds());

    for (const handle of handles) {
      if (distance(point, handle) <= radius) {
        return handle.id;
      }
    }

    return null;
  };

  const hitRotateHandle = (shape: Shape, point: Point2D): boolean => {
    const renderer = rendererRef.current;
    const dpr = renderer?.dpr ?? 1;
    const handle = getRotateHandle(shape);

    return distance(point, handle) <= 12 * dpr;
  };

  const hitControlPoint = (shape: Shape, point: Point2D): number | null => {
    if (!hasControlPoints(shape)) {
      return null;
    }

    const renderer = rendererRef.current;
    const dpr = renderer?.dpr ?? 1;
    const radius = 10 * dpr;

    const controlPoints = shape.getControlPoints();

    for (let i = 0; i < controlPoints.length; i++) {
      const p = controlPoints[i];
      const devicePoint = shape.transformPointToDevice(p.x, p.y);

      if (distance(point, devicePoint) <= radius) {
        return i;
      }
    }

    return null;
  };

  const moveSelectedLayer = (direction: 1 | -1) => {
    const selectedShape = getSelectedShape();

    if (!selectedShape) {
      return;
    }

    const shapes = shapesRef.current;
    const index = shapes.findIndex((shape) => shape.id === selectedShape.id);
    const nextIndex = index + direction;

    if (index < 0 || nextIndex < 0 || nextIndex >= shapes.length) {
      return;
    }

    const copy = [...shapes];
    const temp = copy[index];

    copy[index] = copy[nextIndex];
    copy[nextIndex] = temp;

    shapesRef.current = copy;
    redrawUI();
  };

  const deleteSelected = () => {
    const selectedShape = getSelectedShape();

    if (!selectedShape) {
      return;
    }

    shapesRef.current = shapesRef.current.filter(
      (shape) => shape.id !== selectedShape.id
    );

    setSelectedId(null);
    redrawUI();
  };

  const addPointToSelectedPath = () => {
    const shape = getSelectedShape();

    if (!(shape instanceof PathBezier)) {
      return;
    }

    const points = shape.getControlPoints();
    const lastPoint = points[points.length - 1] ?? { x: 0, y: 0 };

    shape.addPointLocal({
      x: lastPoint.x + 60,
      y: lastPoint.y,
    });

    redrawUI();
  };

  const removePointFromSelectedPath = () => {
    const shape = getSelectedShape();

    if (!(shape instanceof PathBezier)) {
      return;
    }

    const points = shape.getControlPoints();

    if (points.length <= 2) {
      return;
    }

    shape.removePoint(points.length - 1);
    redrawUI();
  };

  const applySceneCommand = (command: SceneCommand) => {
    const selectedShape = getSelectedShape();

    if (command.type === "select") {
      setSelectedId(command.shapeId);
      redrawUI();
      return;
    }

    if (command.type === "deleteSelected") {
      deleteSelected();
      return;
    }

    if (command.type === "moveLayer") {
      moveSelectedLayer(command.direction);
      return;
    }

    if (!selectedShape) {
      return;
    }

    if (command.type === "setStrokeStyle") {
      selectedShape.strokeStyle = command.value;
      redrawUI();
      return;
    }

    if (command.type === "setStrokeOpacity") {
      selectedShape.strokeOpacity = clampOpacity(command.value);
      redrawUI();
      return;
    }

    if (command.type === "setFillStyle") {
      selectedShape.fillStyle = command.value;
      redrawUI();
      return;
    }

    if (command.type === "setFillOpacity") {
      selectedShape.fillOpacity = clampOpacity(command.value);
      redrawUI();
      return;
    }

    if (command.type === "setStrokeWidth") {
      selectedShape.strokeWidth = Math.max(1, command.value);
      redrawUI();
      return;
    }

    if (command.type === "setPathClosed") {
      if (selectedShape instanceof PathBezier) {
        selectedShape.closed = command.value;
        redrawUI();
      }

      return;
    }

    if (command.type === "addPathPoint") {
      addPointToSelectedPath();
      return;
    }

    if (command.type === "removePathPoint") {
      removePointFromSelectedPath();
    }
  };

  const drawSelectionOverlay = (r: RasterRenderer, shape: Shape) => {
    const dpr = r.dpr;
    const bounds = shape.getBounds();

    const blue: RGBA = { r: 37, g: 99, b: 235, a: 255 };
    const yellow: RGBA = { r: 250, g: 204, b: 21, a: 255 };
    const white: RGBA = { r: 255, g: 255, b: 255, a: 255 };
    const purple: RGBA = { r: 124, g: 58, b: 237, a: 255 };

    const box = [
      { x: bounds.minX, y: bounds.minY },
      { x: bounds.maxX, y: bounds.minY },
      { x: bounds.maxX, y: bounds.maxY },
      { x: bounds.minX, y: bounds.maxY },
    ];

    r.strokePolygon(box, blue, 2 * dpr);

    const handles = getBoundsCorners(bounds);

    for (const handle of handles) {
      r.fillCircle(handle.x, handle.y, 7 * dpr, white);
      r.fillCircle(handle.x, handle.y, 4 * dpr, yellow);
    }

    const centerTop = {
      x: (bounds.minX + bounds.maxX) / 2,
      y: bounds.minY,
    };

    const rotateHandle = getRotateHandle(shape);

    r.strokeLine(
      centerTop.x,
      centerTop.y,
      rotateHandle.x,
      rotateHandle.y,
      blue,
      1 * dpr
    );

    r.fillCircle(rotateHandle.x, rotateHandle.y, 8 * dpr, white);
    r.fillCircle(rotateHandle.x, rotateHandle.y, 5 * dpr, blue);

    if (hasControlPoints(shape)) {
      const controlPoints = shape.getControlPoints();

      for (let i = 0; i < controlPoints.length - 1; i++) {
        const a = shape.transformPointToDevice(
          controlPoints[i].x,
          controlPoints[i].y
        );
        const b = shape.transformPointToDevice(
          controlPoints[i + 1].x,
          controlPoints[i + 1].y
        );

        r.strokeLine(a.x, a.y, b.x, b.y, purple, 1 * dpr);
      }

      for (const point of controlPoints) {
        const devicePoint = shape.transformPointToDevice(point.x, point.y);

        r.fillCircle(devicePoint.x, devicePoint.y, 7 * dpr, white);
        r.fillCircle(devicePoint.x, devicePoint.y, 4 * dpr, purple);
      }
    }
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const point = clientToDevice(event);
    const selectedShape = getSelectedShape();

    if (isCreationTool(activeTool)) {
      const r = rendererRef.current;

      if (!r) {
        return;
      }

      event.currentTarget.setPointerCapture(event.pointerId);

      const shape = buildShapeFromDrag(activeTool, point, point, r, creationStyle);

      if (!shape) {
        return;
      }

      shapesRef.current = [...shapesRef.current, shape];

      setSelectedId(shape.id);

      interactionRef.current = {
        mode: "create",
        tool: activeTool,
        startPointer: point,
        shapeId: shape.id,
      };

      redrawUI();
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);

    if (selectedShape) {
      const controlIndex = hitControlPoint(selectedShape, point);

      if (controlIndex !== null && hasControlPoints(selectedShape)) {
        interactionRef.current = {
          mode: "control",
          shape: selectedShape,
          controlIndex,
        };

        redrawUI();
        return;
      }

      if (hitRotateHandle(selectedShape, point)) {
        const center = getBoundsCenter(selectedShape.getBounds());
        const startAngle = Math.atan2(point.y - center.y, point.x - center.x);

        interactionRef.current = {
          mode: "rotate",
          shape: selectedShape,
          startAngle,
          startRotation: selectedShape.transform.rotation,
          center,
        };

        redrawUI();
        return;
      }

      const resizeHandle = hitResizeHandle(selectedShape, point);

      if (resizeHandle) {
        interactionRef.current = {
          mode: "resize",
          shape: selectedShape,
          handle: resizeHandle,
          startPointer: point,
          startBounds: selectedShape.getBounds(),
          startTransform: { ...selectedShape.transform },
        };

        redrawUI();
        return;
      }
    }

    const clickedShape = findTopShapeAt(point);

    if (!clickedShape) {
      setSelectedId(null);
      interactionRef.current = { mode: "idle" };
      redrawUI();
      return;
    }

    setSelectedId(clickedShape.id);

    interactionRef.current = {
      mode: "move",
      shape: clickedShape,
      startPointer: point,
      startTransform: { ...clickedShape.transform },
    };

    redrawUI();
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const point = clientToDevice(event);
    const state = interactionRef.current;

    if (state.mode === "idle") {
      return;
    }

    if (state.mode === "create") {
      const r = rendererRef.current;

      if (!r) {
        return;
      }

      const nextShape = buildShapeFromDrag(state.tool, state.startPointer, point, r, creationStyle, state.shapeId);

      if (!nextShape) {
        return;
      }

      const index = shapesRef.current.findIndex(
        (shape) => shape.id === state.shapeId
      );

      if (index >= 0) {
        const copy = [...shapesRef.current];

        copy[index] = nextShape;
        shapesRef.current = copy;

        setSelectedId(nextShape.id);
      }

      redrawUI();
      return;
    }

    if (state.mode === "move") {
      const dx = point.x - state.startPointer.x;
      const dy = point.y - state.startPointer.y;

      state.shape.transform.x = state.startTransform.x + dx;
      state.shape.transform.y = state.startTransform.y + dy;

      redrawUI();
      return;
    }

    if (state.mode === "resize") {
      const dx = point.x - state.startPointer.x;
      const dy = point.y - state.startPointer.y;

      let nextBounds: Bounds = { ...state.startBounds };

      if (state.handle === "nw") {
        nextBounds.minX += dx;
        nextBounds.minY += dy;
      }

      if (state.handle === "ne") {
        nextBounds.maxX += dx;
        nextBounds.minY += dy;
      }

      if (state.handle === "se") {
        nextBounds.maxX += dx;
        nextBounds.maxY += dy;
      }

      if (state.handle === "sw") {
        nextBounds.minX += dx;
        nextBounds.maxY += dy;
      }

      const r = rendererRef.current;
      const minSize = 24 * (r?.dpr ?? 1);

      nextBounds = clampMinSize(nextBounds, state.handle, minSize);

      const startWidth = state.startBounds.maxX - state.startBounds.minX;
      const startHeight = state.startBounds.maxY - state.startBounds.minY;

      const nextWidth = nextBounds.maxX - nextBounds.minX;
      const nextHeight = nextBounds.maxY - nextBounds.minY;

      const center = getBoundsCenter(nextBounds);

      state.shape.transform.x = center.x;
      state.shape.transform.y = center.y;
      state.shape.transform.rotation = state.startTransform.rotation;

      if (startWidth > 0.000001) {
        state.shape.transform.scaleX =
          state.startTransform.scaleX * (nextWidth / startWidth);
      }

      if (startHeight > 0.000001) {
        state.shape.transform.scaleY =
          state.startTransform.scaleY * (nextHeight / startHeight);
      }

      redrawUI();
      return;
    }

    if (state.mode === "rotate") {
      const currentAngle = Math.atan2(
        point.y - state.center.y,
        point.x - state.center.x
      );

      state.shape.transform.rotation =
        state.startRotation + (currentAngle - state.startAngle);

      redrawUI();
      return;
    }

    if (state.mode === "control") {
      const localPoint = state.shape.transformPointToLocal(point.x, point.y);

      state.shape.setControlPoint(state.controlIndex, localPoint);

      redrawUI();
    }
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const state = interactionRef.current;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (state.mode === "create") {
      onToolChange("select");
    }

    interactionRef.current = { mode: "idle" };
    redrawUI();
  };

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.setLineAlgorithm(lineAlg);
    }
  }, [lineAlg]);

  useEffect(() => {
    if (!sceneCommand) {
      return;
    }

    applySceneCommand(sceneCommand);
    onCommandHandled();
  }, [sceneCommand]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Delete" || event.key === "Backspace") {
        deleteSelected();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const renderer = new RasterRenderer(canvas);
    renderer.setLineAlgorithm(lineAlg);
    rendererRef.current = renderer;

    const resizeObserver = new ResizeObserver(() => {
      renderer.resize();
      redrawUI();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    } else {
      resizeObserver.observe(canvas);
    }

    emitPanelState();

    let raf = 0;

    const frame = () => {
      const r = rendererRef.current;

      if (r) {
        r.beginFrame(true);

        for (const shape of shapesRef.current) {
          shape.drawRaster(r);
        }

        const selectedShape = getSelectedShape();

        if (selectedShape) {
          drawSelectionOverlay(r, selectedShape);
        }

        r.commit();
      }

      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      renderer.dispose();
      rendererRef.current = null;
    };
  }, []);

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden">
      <canvas
        ref={canvasRef}
        tabIndex={0}
        className="h-full w-full touch-none outline-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />

      <div className="absolute bottom-3 left-3 rounded-lg border border-slate-700 bg-slate-900/95 px-3 py-2 text-xs text-slate-300 shadow-xl">
        Инструмент фигуры – зажать и протянуть · Выбор – клик ·
        Перетаскивание – перемещение · Жёлтые ручки – размер · Синяя ручка
        сверху – поворот · Delete – удаление
      </div>
    </div>
  );
}

export default CanvasScene;