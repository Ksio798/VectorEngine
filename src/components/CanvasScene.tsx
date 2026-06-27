import { useEffect, useRef } from "react";
import { RasterRenderer, type LineAlg } from "../lib/raster/RasterRenderer";
import {
  CubicBezier,
  Line,
  Oval,
  PathBezier,
  QuadraticBezier,
  Rect,
  Triangle,
  type Shape,
} from "../lib/shapes";

type CanvasSceneProps = {
  lineAlg: LineAlg;
};

function CanvasScene({ lineAlg }: CanvasSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<RasterRenderer | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.setLineAlgorithm(lineAlg);
    }
  }, [lineAlg]);

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
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    } else {
      resizeObserver.observe(canvas);
    }

    let raf = 0;

    const frame = () => {
      const r = rendererRef.current;

      if (r) {
        r.beginFrame(true);

        const w = r.width;
        const h = r.height;

        const shapes: Shape[] = [
          new Rect(w * 0.16, h * 0.16, w * 0.18, h * 0.12, {
            fillStyle: "#2563EB",
            fillOpacity: 0.75,
            strokeStyle: "#0F172A",
            strokeWidth: 3 * r.dpr,
          }),

          new Oval(w * 0.42, h * 0.18, 65 * r.dpr, 38 * r.dpr, {
            fillStyle: "#F97316",
            fillOpacity: 0.75,
            strokeStyle: "#111827",
            strokeWidth: 3 * r.dpr,
          }),

          new Triangle(
            w * 0.65,
            h * 0.10,
            w * 0.82,
            h * 0.24,
            w * 0.58,
            h * 0.30,
            {
              fillStyle: "#22C55E",
              fillOpacity: 0.7,
              strokeStyle: "#052E16",
              strokeWidth: 3 * r.dpr,
            }
          ),

          new QuadraticBezier(
            w * 0.12,
            h * 0.52,
            w * 0.26,
            h * 0.30,
            w * 0.40,
            h * 0.52,
            {
              strokeStyle: "#88ff00",
              strokeWidth: 4 * r.dpr,
              segments: 80,
            }
          ),

          new CubicBezier(
            w * 0.48,
            h * 0.52,
            w * 0.56,
            h * 0.25,
            w * 0.72,
            h * 0.78,
            w * 0.86,
            h * 0.50,
            {
              strokeStyle: "#DC2626",
              strokeWidth: 4 * r.dpr,
              segments: 100,
            }
          ),

          new PathBezier(
            [
              { x: w * 0.20, y: h * 0.80 },
              { x: w * 0.28, y: h * 0.66 },
              { x: w * 0.40, y: h * 0.86 },
              { x: w * 0.52, y: h * 0.70 },
              { x: w * 0.64, y: h * 0.84 },
              { x: w * 0.78, y: h * 0.68 },
              { x: w * 0.88, y: h * 0.82 },
            ],
            "catmull",
            false,
            {
              strokeStyle: "#7C3AED",
              strokeWidth: 5 * r.dpr,
              segments: 32,
            }
          ),

          new PathBezier(
            [
              { x: w * 0.78, y: h * 0.34 },
              { x: w * 0.90, y: h * 0.40 },
              { x: w * 0.84, y: h * 0.56 },
              { x: w * 0.70, y: h * 0.52 },
              { x: w * 0.68, y: h * 0.38 },
            ],
            "catmull",
            true,
            {
              strokeStyle: "#b700ff",
              strokeWidth: 4 * r.dpr,
              segments: 32,
            }
          ),

          new Line(w * 0.10, h * 0.38, w * 0.38, h * 0.42, {
            strokeStyle: "#DC2626",
            strokeWidth: 1,
            strokeOpacity: 1,
          }),
        ];

        for (const shape of shapes) {
          shape.drawRaster(r);
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
    <div ref={containerRef} className="h-full w-full">
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}

export default CanvasScene;