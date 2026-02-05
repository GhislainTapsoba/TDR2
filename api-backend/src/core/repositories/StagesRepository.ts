import { Stages } from "../domain/Stages";

export class StagesRepository {
  private data: Stages[] = [];

  async create(entity: Stages): Promise<Stages> {
    this.data.push(entity);
    return entity;
  }

  async findById(id: string): Promise<Stages | null> {
    return this.data.find((e) => e.id === id) || null;
  }

  async findAll(): Promise<Stages[]> {
    return this.data;
  }

  async update(entity: Stages): Promise<Stages> {
    const index = this.data.findIndex((e) => e.id === entity.id);
    if (index === -1) throw new Error("Stages not found");
    this.data[index] = entity;
    return entity;
  }

  async delete(id: string): Promise<void> {
    this.data = this.data.filter((e) => e.id !== id);
  }
}
