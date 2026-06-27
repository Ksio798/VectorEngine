import { useEffect, useRef } from "react";
import {
  RasterRenderer,
  type LineAlg,
  type RGBA,
} from "../lib/raster/RasterRenderer";

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

        const red: RGBA = { r: 255, g: 0, b: 0, a: 255 };
        const black: RGBA = { r: 0, g: 0, b: 0, a: 255 };
        const blue: RGBA = { r: 40, g: 110, b: 255, a: 255 };
        const green: RGBA = { r: 30, g: 190, b: 110, a: 255 };
        const orange: RGBA = { r: 255, g: 140, b: 0, a: 255 };
        const transparentRed: RGBA = { r: 255, g: 0, b: 0, a: 130 };

        // 1. Закрашенный многоугольник
        const polygon = [
          { x: w * 0.12, y: h * 0.15 },
          { x: w * 0.45, y: h * 0.12 },
          { x: w * 0.38, y: h * 0.42 },
          { x: w * 0.16, y: h * 0.38 },
        ];

        r.fillPolygon(polygon, green);
        r.strokePolygon(polygon, black, 4 * r.dpr);

        // 2. Окружность
        r.fillCircle(w * 0.72, h * 0.28, 70 * r.dpr, orange);
        r.strokeLine(
          w * 0.72 - 90 * r.dpr,
          h * 0.28,
          w * 0.72 + 90 * r.dpr,
          h * 0.28,
          black,
          3 * r.dpr
        );

        // 3. Проверка прозрачности: синий квадрат + полупрозрачный красный круг
        const square = [
          { x: w * 0.12, y: h * 0.58 },
          { x: w * 0.34, y: h * 0.58 },
          { x: w * 0.34, y: h * 0.82 },
          { x: w * 0.12, y: h * 0.82 },
        ];

        r.fillPolygon(square, blue);
        r.fillCircle(w * 0.32, h * 0.70, 80 * r.dpr, transparentRed);

        // 4. Толстая ломаная линия
        const polyline = [
          { x: w * 0.52, y: h * 0.62 },
          { x: w * 0.62, y: h * 0.78 },
          { x: w * 0.75, y: h * 0.60 },
          { x: w * 0.88, y: h * 0.82 },
        ];

        for (let i = 0; i < polyline.length - 1; i++) {
          const a = polyline[i];
          const b = polyline[i + 1];

          r.strokeLine(a.x, a.y, b.x, b.y, black, 18 * r.dpr);
        }

        // 5. Линия для сравнения Брезенхема и Ву
        for (let offset = -2; offset <= 2; offset++) {
        r.drawLine(
            w * 0.52,
            h * 0.45 + offset * r.dpr,
            w * 0.90,
            h * 0.53 + offset * r.dpr,
            red
        );
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