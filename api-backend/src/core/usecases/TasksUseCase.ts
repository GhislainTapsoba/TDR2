import { Tasks } from "../domain/Tasks";
import { TasksRepository } from "../repositories/TasksRepository";

export class TasksUseCase {
  constructor(private repo: TasksRepository) {}

  async create(entity: Tasks) {
    return this.repo.create(entity);
  }

  async update(entity: Tasks) {
    return this.repo.update(entity);
  }

  async findById(id: string) {
    return this.repo.findById(id);
  }

  async findAll() {
    return this.repo.findAll();
  }

  
}
