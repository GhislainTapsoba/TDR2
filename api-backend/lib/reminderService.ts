import { db } from './db';
import { sendEmail, sendSMS, sendWhatsApp } from './email';

interface Reminder {
    id: string;
    task_id: string;
    user_id: string;
    reminder_time: Date;
    reminder_type: 'email' | 'sms' | 'whatsapp';
    message: string;
    is_active: boolean;
    created_at: Date;
}

interface Task {
    id: string;
    title: string;
    description?: string;
    due_date?: Date;
    priority: string;
    status: string;
}

interface User {
    id: string;
    name?: string;
    email: string;
    phone?: string;
}

class ReminderService {
    private static instance: ReminderService;
    private intervalId: NodeJS.Timeout | null = null;

    private constructor() {
        this.startReminderProcessor();
    }

    public static getInstance(): ReminderService {
        if (!ReminderService.instance) {
            ReminderService.instance = new ReminderService();
        }
        return ReminderService.instance;
    }

    private startReminderProcessor() {
        // Check for reminders every minute
        this.intervalId = setInterval(() => {
            this.processPendingReminders();
        }, 60000); // 1 minute
    }

    public start(): void {
        if (!this.intervalId) {
            this.startReminderProcessor();
            console.log('▶️ Reminder service started');
        }
    }

    public stop(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            console.log('⏹️ Reminder service stopped');
        }
    }

    private async processPendingReminders() {
        try {
            const now = new Date();
            const { rows } = await db.query(
                `SELECT r.*, t.title as task_title, t.description as task_description, 
                       t.due_date as task_due_date, t.priority as task_priority,
                       u.name as user_name, u.email as user_email, u.phone as user_phone
                FROM reminders r
                JOIN tasks t ON r.task_id = t.id
                JOIN users u ON r.user_id = u.id
                WHERE r.is_active = true 
                AND r.reminder_time <= $1 
                AND r.sent_at IS NULL
                ORDER BY r.reminder_time ASC`,
                [now]
            );

            for (const reminder of rows) {
                await this.sendReminder(reminder);
                await this.markAsSent(reminder.id);
            }
        } catch (error) {
            console.error('Error processing reminders:', error);
        }
    }

    private async sendReminder(reminder: any) {
        const task: Task = {
            id: reminder.task_id,
            title: reminder.task_title,
            description: reminder.task_description,
            due_date: reminder.task_due_date,
            priority: reminder.task_priority,
            status: reminder.status
        };

        const user: User = {
            id: reminder.user_id,
            name: reminder.user_name,
            email: reminder.user_email,
            phone: reminder.user_phone
        };

        const message = reminder.message || `Rappel pour la tâche: ${task.title}`;

        switch (reminder.reminder_type) {
            case 'email':
                await this.sendEmailReminder(user, task, message);
                break;
            case 'sms':
                await this.sendSMSReminder(user, task, message);
                break;
            case 'whatsapp':
                await this.sendWhatsAppReminder(user, task, message);
                break;
            default:
                console.error(`Unknown reminder type: ${reminder.reminder_type}`);
        }
    }

    private async sendEmailReminder(user: User, task: Task, message: string) {
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2563eb;">📋 Rappel de Tâche - Team Project</h2>
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="color: #1f2937; margin: 0 0 10px 0;">${task.title}</h3>
                    ${task.description ? `<p style="color: #6b7280; margin: 0 0 10px 0;">${task.description}</p>` : ''}
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 14px;">
                        <div><strong>Priorité:</strong> ${this.getPriorityLabel(task.priority)}</div>
                        <div><strong>Statut:</strong> ${this.getStatusLabel(task.status)}</div>
                        ${task.due_date ? `<div><strong>Échéance:</strong> ${new Date(task.due_date).toLocaleDateString()}</div>` : ''}
                    </div>
                </div>
                <div style="background: #e5e7eb; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0; color: #374151;">${message}</p>
                </div>
                <div style="text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px;">
                    <p>Cet email a été envoyé automatiquement par Team Project</p>
                    <p style="margin-top: 5px;">Gérez vos tâches efficacement avec Team Project</p>
                </div>
            </div>
        `;

        await sendEmail({
            to: user.email,
            subject: `📋 Team Project - Rappel: ${task.title}`,
            html
        });

        console.log(`📧 Email Team Project envoyé à ${user.email} pour la tâche ${task.title}`);
    }

    private async sendSMSReminder(user: User, task: Task, message: string) {
        if (!user.phone) {
            console.error(`No phone number for user ${user.id}`);
            return;
        }

        const smsMessage = `📋 Team Project - Rappel: ${task.title}. ${message}`;
        
        await sendSMS({
            to: user.phone,
            message: smsMessage
        });

        console.log(`📱 SMS Team Project envoyé à ${user.phone} pour la tâche ${task.title}`);
    }

    private async sendWhatsAppReminder(user: User, task: Task, message: string) {
        if (!user.phone) {
            console.error(`No phone number for user ${user.id}`);
            return;
        }

        const whatsappMessage = `📋 *Team Project - Rappel*\n\n*Tâche:* ${task.title}\n${task.description ? `*Description:* ${task.description}\n` : ''}${task.due_date ? `*Échéance:* ${new Date(task.due_date).toLocaleDateString()}\n` : ''}*Priorité:* ${this.getPriorityLabel(task.priority)}\n*Statut:* ${this.getStatusLabel(task.status)}\n\n${message}\n\n_Géré par Team Project_`;

        await sendWhatsApp({
            to: user.phone,
            message: whatsappMessage
        });

        console.log(`💬 WhatsApp Team Project envoyé à ${user.phone} pour la tâche ${task.title}`);
    }

    private getPriorityLabel(priority: string): string {
        switch (priority) {
            case 'LOW': return 'Basse';
            case 'MEDIUM': return 'Moyenne';
            case 'HIGH': return 'Haute';
            case 'URGENT': return 'Urgente';
            default: return priority;
        }
    }

    private getStatusLabel(status: string): string {
        switch (status) {
            case 'TODO': return 'À faire';
            case 'IN_PROGRESS': return 'En cours';
            case 'IN_REVIEW': return 'En révision';
            case 'COMPLETED': return 'Terminé';
            default: return status;
        }
    }

    private async markAsSent(reminderId: string) {
        await db.query(
            'UPDATE reminders SET sent_at = NOW() WHERE id = $1',
            [reminderId]
        );
    }

    public async scheduleReminder(taskId: string, userId: string, reminderTime: Date, reminderType: 'email' | 'sms' | 'whatsapp', message?: string) {
        const { rows } = await db.query(
            `INSERT INTO reminders (task_id, user_id, reminder_time, reminder_type, message, created_at)
             VALUES ($1, $2, $3, $4, $5, NOW())
             RETURNING *`,
            [taskId, userId, reminderTime, reminderType, message]
        );

        console.log(`📅 Rappel planifié: ${reminderType} à ${new Date(reminderTime).toLocaleString()}`);
        return rows[0];
    }

    public async cancelReminder(reminderId: string) {
        await db.query('UPDATE reminders SET is_active = false WHERE id = $1', [reminderId]);
    }
}

export default ReminderService;
