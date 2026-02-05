// core/domain/Stage.ts
export type StageStatus = 'PENDING' | 'IN_PROGRESS' | 'VALIDATED' | 'CLOSED';

export class Stage {
  constructor(
    public id: string,
    public name: string,
    public description: string | null,
    public position: number,
    public duration: number | null,
    public status: StageStatus,
    public project_id: string,
    public created_by_id: string | null,
    public created_at: Date | null,
    public updated_at: Date | null
  ) {}

  validate() {
    if (this.status === 'VALIDATED' || this.status === 'CLOSED') {
      throw new Error(`Stage "${this.name}" already validated or closed`);
    }
    this.status = 'VALIDATED';
    this.updated_at = new Date();
  }
}
