// core/domain/Notification.ts
export type NotificationType = 'INFO' | 'WARNING' | 'ERROR';

export class Notification {
  constructor(
    public id: string,
    public user_id: string,
    public type: NotificationType,
    public title: string,
    public message: string,
    public is_read: boolean | null,
    public metadata: any | null,
    public created_at: Date | null
  ) {}
}
