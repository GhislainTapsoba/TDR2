export interface TaskCreationData {
  title: string;
  stageId: string;
  projectId: string;
  assignedTo?: string;
  description?: string;
  dueDate?: Date;
}

export interface TaskRepository {
  createMany(tasks: TaskCreationData[]): Promise<void>;
}
