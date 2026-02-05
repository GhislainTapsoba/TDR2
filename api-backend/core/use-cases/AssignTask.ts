import { TaskRepository } from "../ports/TaskRepository"

export class AssignTask {
  constructor(private repo: TaskRepository) {}

  async execute(taskId: string, userId: string) {
    const task = await this.repo.findById(taskId)
    if (!task) throw new Error("Task not found")

    task.assign(userId)
    await this.repo.save(task)
  }
}
