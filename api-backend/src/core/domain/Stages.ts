export class Stages {
  constructor(
    public id: string,
    public name: string,
    public description: string | null,
    public position: number,
    public duration: number | null,
    public status: 'PENDING'|'IN_PROGRESS'|'VALIDATED'|'CLOSED' | null,
    public project_id: string,
    public created_by_id: string | null,
    public created_at: Date | null,
    public updated_at: Date | null,
  ) {}
}