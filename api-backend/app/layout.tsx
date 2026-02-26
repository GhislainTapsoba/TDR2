import React from 'react';
import { scheduleTaskReminders } from '@/lib/task-reminders';
import { scheduleWeeklyReports } from '@/lib/weeklyReportsScheduler';

// Schedule task reminders to run every hour
scheduleTaskReminders();

// Schedule daily reports to run every day at midnight
scheduleWeeklyReports();

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
