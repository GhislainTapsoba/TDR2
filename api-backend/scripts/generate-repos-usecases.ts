import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Racine src/core
const srcDir = path.join(__dirname, "../src/core");
const repoDir = path.join(srcDir, "repositories");
const usecaseDir = path.join(srcDir, "usecases");
const domainDir = path.join(srcDir, "domain");

// Crée les dossiers s'ils n'existent pas
[repoDir, usecaseDir].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Tables (Domain.ts)
const tables = ["stages", "projects", "tasks", "users", "user_settings"];
const toPascalCase = (str: string) =>
  str
    .split("_")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join("");

// Génération
tables.forEach((table) => {
  const className = toPascalCase(table);

  // Repository
  const repoContent = `import { ${className} } from "../domain/${className}";

export class ${className}Repository {
  private data: ${className}[] = [];

  async create(entity: ${className}): Promise<${className}> {
    this.data.push(entity);
    return entity;
  }

  async findById(id: string): Promise<${className} | null> {
    return this.data.find((e) => e.id === id) || null;
  }

  async findAll(): Promise<${className}[]> {
    return this.data;
  }

  async update(entity: ${className}): Promise<${className}> {
    const index = this.data.findIndex((e) => e.id === entity.id);
    if (index === -1) throw new Error("${className} not found");
    this.data[index] = entity;
    return entity;
  }

  async delete(id: string): Promise<void> {
    this.data = this.data.filter((e) => e.id !== id);
  }
}
`;
  fs.writeFileSync(path.join(repoDir, `${className}Repository.ts`), repoContent);
  console.log(`✅ Generated Repository: ${className}Repository.ts`);

  // UseCase
  const usecaseContent = `import { ${className} } from "../domain/${className}";
import { ${className}Repository } from "../repositories/${className}Repository";

export class ${className}UseCase {
  constructor(private repo: ${className}Repository) {}

  async create(entity: ${className}) {
    return this.repo.create(entity);
  }

  async update(entity: ${className}) {
    return this.repo.update(entity);
  }

  async findById(id: string) {
    return this.repo.findById(id);
  }

  async findAll() {
    return this.repo.findAll();
  }

  ${className === "Stages" ? `
  // Exemple métier spécifique : ValidateStage
  async validateStage(stageId: string) {
    const stage = await this.repo.findById(stageId);
    if (!stage) throw new Error("Stage not found");
    if (stage.status === "VALIDATED" || stage.status === "CLOSED") {
      throw new Error("Stage already validated or closed");
    }
    stage.status = "VALIDATED";
    stage.updated_at = new Date();
    return this.repo.update(stage);
  }` : ""}
}
`;
  fs.writeFileSync(path.join(usecaseDir, `${className}UseCase.ts`), usecaseContent);
  console.log(`✅ Generated UseCase: ${className}UseCase.ts`);
});
