import { describe, expect, test } from "vitest";
import {
  CubicBezier,
  PathBezier,
  QuadraticBezier,
  Triangle,
} from "./index";

describe("Triangle", () => {
  test("hitTest detects inside and outside points", () => {
    const triangle = new Triangle(0, 0, 100, 0, 50, 100);

    expect(triangle.hitTest(50, 40)).toBe(true);
    expect(triangle.hitTest(150, 150)).toBe(false);
  });

  test("getBounds returns triangle bounds", () => {
    const triangle = new Triangle(0, 0, 100, 0, 50, 100);

    const bounds = triangle.getBounds();

    expect(bounds.minX).toBeCloseTo(0);
    expect(bounds.minY).toBeCloseTo(0);
    expect(bounds.maxX).toBeCloseTo(100);
    expect(bounds.maxY).toBeCloseTo(100);
  });

  test("toJSON stores triangle type", () => {
    const triangle = new Triangle(0, 0, 100, 0, 50, 100);

    expect(triangle.toJSON().kind).toBe("triangle");
  });
});

describe("QuadraticBezier", () => {
  test("evalLocal returns start and end points", () => {
    const curve = new QuadraticBezier(0, 0, 50, 100, 100, 0);

    const start = curve.evalLocal(0);
    const end = curve.evalLocal(1);

    expect(start.x).toBeCloseTo(curve.p0.x);
    expect(start.y).toBeCloseTo(curve.p0.y);

    expect(end.x).toBeCloseTo(curve.p2.x);
    expect(end.y).toBeCloseTo(curve.p2.y);
  });

  test("evalLocal returns expected midpoint", () => {
    const curve = new QuadraticBezier(0, 0, 50, 100, 100, 0);

    const mid = curve.evalLocal(0.5);
    const deviceMid = curve.transformPointToDevice(mid.x, mid.y);

    expect(deviceMid.x).toBeCloseTo(50);
    expect(deviceMid.y).toBeCloseTo(50);
  });

  test("hitTest detects point near curve", () => {
    const curve = new QuadraticBezier(0, 0, 50, 100, 100, 0, {
      strokeWidth: 10,
    });

    expect(curve.hitTest(50, 50)).toBe(true);
    expect(curve.hitTest(50, 150)).toBe(false);
  });

  test("setControlPoint changes curve geometry", () => {
    const curve = new QuadraticBezier(0, 0, 50, 100, 100, 0);

    const before = curve.evalLocal(0.5);

    curve.setControlPoint(1, { x: 0, y: 0 });

    const after = curve.evalLocal(0.5);

    expect(after.y).not.toBeCloseTo(before.y);
  });
});

describe("CubicBezier", () => {
  test("evalLocal returns start and end points", () => {
    const curve = new CubicBezier(0, 0, 30, 100, 70, -100, 100, 0);

    const start = curve.evalLocal(0);
    const end = curve.evalLocal(1);

    expect(start.x).toBeCloseTo(curve.p0.x);
    expect(start.y).toBeCloseTo(curve.p0.y);

    expect(end.x).toBeCloseTo(curve.p3.x);
    expect(end.y).toBeCloseTo(curve.p3.y);
  });

  test("flattenDevicePoints creates polyline approximation", () => {
    const curve = new CubicBezier(0, 0, 30, 100, 70, -100, 100, 0, {
      segments: 10,
    });

    const points = curve.flattenDevicePoints();

    expect(points.length).toBe(11);
  });

  test("hitTest detects point near cubic curve", () => {
    const curve = new CubicBezier(0, 0, 30, 100, 70, -100, 100, 0, {
      strokeWidth: 12,
      segments: 80,
    });

    expect(curve.hitTest(50, 0)).toBe(true);
    expect(curve.hitTest(50, 200)).toBe(false);
  });

  test("toJSON stores cubic type", () => {
    const curve = new CubicBezier(0, 0, 30, 100, 70, -100, 100, 0);

    expect(curve.toJSON().kind).toBe("cubicBezier");
  });
});

describe("PathBezier", () => {
  test("polyline mode creates direct segments", () => {
    const path = new PathBezier(
      [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
      ],
      "polyline"
    );

    const points = path.flattenDevicePoints();

    expect(points.length).toBe(3);
    expect(path.hitTest(50, 0)).toBe(true);
    expect(path.hitTest(50, 50)).toBe(false);
  });

  test("closed path appends first point at the end", () => {
    const path = new PathBezier(
      [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
      ],
      "polyline",
      true
    );

    const points = path.flattenLocalPoints();

    expect(points.length).toBe(4);
    expect(points[0].x).toBeCloseTo(points[3].x);
    expect(points[0].y).toBeCloseTo(points[3].y);
  });

  test("catmull mode creates smooth approximation", () => {
    const path = new PathBezier(
      [
        { x: 0, y: 0 },
        { x: 50, y: 100 },
        { x: 100, y: 0 },
        { x: 150, y: 100 },
      ],
      "catmull",
      false,
      {
        segments: 10,
      }
    );

    const points = path.flattenDevicePoints();

    expect(points.length).toBeGreaterThan(4);
  });

  test("addPointLocal and removePoint update anchors", () => {
    const path = new PathBezier(
      [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ],
      "polyline"
    );

    path.addPointLocal({ x: 50, y: 50 });

    expect(path.getControlPoints().length).toBe(3);

    path.removePoint(1);

    expect(path.getControlPoints().length).toBe(2);
  });

  test("toJSON stores path mode and closed flag", () => {
    const path = new PathBezier(
      [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ],
      "catmull",
      true
    );

    const json = path.toJSON();

    expect(json.kind).toBe("pathBezier");
    expect(json.geometry.mode).toBe("catmull");
    expect(json.geometry.closed).toBe(true);
  });
});