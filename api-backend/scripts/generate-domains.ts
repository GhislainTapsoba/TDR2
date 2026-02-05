import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🔹 Racine du backend
const srcDir = path.join(__dirname, "../src/core");
const domainDir = path.join(srcDir, "domain");

if (!fs.existsSync(domainDir)) fs.mkdirSync(domainDir, { recursive: true });

// 🔹 Définition des tables et colonnes (d’après ta DB)
const tables: Record<string, { name: string; type: string; nullable: boolean }[]> = {
  stages: [
    { name: "id", type: "string", nullable: false },
    { name: "name", type: "string", nullable: false },
    { name: "description", type: "string", nullable: true },
    { name: "position", type: "number", nullable: false },
    { name: "duration", type: "number", nullable: true },
    { name: "status", type: "'PENDING'|'IN_PROGRESS'|'VALIDATED'|'CLOSED'", nullable: true },
    { name: "project_id", type: "string", nullable: false },
    { name: "created_by_id", type: "string", nullable: true },
    { name: "created_at", type: "Date", nullable: true },
    { name: "updated_at", type: "Date", nullable: true },
  ],
  projects: [
    { name: "id", type: "string", nullable: false },
    { name: "title", type: "string", nullable: false },
    { name: "description", type: "string", nullable: true },
    { name: "start_date", type: "Date", nullable: true },
    { name: "end_date", type: "Date", nullable: true },
    { name: "due_date", type: "Date", nullable: true },
    { name: "status", type: "'PLANNING'|'IN_PROGRESS'|'COMPLETED'", nullable: true },
    { name: "created_by_id", type: "string", nullable: true },
    { name: "manager_id", type: "string", nullable: true },
    { name: "created_at", type: "Date", nullable: true },
    { name: "updated_at", type: "Date", nullable: true },
  ],
  tasks: [
    { name: "id", type: "string", nullable: false },
    { name: "title", type: "string", nullable: false },
    { name: "description", type: "string", nullable: true },
    { name: "status", type: "'TODO'|'IN_PROGRESS'|'DONE'", nullable: true },
    { name: "priority", type: "'LOW'|'MEDIUM'|'HIGH'", nullable: true },
    { name: "due_date", type: "Date", nullable: true },
    { name: "completed_at", type: "Date", nullable: true },
    { name: "project_id", type: "string", nullable: false },
    { name: "stage_id", type: "string", nullable: true },
    { name: "created_by_id", type: "string", nullable: true },
    { name: "updated_at", type: "Date", nullable: true },
    { name: "refusal_reason", type: "string", nullable: true },
  ],
  users: [
    { name: "id", type: "string", nullable: false },
    { name: "email", type: "string", nullable: false },
    { name: "name", type: "string", nullable: true },
    { name: "role_id", type: "string", nullable: true },
    { name: "password", type: "string", nullable: true },
    { name: "role", type: "string", nullable: true },
    { name: "is_active", type: "boolean", nullable: true },
    { name: "phone", type: "string", nullable: true },
    { name: "created_at", type: "Date", nullable: true },
    { name: "updated_at", type: "Date", nullable: true },
  ],
  user_settings: [
    { name: "id", type: "string", nullable: false },
    { name: "user_id", type: "string", nullable: false },
    { name: "language", type: "string", nullable: true },
    { name: "timezone", type: "string", nullable: true },
    { name: "notifications_enabled", type: "boolean", nullable: true },
    { name: "email_notifications", type: "boolean", nullable: true },
    { name: "theme", type: "string", nullable: true },
    { name: "date_format", type: "string", nullable: true },
    { name: "items_per_page", type: "number", nullable: true },
    { name: "font_size", type: "string", nullable: true },
    { name: "compact_mode", type: "boolean", nullable: true },
    { name: "permissions", type: "any[]", nullable: true },
    { name: "created_at", type: "Date", nullable: true },
    { name: "updated_at", type: "Date", nullable: true },
  ],
};

// 🔹 Génération des Domain.ts
const toPascalCase = (str: string) =>
  str
    .split("_")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join("");

for (const [table, columns] of Object.entries(tables)) {
  const className = toPascalCase(table);
  const lines = [`export class ${className} {`, "  constructor("];
  for (const col of columns) {
    const nullable = col.nullable ? " | null" : "";
    lines.push(`    public ${col.name}: ${col.type}${nullable},`);
  }
  lines.push("  ) {}");
  lines.push("}");
  fs.writeFileSync(path.join(domainDir, `${className}.ts`), lines.join("\n"));
  console.log(`✅ Generated Domain: ${className}.ts`);
}
