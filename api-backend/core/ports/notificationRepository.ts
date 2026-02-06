export interface NotificationPort {
  notify(notification: {
    userId: string;
    title: string;
    message: string;
    actionUrl?: string;
  }): Promise<void>;
}
