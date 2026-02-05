// core/domain/Role.ts
export class Role {
  constructor(
    public id: string,
    public name: string,
    public description: string | null,
    public created_at: Date | null,
    public updated_at: Date | null
  ) {}
}
