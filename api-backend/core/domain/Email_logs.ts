// core/domain/Email_logs.ts
export class EmailLog {
  constructor(
    public id: string,
    public recipient: string,
    public subject: string,
    public body: string | null,
    public sent_at: Date | null,
    public status: string | null, // or a specific enum type if available
    public error_message: string | null
  ) {}
}
