// core/domain/Permission.ts
export class Permission {
  constructor(
    public id: string,
    public name: string,
    public description: string | null,
    public resource: string,
    public action: string,
    public created_at: Date | null,
    public updated_at: Date | null
  ) {}
}
