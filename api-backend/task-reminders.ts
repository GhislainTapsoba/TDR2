import 'dotenv/config';
import { db } from './lib/db';
import { sendEmail, sendSMS, sendWhatsApp, sendTaskReminderEmail, getManagersAndAdmins } from './lib/email';

interface Task {
    task_id: string;
    title: string;
    due_date: string;
    user_id: string;
    user_name: string;
    user_email: string;
    user_phone: string;
}

async function processTaskReminders() {
    console.log('Processing task reminders...');

    try {
        // Get tasks due in 3 days that need reminders
        const threeDaysFromNow = new Date();
        threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
        threeDaysFromNow.setHours(0, 0, 0, 0);

        const threeDaysEnd = new Date(threeDaysFromNow);
        threeDaysEnd.setHours(23, 59, 59, 999);

        // Find tasks due in 3 days that don't have reminders yet
        const tasksResult = await db.query(
            `SELECT DISTINCT
        t.id as task_id,
        t.title,
        t.due_date,
        ta.user_id,
        u.name as user_name,
        u.email as user_email,
        u.phone as user_phone
      FROM tasks t
      JOIN task_assignees ta ON t.id = ta.task_id
      JOIN users u ON ta.user_id = u.id
      WHERE t.due_date >= $1 
        AND t.due_date <= $2
        AND t.status != 'COMPLETED'
        AND NOT EXISTS (
          SELECT 1 FROM task_reminders tr
          WHERE tr.task_id = t.id
            AND DATE(tr.created_at) = CURRENT_DATE
        )`,
            [threeDaysFromNow, threeDaysEnd]
        );

        console.log(`Found ${tasksResult.rows.length} tasks needing reminders`);

        for (const task of tasksResult.rows) {
            try {
                // Get user notification preferences
                const prefResult = await db.query(
                    'SELECT email_task_due, push_notifications FROM notification_preferences WHERE user_id = $1',
                    [task.user_id]
                );

                let reminderType = 'EMAIL'; // Default

                if (prefResult.rows.length > 0) {
                    const prefs = prefResult.rows[0];
                    if (prefs.email_task_due && prefs.push_notifications && task.user_phone) {
                        reminderType = 'ALL';
                    } else if (prefs.push_notifications && task.user_phone) {
                        reminderType = 'WHATSAPP';
                    }
                }

                // Create reminder
                await db.query(
                    `INSERT INTO task_reminders (task_id, reminder_type, created_at)
           VALUES ($1, $2, NOW())`,
                    [task.task_id, reminderType]
                );

                // Send notifications
                const message = `Rappel: La tâche "${task.title}" arrive à échéance le ${new Date(task.due_date).toLocaleDateString()}. Veuillez la compléter à temps.`;

                if (reminderType === 'EMAIL' || reminderType === 'ALL') {
                    await sendEmail({
                        to: task.user_email,
                        subject: `Rappel de tâche: ${task.title}`,
                        html: `
              <h2>Rappel de tâche</h2>
              <p>Bonjour ${task.user_name},</p>
              <p>${message}</p>
              <p><strong>Date limite:</strong> ${new Date(task.due_date).toLocaleDateString()}</p>
            `,
                        text: message,
                    });
                }

                if ((reminderType === 'SMS' || reminderType === 'ALL') && task.user_phone) {
                    await sendSMS({ to: task.user_phone, message });
                }

                if ((reminderType === 'WHATSAPP' || reminderType === 'ALL') && task.user_phone) {
                    await sendWhatsApp({ to: task.user_phone, message });
                }

                // Mark as sent
                await db.query(
                    'UPDATE task_reminders SET sent_at = NOW() WHERE task_id = $1 AND sent_at IS NULL',
                    [task.task_id]
                );

                console.log(`Reminder sent for task ${task.title} (user ${task.user_name})`);

                // Send reminder emails to managers and admins
                try {
                    const managersAndAdmins = await getManagersAndAdmins();
                    for (const manager of managersAndAdmins) {
                        await sendTaskReminderEmail({
                            to: manager.email,
                            recipientId: manager.id,
                            recipientName: manager.name || 'Manager/Admin',
                            taskTitle: task.title,
                            taskId: task.task_id,
                            projectName: '', // We don't have project name in this query
                            dueDate: task.due_date,
                        });
                    }
                } catch (managerEmailError) {
                    console.error('Error sending reminder emails to managers/admins:', managerEmailError);
                    // Continue even if manager emails fail
                }
            } catch (error) {
                console.error(`Error processing reminder for task ${task.task_id}:`, error);
            }
        }

        console.log('Task reminders processing completed');
    } catch (error) {
        console.error('Error processing task reminders:', error);
    }
}

// Run every hour
const INTERVAL = 60 * 60 * 1000;

async function main() {
    console.log('Task reminder service started');

    // Run immediately on start
    await processTaskReminders();

    // Then run on interval
    setInterval(async () => {
        await processTaskReminders();
    }, INTERVAL);
}

main().catch(console.error);
