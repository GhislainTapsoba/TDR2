// core/domain/User.ts
export class User {
  constructor(
    public id: string,
    public email: string,
    public name: string | null,
    public role_id: string | null,
    public password: string | null,
    public created_at: Date | null,
    public updated_at: Date | null,
    public role: string | null,
    public is_active: boolean | null,
    public phone: string | null
  ) {}
}
