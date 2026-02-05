import { TaskCreationData } from "@/core/ports/repositories/TaskRepository";

export class TaskGenerationService {
  generate(stage: { id: string, name: string, projectId: string }): TaskCreationData[] {
    return [
      {
        title: `Préparer les livrables de "${stage.name}"`,
        stageId: stage.id,
        projectId: stage.projectId,
        description: "Tâche générée automatiquement à la validation de l'étape"
      },
      {
        title: `Validation interne de "${stage.name}"`,
        stageId: stage.id,
        projectId: stage.projectId
      }
    ];
  }
}
