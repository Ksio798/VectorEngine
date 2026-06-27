import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  createEmptyProject,
  loadProjectIndex,
  saveProject,
  type ProjectIndexItem,
} from "../lib/projectStorage";

function Gallery() {
  const [projects, setProjects] = useState<ProjectIndexItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshProjects = async () => {
    setLoading(true);

    try {
      const index = await loadProjectIndex();
      setProjects(index);
    } finally {
      setLoading(false);
    }
  };

  const addProject = async () => {
    const id = String(Date.now());
    const project = createEmptyProject(id, `Проект ${projects.length + 1}`);

    const savedProject = await saveProject(project);

    await refreshProjects();

    return savedProject;
  };

  useEffect(() => {
    refreshProjects();
  }, []);

  return (
    <motion.main
      className="min-h-screen bg-slate-950 p-8 text-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Галерея проектов</h1>
          <p className="text-slate-400">
            Создавайте и открывайте проекты VectorEngine
          </p>
        </div>

        <button
          onClick={addProject}
          className="rounded bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-500"
        >
          Создать проект
        </button>
      </div>

      {loading ? (
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-8 text-center text-slate-400">
          Загрузка проектов...
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-8 text-center text-slate-400">
          Проектов пока нет. Нажмите «Создать проект».
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {projects.map((project) => (
            <Link key={project.id} to={`/editor/${project.id}`}>
              <motion.article
                whileHover={{ y: -6 }}
                className="rounded-lg border border-slate-800 bg-slate-900 p-6 transition hover:bg-slate-800"
              >
                <h2 className="text-xl font-semibold">{project.name}</h2>

                <p className="mt-2 text-sm text-slate-400">
                  Создан: {new Date(project.createdAt).toLocaleString()}
                </p>

                <p className="mt-1 text-sm text-slate-400">
                  Изменён: {new Date(project.updatedAt).toLocaleString()}
                </p>
              </motion.article>
            </Link>
          ))}
        </div>
      )}
    </motion.main>
  );
}

export default Gallery;