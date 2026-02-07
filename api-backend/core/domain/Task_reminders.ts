// core/domain/Task_reminders.ts
export class TaskReminder {
  constructor(
    public id: string,
    public task_id: string,
    public user_id: string,
    public reminder_time: Date,
    public reminder_type: 'email' | 'sms' | 'whatsapp',
    public message: string,
    public is_active: boolean,
    public sent_at: Date | null,
    public created_at: Date
  ) {}
}
