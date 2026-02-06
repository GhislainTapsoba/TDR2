// core/domain/Notification_preferences.ts
export class NotificationPreferences {
  constructor(
    public user_id: string,
    public email_task_assigned: boolean | null,
    public email_task_updated: boolean | null,
    public email_task_due: boolean | null,
    public email_stage_completed: boolean | null,
    public email_project_created: boolean | null,
    public push_notifications: boolean | null,
    public daily_summary: boolean | null,
    public updated_at: Date | null
  ) {}
}
