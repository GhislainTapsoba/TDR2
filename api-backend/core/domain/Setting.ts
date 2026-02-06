// core/domain/Setting.ts
export class Setting {
  constructor(
    public id: string,
    public key: string,
    public value: any | null, // JSONB
    public created_at: Date | null,
    public updated_at: Date | null
  ) {}
}
