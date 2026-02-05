import { UserSettings } from "../domain/UserSettings";

export class UserSettingsRepository {
  private data: UserSettings[] = [];

  async create(entity: UserSettings): Promise<UserSettings> {
    this.data.push(entity);
    return entity;
  }

  async findById(id: string): Promise<UserSettings | null> {
    return this.data.find((e) => e.id === id) || null;
  }

  async findAll(): Promise<UserSettings[]> {
    return this.data;
  }

  async update(entity: UserSettings): Promise<UserSettings> {
    const index = this.data.findIndex((e) => e.id === entity.id);
    if (index === -1) throw new Error("UserSettings not found");
    this.data[index] = entity;
    return entity;
  }

  async delete(id: string): Promise<void> {
    this.data = this.data.filter((e) => e.id !== id);
  }
}
