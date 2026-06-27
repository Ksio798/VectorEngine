import { useEffect, useState, type ElementType } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Save,
  MousePointer2,
  Square,
  Circle,
  Minus,
  Triangle,
  PenTool,
} from "lucide-react";
import { motion } from "framer-motion";
import CanvasScene, {
  type SceneCommand,
  type SceneCreationStyle,
  type ScenePanelState,
  type SceneSnapshot,
} from "../components/CanvasScene";
import {
  createEmptyProject,
  loadProject,
  saveProject,
  type VectorProject,
} from "../lib/projectStorage";
import type { LineAlg } from "../lib/raster/RasterRenderer";
import type { EditorTool } from "../lib/editor/toolTypes";

type Tool = {
  id: EditorTool;
  name: string;
  icon: ElementType;
  short?: string;
};

const tools: Tool[] = [
  { id: "select", name: "Выбор", icon: MousePointer2 },
  { id: "rect", name: "Прямоугольник", icon: Square },
  { id: "oval", name: "Овал", icon: Circle },
  { id: "line", name: "Линия", icon: Minus },
  { id: "triangle", name: "Треугольник", icon: Triangle },
  { id: "quadratic", name: "Квадратичная Безье", icon: PenTool, short: "Q" },
  { id: "cubic", name: "Кубическая Безье", icon: PenTool, short: "C" },
  { id: "path", name: "PathBezier", icon: PenTool, short: "P" },
];

const emptyPanelState: ScenePanelState = {
  selectedId: null,
  selectedName: null,
  selectedKind: null,
  canFill: false,
  canClosePath: false,
  pathClosed: false,
  fillStyle: "#2563EB",
  fillOpacity: 0.75,
  strokeStyle: "#0F172A",
  strokeOpacity: 1,
  strokeWidth: 3,
  layers: [],
};

const defaultCreationStyle: SceneCreationStyle = {
  fillStyle: "#2563EB",
  fillOpacity: 0.75,
  strokeStyle: "#0F172A",
  strokeOpacity: 1,
  strokeWidth: 3,
};

type SceneCommandInput =
  | {
      type: "select";
      shapeId: string;
    }
  | {
      type: "deleteSelected";
    }
  | {
      type: "moveLayer";
      direction: 1 | -1;
    }
  | {
      type: "setStrokeStyle";
      value: string;
    }
  | {
      type: "setFillStyle";
      value: string;
    }
  | {
      type: "setStrokeWidth";
      value: number;
    }
  | {
      type: "setFillOpacity";
      value: number;
    }
  | {
      type: "setStrokeOpacity";
      value: number;
    }
  | {
      type: "setPathClosed";
      value: boolean;
    }
  | {
      type: "addPathPoint";
    }
  | {
      type: "removePathPoint";
    };

function Editor() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [activeTool, setActiveTool] = useState<EditorTool>("select");
  const [lineAlg, setLineAlg] = useState<LineAlg>("bresenham");
  const [creationStyle, setCreationStyle] = useState<SceneCreationStyle>(defaultCreationStyle);

  const [panelState, setPanelState] =
    useState<ScenePanelState>(emptyPanelState);

  const [currentProject, setCurrentProject] = useState<VectorProject | null>(null);
  const [initialShapes, setInitialShapes] = useState<VectorProject["shapes"] | null>(null);
  const [sceneSnapshot, setSceneSnapshot] = useState<SceneSnapshot>({shapes: [],});
  const [saveStatus, setSaveStatus] = useState<string>("");

  const [sceneCommand, setSceneCommand] = useState<SceneCommand | null>(null);
  const [, setCommandId] = useState(0);

  const projectId = id ?? "new";

  useEffect(() => {
    let cancelled = false;

    async function loadCurrentProject() {
      const loadedProject = await loadProject(projectId);

      if (cancelled) {
        return;
      }

      if (loadedProject) {
        setCurrentProject(loadedProject);
        setLineAlg(loadedProject.lineAlg);
        setCreationStyle(loadedProject.creationStyle);
        setInitialShapes(loadedProject.shapes);
      } else {
        const emptyProject = createEmptyProject(projectId);

        setCurrentProject(emptyProject);
        setInitialShapes([]);
      }
    }

    loadCurrentProject();

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const sendSceneCommand = (command: SceneCommandInput) => {
    setCommandId((prev) => {
      const nextId = prev + 1;

      setSceneCommand({
        id: nextId,
        ...command,
      } as SceneCommand);

      return nextId;
    });
  };

  const handleSaveProject = async () => {
    if (!currentProject) {
      return;
    }

    const projectToSave: VectorProject = {
      ...currentProject,
      lineAlg,
      creationStyle,
      shapes: sceneSnapshot.shapes,
    };

    try {
      const saved = await saveProject(projectToSave);

      setCurrentProject(saved);
      setSaveStatus("Проект сохранён");

      setTimeout(() => {
        setSaveStatus("");
      }, 2000);
    } catch (error) {
      console.error(error);
      setSaveStatus("Ошибка сохранения");
    }
  };

  const selectedExists = Boolean(panelState.selectedId);

const shownStrokeStyle = selectedExists
  ? panelState.strokeStyle
  : creationStyle.strokeStyle;

const shownStrokeOpacity = selectedExists
  ? panelState.strokeOpacity
  : creationStyle.strokeOpacity;

const shownStrokeWidth = selectedExists
  ? panelState.strokeWidth
  : creationStyle.strokeWidth;

const shownFillStyle =
  selectedExists && panelState.canFill
    ? panelState.fillStyle
    : creationStyle.fillStyle;

const shownFillOpacity =
  selectedExists && panelState.canFill
    ? panelState.fillOpacity
    : creationStyle.fillOpacity;

const updateStrokeStyle = (value: string) => {
  setCreationStyle((prev) => ({
    ...prev,
    strokeStyle: value,
  }));

  if (panelState.selectedId) {
    sendSceneCommand({
      type: "setStrokeStyle",
      value,
    });
  }
};

const updateStrokeOpacity = (value: number) => {
  setCreationStyle((prev) => ({
    ...prev,
    strokeOpacity: value,
  }));

  if (panelState.selectedId) {
    sendSceneCommand({
      type: "setStrokeOpacity",
      value,
    });
  }
};

const updateStrokeWidth = (value: number) => {
  const nextValue = Math.max(1, value);

  setCreationStyle((prev) => ({
    ...prev,
    strokeWidth: nextValue,
  }));

  if (panelState.selectedId) {
    sendSceneCommand({
      type: "setStrokeWidth",
      value: nextValue,
    });
  }
};

const updateFillStyle = (value: string) => {
  setCreationStyle((prev) => ({
    ...prev,
    fillStyle: value,
  }));

  if (panelState.selectedId && panelState.canFill) {
    sendSceneCommand({
      type: "setFillStyle",
      value,
    });
  }
};

const updateFillOpacity = (value: number) => {
  setCreationStyle((prev) => ({
    ...prev,
    fillOpacity: value,
  }));

  if (panelState.selectedId && panelState.canFill) {
    sendSceneCommand({
      type: "setFillOpacity",
      value,
    });
  }
};

  return (
    <motion.div
      className="flex h-screen flex-col bg-slate-950 text-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <header className="flex h-14 items-center justify-between border-b border-slate-800 bg-slate-900 px-4">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 rounded bg-slate-800 px-3 py-2 transition hover:bg-slate-700"
        >
          <ArrowLeft size={18} />
          Назад
        </button>

        <h1 className="text-base font-semibold">
          Редактирование проекта №{projectId}
        </h1>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setLineAlg("bresenham")}
            className={`rounded px-3 py-2 text-sm transition ${
              lineAlg === "bresenham"
                ? "bg-blue-600 text-white"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            Брезенхем
          </button>

          <button
            onClick={() => setLineAlg("wu")}
            className={`rounded px-3 py-2 text-sm transition ${
              lineAlg === "wu"
                ? "bg-blue-600 text-white"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            Ву
          </button>

          <button onClick={handleSaveProject} className="flex items-center gap-2 rounded bg-blue-600 px-3 py-2 transition hover:bg-blue-500">
            <Save size={18} />
            Сохранить
          </button>

          {saveStatus && (
          <span className="text-sm text-slate-300">{saveStatus}</span>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="flex w-24 flex-col items-center gap-3 overflow-y-auto border-r border-slate-800 bg-slate-900 py-4">
          {tools.map((tool) => {
            const Icon = tool.icon;
            const isActive = activeTool === tool.id;

            return (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id)}
                title={tool.name}
                className={`flex h-14 w-16 flex-col items-center justify-center rounded transition ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "bg-white text-slate-900 hover:bg-slate-200 hover:text-blue-600"
                }`}
              >
                <div className="relative">
                  <Icon size={20} />

                  {tool.short && (
                    <span className="absolute -right-3 -top-2 rounded bg-slate-900 px-1 text-[10px] font-bold text-white">
                      {tool.short}
                    </span>
                  )}
                </div>

                <span className="mt-1 max-w-full truncate px-1 text-[10px]">
                  {tool.name}
                </span>
              </button>
            );
          })}
        </aside>

        <main className="flex flex-1 items-center justify-center overflow-hidden bg-slate-100 p-8">
          <div className="h-full w-full overflow-hidden rounded border border-slate-300 bg-white shadow-2xl">
            <CanvasScene
              lineAlg={lineAlg}
              activeTool={activeTool}
              creationStyle={creationStyle}
              initialShapes={initialShapes}
              onToolChange={setActiveTool}
              onSceneStateChange={setPanelState}
              onSceneSnapshotChange={setSceneSnapshot}
              sceneCommand={sceneCommand}
              onCommandHandled={() => setSceneCommand(null)}
            />
          </div>
        </main>

        <aside className="w-72 overflow-y-auto border-l border-slate-800 bg-slate-900 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Свойства
          </h2>

          <div className="mt-6 space-y-6">
            <section>
              <h3 className="mb-2 text-sm font-medium">Активный инструмент</h3>
              <p className="text-sm text-slate-400">
                {tools.find((tool) => tool.id === activeTool)?.name}
              </p>
            </section>

            <section className="border-t border-slate-800 pt-4">
              <h3 className="mb-3 text-sm font-medium">Выбранный объект</h3>

              {panelState.selectedId ? (
                <div className="space-y-3">
                  <p className="rounded bg-slate-800 px-3 py-2 text-sm text-slate-200">
                    {panelState.selectedName}
                  </p>

                  {panelState.canClosePath && (
                    <label className="flex items-center gap-2 rounded bg-slate-800 px-3 py-2 text-sm text-slate-200">
                      <input
                        type="checkbox"
                        checked={panelState.pathClosed}
                        onChange={(event) =>
                          sendSceneCommand({
                            type: "setPathClosed",
                            value: event.target.checked,
                          })
                        }
                      />
                      Замкнуть кривую
                    </label>
                  )}

                  {panelState.canClosePath && (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() =>
                          sendSceneCommand({
                            type: "addPathPoint",
                          })
                        }
                        className="rounded bg-purple-600 px-2 py-1 text-xs hover:bg-purple-500"
                      >
                        + точка
                      </button>

                      <button
                        onClick={() =>
                          sendSceneCommand({
                            type: "removePathPoint",
                          })
                        }
                        className="rounded bg-purple-600 px-2 py-1 text-xs hover:bg-purple-500"
                      >
                        − точка
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() =>
                        sendSceneCommand({
                          type: "moveLayer",
                          direction: 1,
                        })
                      }
                      className="rounded bg-blue-600 px-2 py-1 text-sm hover:bg-blue-500"
                    >
                      Выше
                    </button>

                    <button
                      onClick={() =>
                        sendSceneCommand({
                          type: "moveLayer",
                          direction: -1,
                        })
                      }
                      className="rounded bg-blue-600 px-2 py-1 text-sm hover:bg-blue-500"
                    >
                      Ниже
                    </button>
                  </div>

                  <button
                    onClick={() =>
                      sendSceneCommand({
                        type: "deleteSelected",
                      })
                    }
                    className="w-full rounded bg-red-600 px-2 py-2 text-sm hover:bg-red-500"
                  >
                    Удалить объект
                  </button>
                </div>
              ) : (
                <p className="text-sm text-slate-400">
                  Ничего не выбрано
                </p>
              )}
            </section>

            <section className="border-t border-slate-800 pt-4">
              <h3 className="mb-3 text-sm font-medium">Цвета и прозрачность</h3>

              <div className="space-y-4">
                <label className="block text-sm">
                  <span className="mb-1 block text-slate-400">
                    Цвет линии / обводки
                  </span>
                  <input
                    type="color"
                    value={shownStrokeStyle}
                    onChange={(event) => updateStrokeStyle(event.target.value)}
                    className="h-9 w-full cursor-pointer rounded bg-slate-800"
                  />
                </label>

                <label className="block text-sm">
                  <span className="mb-1 flex justify-between text-slate-400">
                    <span>Прозрачность линии</span>
                    <span>{Math.round(shownStrokeOpacity * 100)}%</span>
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(shownStrokeOpacity * 100)}
                    onChange={(event) =>
                      updateStrokeOpacity(Number(event.target.value) / 100)
                    }
                    className="w-full"
                  />
                </label>

                <label className="block text-sm">
                  <span className="mb-1 block text-slate-400">Толщина линии</span>
                  <input
                    type="number"
                    min={1}
                    max={80}
                    value={Math.round(shownStrokeWidth)}
                    onChange={(event) =>
                      updateStrokeWidth(Number(event.target.value))
                    }
                    className="w-full rounded bg-slate-800 px-3 py-2 text-white outline-none"
                  />
                </label>

                <label className="block text-sm">
                  <span className="mb-1 block text-slate-400">Цвет заливки</span>
                  <input
                    type="color"
                    value={shownFillStyle}
                    onChange={(event) => updateFillStyle(event.target.value)}
                    className="h-9 w-full cursor-pointer rounded bg-slate-800"
                  />
                </label>

                <label className="block text-sm">
                  <span className="mb-1 flex justify-between text-slate-400">
                    <span>Прозрачность заливки</span>
                    <span>{Math.round(shownFillOpacity * 100)}%</span>
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(shownFillOpacity * 100)}
                    onChange={(event) =>
                      updateFillOpacity(Number(event.target.value) / 100)
                    }
                    className="w-full"
                  />
                </label>

                {panelState.selectedId && !panelState.canFill && (
                  <p className="rounded bg-slate-800 px-3 py-2 text-xs text-slate-400">
                    Заливка применяется только к прямоугольнику, овалу и треугольнику.
                    Для линий и кривых используется цвет линии.
                  </p>
                )}
              </div>
            </section>  
            <section className="border-t border-slate-800 pt-4">
              <h3 className="mb-3 text-sm font-medium">Слои</h3>

              {panelState.layers.length > 0 ? (
                <div className="max-h-72 space-y-1 overflow-auto">
                  {panelState.layers
                    .slice()
                    .reverse()
                    .map((layer) => {
                      const isSelected = layer.id === panelState.selectedId;

                      return (
                        <button
                          key={layer.id}
                          onClick={() =>
                            sendSceneCommand({
                              type: "select",
                              shapeId: layer.id,
                            })
                          }
                          className={`w-full rounded px-2 py-1 text-left text-sm transition ${
                            isSelected
                              ? "bg-blue-600 text-white"
                              : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                          }`}
                        >
                          <span className="mr-2 text-xs text-slate-400">
                            {layer.index + 1}
                          </span>
                          {layer.name}
                        </button>
                      );
                    })}
                </div>
              ) : (
                <p className="text-sm text-slate-400">
                  На холсте пока нет объектов
                </p>
              )}
            </section>

            <section className="border-t border-slate-800 pt-4">
              <h3 className="mb-2 text-sm font-medium">Подсказка</h3>
              <p className="text-sm text-slate-400">
                Выбери инструмент слева, зажми мышь на холсте и протяни, чтобы
                задать размер фигуры.
              </p>
            </section>
          </div>
        </aside>
      </div>
    </motion.div>
  );
}

export default Editor;