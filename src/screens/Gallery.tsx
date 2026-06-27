import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

type Project = {
  id: string;
  name: string;
  date: string;
};

function Gallery() {
  const [projects, setProjects] = useState<Project[]>([]);

  const addProject = () => {
    const newProject: Project = {
      id: String(Date.now()),
      name: `Проект ${projects.length + 1}`,
      date: new Date().toLocaleDateString(),
    };

    setProjects([...projects, newProject]);
  };

  return (
    <motion.main className="p-8" initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Галерея проектов</h1>
          <p className="text-slate-400">Создавайте и открывайте проекты VectorEngine</p>
        </div>

        <button
          onClick={addProject}
          className="rounded bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-500"
        >
          Создать проект
        </button>
      </div>

      {projects.length === 0 ? (
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
                  Дата создания: {project.date}
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