import {
  BaseDirectory,
  exists,
  mkdir,
  readTextFile,
  writeTextFile,
} from "@tauri-apps/plugin-fs";
import type { LineAlg } from "./raster/RasterRenderer";
import type { ShapeJSON } from "./shapes";

const PROJECTS_DIR = "VectorEngine/projects";
const INDEX_FILE = `${PROJECTS_DIR}/index.json`;

export type ProjectCreationStyle = {
  fillStyle: string;
  fillOpacity: number;
  strokeStyle: string;
  strokeOpacity: number;
  strokeWidth: number;
};

export type VectorProject = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  lineAlg: LineAlg;
  creationStyle: ProjectCreationStyle;
  shapes: ShapeJSON[];
};

export type ProjectIndexItem = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

async function ensureProjectsDir() {
  const dirExists = await exists(PROJECTS_DIR, {
    baseDir: BaseDirectory.Document,
  });

  if (!dirExists) {
    await mkdir(PROJECTS_DIR, {
      baseDir: BaseDirectory.Document,
      recursive: true,
    });
  }
}

function getProjectFilePath(projectId: string): string {
  return `${PROJECTS_DIR}/${projectId}.json`;
}

export async function loadProjectIndex(): Promise<ProjectIndexItem[]> {
  await ensureProjectsDir();

  const indexExists = await exists(INDEX_FILE, {
    baseDir: BaseDirectory.Document,
  });

  if (!indexExists) {
    await writeTextFile(INDEX_FILE, JSON.stringify([], null, 2), {
      baseDir: BaseDirectory.Document,
    });

    return [];
  }

  const text = await readTextFile(INDEX_FILE, {
    baseDir: BaseDirectory.Document,
  });

  try {
    const parsed = JSON.parse(text);

    if (Array.isArray(parsed)) {
      return parsed;
    }

    return [];
  } catch {
    return [];
  }
}

async function saveProjectIndex(index: ProjectIndexItem[]) {
  await ensureProjectsDir();

  await writeTextFile(INDEX_FILE, JSON.stringify(index, null, 2), {
    baseDir: BaseDirectory.Document,
  });
}

export async function saveProject(project: VectorProject) {
  await ensureProjectsDir();

  const now = new Date().toISOString();

  const projectToSave: VectorProject = {
    ...project,
    updatedAt: now,
  };

  await writeTextFile(
    getProjectFilePath(project.id),
    JSON.stringify(projectToSave, null, 2),
    {
      baseDir: BaseDirectory.Document,
    }
  );

  const index = await loadProjectIndex();

  const nextIndexItem: ProjectIndexItem = {
    id: projectToSave.id,
    name: projectToSave.name,
    createdAt: projectToSave.createdAt,
    updatedAt: projectToSave.updatedAt,
  };

  const existingIndex = index.findIndex((item) => item.id === projectToSave.id);

  if (existingIndex >= 0) {
    index[existingIndex] = nextIndexItem;
  } else {
    index.push(nextIndexItem);
  }

  index.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  await saveProjectIndex(index);

  return projectToSave;
}

export async function loadProject(projectId: string): Promise<VectorProject | null> {
  await ensureProjectsDir();

  const filePath = getProjectFilePath(projectId);

  const projectExists = await exists(filePath, {
    baseDir: BaseDirectory.Document,
  });

  if (!projectExists) {
    return null;
  }

  const text = await readTextFile(filePath, {
    baseDir: BaseDirectory.Document,
  });

  try {
    return JSON.parse(text) as VectorProject;
  } catch {
    return null;
  }
}

export function createEmptyProject(projectId: string, name?: string): VectorProject {
  const now = new Date().toISOString();

  return {
    id: projectId,
    name: name ?? `Проект ${projectId}`,
    createdAt: now,
    updatedAt: now,
    lineAlg: "bresenham",
    creationStyle: {
      fillStyle: "#2563EB",
      fillOpacity: 0.75,
      strokeStyle: "#0F172A",
      strokeOpacity: 1,
      strokeWidth: 3,
    },
    shapes: [],
  };
}