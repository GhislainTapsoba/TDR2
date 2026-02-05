import { Tasks } from "../domain/Tasks";

export class TasksRepository {
  private data: Tasks[] = [];

  async create(entity: Tasks): Promise<Tasks> {
    this.data.push(entity);
    return entity;
  }

  async findById(id: string): Promise<Tasks | null> {
    return this.data.find((e) => e.id === id) || null;
  }

  async findAll(): Promise<Tasks[]> {
    return this.data;
  }

  async update(entity: Tasks): Promise<Tasks> {
    const index = this.data.findIndex((e) => e.id === entity.id);
    if (index === -1) throw new Error("Tasks not found");
    this.data[index] = entity;
    return entity;
  }

  async delete(id: string): Promise<void> {
    this.data = this.data.filter((e) => e.id !== id);
  }
}
