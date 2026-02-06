// core/domain/Report.ts
export class Report {
  constructor(
    public id: string,
    public title: string,
    public description: string | null,
    public type: string | null,
    public data: any | null, // JSONB
    public created_by_id: string | null,
    public created_at: Date | null
  ) {}
}
