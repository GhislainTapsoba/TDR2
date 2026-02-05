import { UserSettings } from "../domain/UserSettings";
import { UserSettingsRepository } from "../repositories/UserSettingsRepository";

export class UserSettingsUseCase {
  constructor(private repo: UserSettingsRepository) {}

  async create(entity: UserSettings) {
    return this.repo.create(entity);
  }

  async update(entity: UserSettings) {
    return this.repo.update(entity);
  }

  async findById(id: string) {
    return this.repo.findById(id);
  }

  async findAll() {
    return this.repo.findAll();
  }

  
}
