export class Tasks {
  constructor(
    public id: string,
    public title: string,
    public description: string | null,
    public status: 'TODO'|'IN_PROGRESS'|'DONE' | null,
    public priority: 'LOW'|'MEDIUM'|'HIGH' | null,
    public due_date: Date | null,
    public completed_at: Date | null,
    public project_id: string,
    public stage_id: string | null,
    public created_by_id: string | null,
    public updated_at: Date | null,
    public refusal_reason: string | null,
  ) {}
}