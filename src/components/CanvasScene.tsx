import { useEffect, useRef } from "react";
import { RasterRenderer, type LineAlg } from "../lib/raster/RasterRenderer";
import { Line, Oval, Rect, type Shape } from "../lib/shapes";

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
          new Rect(w * 0.22, h * 0.24, w * 0.25, h * 0.18, {
            fillStyle: "#2563EB",
            fillOpacity: 0.85,
            strokeStyle: "#0F172A",
            strokeWidth: 4 * r.dpr,
            strokeOpacity: 1,
          }),

          new Rect(w * 0.42, h * 0.42, w * 0.22, h * 0.16, {
            fillStyle: "#22C55E",
            fillOpacity: 0.8,
            strokeStyle: "#052E16",
            strokeWidth: 4 * r.dpr,
            strokeOpacity: 1,
            transform: {
              rotation: Math.PI / 8,
            },
          }),

          new Oval(w * 0.72, h * 0.28, 90 * r.dpr, 55 * r.dpr, {
            fillStyle: "#F97316",
            fillOpacity: 0.9,
            strokeStyle: "#111827",
            strokeWidth: 4 * r.dpr,
            strokeOpacity: 1,
          }),

          new Oval(w * 0.30, h * 0.70, 95 * r.dpr, 70 * r.dpr, {
            fillStyle: "#EF4444",
            fillOpacity: 0.5,
            strokeStyle: "#7F1D1D",
            strokeWidth: 4 * r.dpr,
            strokeOpacity: 1,
          }),

          new Line(w * 0.52, h * 0.66, w * 0.88, h * 0.82, {
            strokeStyle: "#111827",
            strokeWidth: 18 * r.dpr,
            strokeOpacity: 1,
          }),

          new Line(w * 0.52, h * 0.20, w * 0.92, h * 0.54, {
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