import { Users } from "../domain/Users";

export class UsersRepository {
  private data: Users[] = [];

  async create(entity: Users): Promise<Users> {
    this.data.push(entity);
    return entity;
  }

  async findById(id: string): Promise<Users | null> {
    return this.data.find((e) => e.id === id) || null;
  }

  async findAll(): Promise<Users[]> {
    return this.data;
  }

  async update(entity: Users): Promise<Users> {
    const index = this.data.findIndex((e) => e.id === entity.id);
    if (index === -1) throw new Error("Users not found");
    this.data[index] = entity;
    return entity;
  }

  async delete(id: string): Promise<void> {
    this.data = this.data.filter((e) => e.id !== id);
  }
}
