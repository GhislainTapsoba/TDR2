import { Projects } from "../domain/Projects";

export class ProjectsRepository {
  private data: Projects[] = [];

  async create(entity: Projects): Promise<Projects> {
    this.data.push(entity);
    return entity;
  }

  async findById(id: string): Promise<Projects | null> {
    return this.data.find((e) => e.id === id) || null;
  }

  async findAll(): Promise<Projects[]> {
    return this.data;
  }

  async update(entity: Projects): Promise<Projects> {
    const index = this.data.findIndex((e) => e.id === entity.id);
    if (index === -1) throw new Error("Projects not found");
    this.data[index] = entity;
    return entity;
  }

  async delete(id: string): Promise<void> {
    this.data = this.data.filter((e) => e.id !== id);
  }
}
