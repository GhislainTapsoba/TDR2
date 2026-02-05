import { Stages } from "../domain/Stages";
import { StagesRepository } from "../repositories/StagesRepository";

export class StagesUseCase {
  constructor(private repo: StagesRepository) {}

  async create(entity: Stages) {
    return this.repo.create(entity);
  }

  async update(entity: Stages) {
    return this.repo.update(entity);
  }

  async findById(id: string) {
    return this.repo.findById(id);
  }

  async findAll() {
    return this.repo.findAll();
  }

  
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
  }
}
