import React from 'react';
import { scheduleTaskReminders } from '@/lib/task-reminders';

// Schedule task reminders to run every hour
scheduleTaskReminders();

export const metadata = {
  title: 'TDR2 API Backend',
  description: 'API Backend for TDR2',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
