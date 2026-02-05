import fs from "fs";
import path from "path";

const root = process.cwd();
const src = path.join(root, "src");

type PageFolder = {
  [key: string]: string[];
};

type Structure = {
  pages: PageFolder;
  components: string[];
  hooks: string[];
  services: string[];
  context: string[];
  styles: string[];
  utils: string[];
  types: string[];
};

const structure: Structure = {
  pages: {
    projects: ["index.tsx", "create.tsx", "edit.tsx", "[id].tsx"],
    tasks: ["index.tsx", "create.tsx", "edit.tsx", "[id].tsx"],
    stages: ["index.tsx", "create.tsx", "edit.tsx", "[id].tsx"],
    users: ["index.tsx", "create.tsx", "edit.tsx", "[id].tsx"],
    "activity-logs": ["index.tsx"],
    settings: ["index.tsx"],
  },
  components: ["tables", "forms", "buttons", "modals", "layout"],
  hooks: [
    "useProjects.ts",
    "useTasks.ts",
    "useStages.ts",
    "useUsers.ts",
    "useActivityLogs.ts",
  ],
  services: [
    "api.ts",
    "projects.service.ts",
    "tasks.service.ts",
    "stages.service.ts",
    "users.service.ts",
    "activityLogs.service.ts",
  ],
  context: ["AuthContext.tsx", "ThemeContext.tsx"],
  styles: ["dashboard.css", "forms.css"],
  utils: ["formatDate.ts"],
  types: ["project.ts", "task.ts", "stage.ts", "user.ts"],
};

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function touch(filePath: string) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, "");
  }
}

// src/
ensureDir(src);

// pages/
const pagesDir = path.join(src, "pages");
ensureDir(pagesDir);

// pages/index.tsx
touch(path.join(pagesDir, "index.tsx"));

// pages CRUD
Object.entries(structure.pages).forEach(([folder, files]) => {
  const dir = path.join(pagesDir, folder);
  ensureDir(dir);

  files.forEach((file: string) => {
    touch(path.join(dir, file));
  });
});

// other folders
(
  ["components", "hooks", "services", "context", "styles", "utils", "types"] as const
).forEach((key) => {
  const baseDir = path.join(src, key);
  ensureDir(baseDir);

  structure[key].forEach((item: string) => {
    const target = path.join(baseDir, item);
    item.includes(".") ? touch(target) : ensureDir(target);
  });
});

console.log("✅ Frontend CRUD architecture generated successfully");
