// core/domain/Project.ts
export type ProjectStatus = 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELED';

export class Project {
  constructor(
    public id: string,
    public title: string,
    public description: string | null,
    public start_date: Date | null,
    public end_date: Date | null,
    public due_date: Date | null,
    public status: ProjectStatus | null,
    public created_by_id: string | null,
    public manager_id: string | null,
    public created_at: Date | null,
    public updated_at: Date | null
  ) {}
}
