import { TaskRepository } from "../../../core/ports/TaskRepository"

export class SupabaseTaskRepository implements TaskRepository {
  async createMany(tasks: any[]) {
    // TODO: implement
  }

  async findById(id: string) {
    // TODO: implement
    return null
  }

  async save(task: any) {
    // TODO: implement
  }
}
