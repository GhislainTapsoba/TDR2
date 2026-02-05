// core/domain/Task.ts
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'CANCELED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export class Task {
  constructor(
    public id: string,
    public title: string,
    public description: string | null,
    public status: TaskStatus,
    public priority: TaskPriority | null,
    public due_date: Date | null,
    public completed_at: Date | null,
    public project_id: string,
    public stage_id: string | null,
    public created_by_id: string | null,
    public created_at: Date | null,
    public updated_at: Date | null,
    public refusal_reason: string | null
  ) {}
}
