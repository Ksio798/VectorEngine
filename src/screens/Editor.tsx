import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, MousePointer2, Square, Circle } from "lucide-react";
import { motion } from "framer-motion";
import CanvasScene from "../components/CanvasScene";
import type { LineAlg } from "../lib/raster/RasterRenderer";

type ToolId = "select" | "square" | "circle";

type Tool = {
  id: ToolId;
  name: string;
  icon: React.ElementType;
};

const tools: Tool[] = [
  {
    id: "select",
    name: "Выбор",
    icon: MousePointer2,
  },
  {
    id: "square",
    name: "Квадрат",
    icon: Square,
  },
  {
    id: "circle",
    name: "Круг",
    icon: Circle,
  },
];

function Editor() {
    const navigate = useNavigate();
    const { id } = useParams();

    const [activeTool, setActiveTool] = useState<ToolId>("select");
    const [lineAlg, setLineAlg] = useState<LineAlg>("bresenham");
    const projectId = id ?? "new";

  return (
    <motion.div className="h-screen flex flex-col bg-slate-950 text-white">
      {/* 1. Верхняя панель Toolbar */}
      <header className="h-14 border-b border-slate-800 bg-slate-900 flex items-center justify-between px-4">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 transition"
        >
          <ArrowLeft size={18} />
          Назад
        </button>

        <h1 className="text-base font-semibold">
          Редактирование проекта №{projectId}
        </h1>

        <button
            onClick={() => setLineAlg("bresenham")}
            className={`rounded px-3 py-2 text-sm transition ${
            lineAlg === "bresenham"
                ? "bg-blue-600 text-white"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}>
            Брезенхем
        </button>

        <button
            onClick={() => setLineAlg("wu")}
            className={`rounded px-3 py-2 text-sm transition ${
            lineAlg === "wu"
                ? "bg-blue-600 text-white"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}>
            Ву
        </button>
        
        <button className="flex items-center gap-2 px-3 py-2 rounded bg-blue-600 hover:bg-blue-500 transition">
          <Save size={18} />
          Сохранить
        </button>
      </header>

      <div className="flex flex-1">
        {/* 2. Левая панель Инструменты */}
        <aside className="w-16 border-r border-slate-800 bg-slate-900 flex flex-col items-center gap-3 py-4">
          {tools.map((tool) => {
            const Icon = tool.icon;
            const isActive = activeTool === tool.id;

            return (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id)}
                title={tool.name}
                className={`w-10 h-10 rounded flex items-center justify-center transition ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                <Icon size={20}
                className={isActive ? "text-white" : "text-slate-900"} />
              </button>
            );
          })}
        </aside>

        {/* 3. Центральная зона Холст */}
        <main className="flex-1 bg-slate-100 flex items-center justify-center p-8 overflow-hidden">
            <div className="h-full w-full rounded bg-white shadow-2xl border border-slate-300 overflow-hidden">
                <CanvasScene lineAlg={lineAlg} />
            </div>
        </main>

        {/* 4. Правая панель Свойства */}
        <aside className="w-64 border-l border-slate-800 bg-slate-900 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Свойства
          </h2>

          <div className="mt-6 space-y-6">
            <div>
              <h3 className="mb-2 text-sm font-medium">Размер</h3>
              <p className="text-sm text-slate-400">
                Здесь позже будут настройки размеров.
              </p>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-medium">Цвет</h3>
              <p className="text-sm text-slate-400">
                Здесь позже будут настройки цвета.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </motion.div>
  );
}

export default Editor;