import { Users } from "../domain/Users";
import { UsersRepository } from "../repositories/UsersRepository";

export class UsersUseCase {
  constructor(private repo: UsersRepository) {}

  async create(entity: Users) {
    return this.repo.create(entity);
  }

  async update(entity: Users) {
    return this.repo.update(entity);
  }

  async findById(id: string) {
    return this.repo.findById(id);
  }

  async findAll() {
    return this.repo.findAll();
  }

  
}
