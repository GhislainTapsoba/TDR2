// core/domain/Activity_logs.ts
export class ActivityLog {
  constructor(
    public id: string,
    public user_id: string | null,
    public action: string,
    public entity_type: string | null,
    public entity_id: string | null,
    public details: any | null, // JSONB in SQL usually maps to 'any' or a specific interface/type
    public created_at: Date | null
  ) {}
}
