export class EmailNotificationAdapter {
  // Placeholder for email notification logic
  // TODO: Implement actual email sending functionality
  async sendEmail(to: string, subject: string, body: string): Promise<void> {
    console.log(`Sending email to ${to} with subject ${subject} and body: ${body}`);
    return Promise.resolve();
  }
}
