export class UserSettings {
  constructor(
    public id: string,
    public user_id: string,
    public language: string | null,
    public timezone: string | null,
    public notifications_enabled: boolean | null,
    public email_notifications: boolean | null,
    public theme: string | null,
    public date_format: string | null,
    public items_per_page: number | null,
    public font_size: string | null,
    public compact_mode: boolean | null,
    public permissions: any[] | null,
    public created_at: Date | null,
    public updated_at: Date | null,
  ) {}
}