// core/domain/Email_confirmations.ts
export class EmailConfirmation {
  constructor(
    public id: string,
    public token: string,
    public type: string,
    public user_id: string,
    public entity_type: string | null,
    public entity_id: string | null,
    public metadata: any | null,
    public expires_at: Date,
    public created_at: Date | null
  ) {}
}
