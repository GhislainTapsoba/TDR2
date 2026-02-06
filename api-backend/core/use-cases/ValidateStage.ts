import { StageRepository } from "@/core/ports/stageRepository";
import { TaskRepository } from "@/core/ports/TaskRepository";
import { NotificationPort } from "@/core/ports/notificationRepository";
import { TaskGenerationService } from "@/core/services/TaskGenerationService";
import { Stage } from "@/core/domain/Stage";

export class ValidateStage {
  constructor(
    private stageRepo: StageRepository,
    private taskRepo: TaskRepository,
    private notification: NotificationPort,
    private taskGenerator: TaskGenerationService
  ) {}

  async execute(stageId: string, actorId: string) {
    const stage: Stage | null = await this.stageRepo.findById(stageId);
    if (!stage) throw new Error("Stage not found");

    // 1️⃣ Valider l'étape
    stage.validate();
    await this.stageRepo.save(stage);

    // 2️⃣ Générer les tâches automatiquement
    const tasks = this.taskGenerator.generate(stage);
    await this.taskRepo.createMany(tasks);

    // 3️⃣ Notifications
    await this.notification.notify({
      userId: actorId,
      title: `Étape "${stage.name}" validée`,
      message: `L'étape "${stage.name}" du projet ${stage.project_id} a été validée.`,
      actionUrl: `/projects/${stage.project_id}/stages/${stage.id}`
    });
  }
}
