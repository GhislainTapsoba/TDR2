// core/domain/Task_reminders.ts
export class TaskReminder {
  constructor(
    public id: string,
    public task_id: string,
    public user_id: string,
    public reminder_date: Date,
    public sent: boolean | null,
    public created_at: Date | null
  ) {}
}
