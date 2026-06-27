import { describe, expect, test } from "vitest";
import { Line, Oval, Rect } from "./index";

describe("Rect", () => {
  test("hitTest detects point inside and outside rectangle", () => {
    const rect = new Rect(100, 100, 80, 40);

    expect(rect.hitTest(100, 100)).toBe(true);
    expect(rect.hitTest(130, 110)).toBe(true);
    expect(rect.hitTest(200, 200)).toBe(false);
  });

  test("getBounds returns correct bounds for unrotated rectangle", () => {
    const rect = new Rect(100, 100, 80, 40);

    const bounds = rect.getBounds();

    expect(bounds.minX).toBeCloseTo(60);
    expect(bounds.minY).toBeCloseTo(80);
    expect(bounds.maxX).toBeCloseTo(140);
    expect(bounds.maxY).toBeCloseTo(120);
  });

  test("hitTest works with rotated rectangle", () => {
    const rect = new Rect(100, 100, 80, 40, {
      transform: {
        rotation: Math.PI / 4,
      },
    });

    expect(rect.hitTest(100, 100)).toBe(true);
    expect(rect.hitTest(220, 220)).toBe(false);
  });
});

describe("Line", () => {
  test("hitTest detects point near line and rejects far point", () => {
    const line = new Line(0, 0, 100, 0, {
      strokeWidth: 10,
    });

    expect(line.hitTest(50, 2)).toBe(true);
    expect(line.hitTest(50, 20)).toBe(false);
  });

  test("getBounds returns bounds with stroke padding", () => {
    const line = new Line(0, 0, 100, 0, {
      strokeWidth: 10,
    });

    const bounds = line.getBounds();

    expect(bounds.minX).toBeCloseTo(-5);
    expect(bounds.minY).toBeCloseTo(-5);
    expect(bounds.maxX).toBeCloseTo(105);
    expect(bounds.maxY).toBeCloseTo(5);
  });
});

describe("Oval", () => {
  test("hitTest detects point inside and outside oval", () => {
    const oval = new Oval(200, 100, 60, 30);

    expect(oval.hitTest(200, 100)).toBe(true);
    expect(oval.hitTest(250, 115)).toBe(true);
    expect(oval.hitTest(280, 160)).toBe(false);
  });

  test("getBounds returns correct bounds for unrotated oval", () => {
    const oval = new Oval(200, 100, 60, 30);

    const bounds = oval.getBounds();

    expect(bounds.minX).toBeCloseTo(140);
    expect(bounds.minY).toBeCloseTo(70);
    expect(bounds.maxX).toBeCloseTo(260);
    expect(bounds.maxY).toBeCloseTo(130);
  });

  test("toJSON stores oval data", () => {
    const oval = new Oval(200, 100, 60, 30);

    const json = oval.toJSON();

    expect(json.kind).toBe("oval");
    expect(json.geometry.rx).toBe(60);
    expect(json.geometry.ry).toBe(30);
  });
});