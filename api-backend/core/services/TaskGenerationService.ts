import { TaskCreationData } from "@/core/ports/TaskRepository";

export class TaskGenerationService {
  generate(stage: { id: string, name: string, project_id: string }): TaskCreationData[] {
    return [
      {
        title: `Préparer les livrables de "${stage.name}"`,
        stageId: stage.id,
        projectId: stage.project_id,
        description: "Tâche générée automatiquement à la validation de l'étape"
      },
      {
        title: `Validation interne de "${stage.name}"`,
        stageId: stage.id,
        projectId: stage.project_id
      }
    ];
  }
}
