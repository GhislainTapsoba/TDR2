import { Projects } from "../domain/Projects";
import { ProjectsRepository } from "../repositories/ProjectsRepository";

export class ProjectsUseCase {
  constructor(private repo: ProjectsRepository) {}

  async create(entity: Projects) {
    return this.repo.create(entity);
  }

  async update(entity: Projects) {
    return this.repo.update(entity);
  }

  async findById(id: string) {
    return this.repo.findById(id);
  }

  async findAll() {
    return this.repo.findAll();
  }

  
}
