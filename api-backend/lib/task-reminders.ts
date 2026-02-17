import { db } from './db';
import { sendEmail, sendSMS, sendWhatsApp } from './email';

interface TaskReminder {
    taskId: string;
    taskTitle: string;
    projectName: string;
    assigneeEmail: string;
    assigneePhone: string;
    assigneeName: string;
    dueDate: Date;
    priority: string;
}

// Send reminders for tasks due soon or overdue
export async function sendTaskReminders(): Promise<void> {
    try {
        console.log('🔄 Checking for task reminders...');

        // Get tasks that need reminders
        const query = `
            SELECT 
                t.id as task_id,
                t.title as task_title,
                t.due_date,
                t.priority,
                t.status,
                p.title as project_title,
                u.email as assignee_email,
                u.phone as assignee_phone,
                u.name as assignee_name
            FROM tasks t
            JOIN projects p ON t.project_id = p.id
            JOIN task_assignees ta ON t.id = ta.task_id
            JOIN users u ON ta.user_id = u.id
            WHERE t.status IN ('TODO', 'IN_PROGRESS')
            AND t.due_date IS NOT NULL
            AND (
                -- Due tomorrow (send evening before)
                (DATE(t.due_date) = DATE(NOW() + INTERVAL '1 day') 
                 AND EXTRACT(HOUR FROM NOW()) >= 18)
                OR
                -- Due today (send morning of)
                (DATE(t.due_date) = DATE(NOW()) 
                 AND EXTRACT(HOUR FROM NOW()) >= 8 
                 AND EXTRACT(HOUR FROM NOW()) < 12)
                OR
                -- Overdue (send morning of)
                (t.due_date < NOW() 
                 AND EXTRACT(HOUR FROM NOW()) >= 8 
                 AND EXTRACT(HOUR FROM NOW()) < 12)
            )
            AND (
                -- Only send once per day per task
                t.id NOT IN (
                    SELECT task_id FROM task_reminders 
                    WHERE DATE(created_at) = DATE(NOW())
                )
            )
        `;

        const { rows } = await db.query(query);

        console.log(`Found ${rows.length} tasks needing reminders`);

        if (rows.length === 0) {
            console.log('No tasks need reminders at this time');
            return;
        }

        console.log('Tasks needing reminders:');
        for (const task of rows) {
            console.log(`  - ${task.task_title} (ID: ${task.task_id})`);
            await sendReminderForTask({
                taskId: task.task_id,
                taskTitle: task.task_title,
                projectName: task.project_title,
                dueDate: task.due_date,
                priority: task.priority,
                assigneeEmail: task.assignee_email,
                assigneePhone: task.assignee_phone,
                assigneeName: task.assignee_name
            } as TaskReminder);
        }

    } catch (error) {
        console.error('Error sending task reminders:', error);
    }
}

async function sendReminderForTask(task: TaskReminder): Promise<void> {
    const now = new Date();
    const dueDate = new Date(task.dueDate);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const taskDate = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());

    const daysDiff = Math.ceil((taskDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    let reminderType: 'overdue' | 'due_today' | 'due_tomorrow';
    let urgency: 'low' | 'medium' | 'high' | 'critical';

    if (daysDiff < 0) {
        reminderType = 'overdue';
        urgency = 'critical';
    } else if (daysDiff === 0) {
        reminderType = 'due_today';
        urgency = 'high';
    } else if (daysDiff === 1) {
        reminderType = 'due_tomorrow';
        urgency = 'medium';
    } else {
        return; // Don't send reminder if more than 1 day away
    }

    console.log(`Sending ${reminderType} reminder for task: ${task.taskTitle}`);

    try {
        // Send email reminder
        await sendTaskReminderEmail(task, reminderType, urgency);

        // Send SMS reminder
        await sendTaskReminderSMS(task, reminderType, urgency);

        // Send WhatsApp reminder
        await sendTaskReminderWhatsApp(task, reminderType, urgency);

        // Log the reminder
        await db.query(
            `INSERT INTO task_reminders (task_id, created_at, reminder_type, urgency)
             VALUES ($1, NOW(), $2, $3)`,
            [task.taskId, reminderType, urgency]
        );

        console.log(`✅ Reminder sent for task: ${task.taskTitle}`);

    } catch (error) {
        console.error(`❌ Failed to send reminder for task ${task.taskTitle}:`, error);
    }
}

async function sendTaskReminderEmail(task: TaskReminder, reminderType: string, urgency: string): Promise<void> {
    const subject = getReminderSubject(task.taskTitle, reminderType);
    const html = getReminderEmailHTML(task, reminderType, urgency);

    await sendEmail({
        to: task.assigneeEmail,
        subject,
        html
    });
}

async function sendTaskReminderSMS(task: TaskReminder, reminderType: string, urgency: string): Promise<void> {
    const message = getReminderSMS(task, reminderType, urgency);

    await sendSMS({
        to: task.assigneePhone,
        message
    });
}

async function sendTaskReminderWhatsApp(task: TaskReminder, reminderType: string, urgency: string): Promise<void> {
    const message = getReminderWhatsApp(task, reminderType, urgency);

    await sendWhatsApp({
        to: task.assigneePhone,
        message
    });
}

function getReminderSubject(taskTitle: string, reminderType: string): string {
    switch (reminderType) {
        case 'overdue':
            return `⚠️ TÂCHE EN RETARD: ${taskTitle}`;
        case 'due_today':
            return `🔴 TÂCHE AUJOURD'HUI: ${taskTitle}`;
        case 'due_tomorrow':
            return `🟡 TÂCHE DEMAIN: ${taskTitle}`;
        default:
            return `Rappel: ${taskTitle}`;
    }
}

function getReminderEmailHTML(task: TaskReminder, reminderType: string, urgency: string): string {
    const urgencyColors = {
        low: '#28a745',
        medium: '#ffc107',
        high: '#fd7e14',
        critical: '#dc3545'
    };

    const urgencyIcons = {
        low: '🟢',
        medium: '🟡',
        high: '🔴',
        critical: '⚠️'
    };

    const urgencyColor = urgencyColors[urgency as keyof typeof urgencyColors] || '#ffc107';
    const urgencyIcon = urgencyIcons[urgency as keyof typeof urgencyIcons] || '🟡';

    const dueDate = new Date(task.dueDate).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    let statusMessage = '';
    let statusColor = '';

    switch (reminderType) {
        case 'overdue':
            statusMessage = 'Cette tâche est EN RETARD';
            statusColor = '#dc3545';
            break;
        case 'due_very_soon':
            statusMessage = 'Cette tâche est due dans moins de 2 heures';
            statusColor = '#fd7e14';
            break;
        case 'due_soon':
            statusMessage = 'Cette tâche est due dans moins de 24 heures';
            statusColor = '#ffc107';
            break;
    }

    return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: ${urgencyColor}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0; font-size: 24px;">${urgencyIcon} Rappel de tâche</h1>
                <p style="margin: 10px 0 0 0; font-size: 16px;">${statusMessage}</p>
            </div>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px;">
                <div style="background-color: white; padding: 20px; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <h2 style="color: #333; margin: 0 0 15px 0;">${task.taskTitle}</h2>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                        <div>
                            <strong style="color: #666;">📂 Projet:</strong><br>
                            <span style="color: #333;">${task.projectName}</span>
                        </div>
                        <div>
                            <strong style="color: #666;">⏰ Échéance:</strong><br>
                            <span style="color: ${statusColor}; font-weight: bold;">${dueDate}</span>
                        </div>
                        <div>
                            <strong style="color: #666;">🎯 Priorité:</strong><br>
                            <span style="color: #333;">${task.priority}</span>
                        </div>
                        <div>
                            <strong style="color: #666;">📊 Statut:</strong><br>
                            <span style="color: ${statusColor}; font-weight: bold;">${statusMessage}</span>
                        </div>
                    </div>
                
                </div>
            </div>
            
            <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
                <p>Ce rappel a été envoyé automatiquement par le système de gestion de tâches.</p>
            </div>
        </div>
    `;
}

function getReminderSMS(task: TaskReminder, reminderType: string, urgency: string): string {
    const dueDate = new Date(task.dueDate).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit'
    });

    let message = '';

    switch (reminderType) {
        case 'overdue':
            message = `⚠️ TÂCHE EN RETARD: ${task.taskTitle}. Échéance: ${dueDate}. Projet: ${task.projectName}. Veuillez compléter cette tâche dès que possible.`;
            break;
        case 'due_today':
            message = `🔴 TÂCHE AUJOURD'HUI: ${task.taskTitle}. Échéance: ${dueDate}. Projet: ${task.projectName}.`;
            break;
        case 'due_tomorrow':
            message = `🟡 TÂCHE DEMAIN: ${task.taskTitle}. Échéance: ${dueDate}. Projet: ${task.projectName}.`;
            break;
        default:
            message = `Rappel: ${task.taskTitle} due le ${dueDate}.`;
    }

    return message;
}

function getReminderWhatsApp(task: TaskReminder, reminderType: string, urgency: string): string {
    const dueDate = new Date(task.dueDate).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    let statusEmoji = '';
    let statusText = '';

    switch (reminderType) {
        case 'overdue':
            statusEmoji = '⚠️';
            statusText = 'EN RETARD';
            break;
        case 'due_today':
            statusEmoji = '🔴';
            statusText = 'AUJOURD\'HUI';
            break;
        case 'due_tomorrow':
            statusEmoji = '🟡';
            statusText = 'DEMAIN';
            break;
    }

    return `
${statusEmoji} *Rappel de tâche - ${statusText}*

📋 *Tâche:* ${task.taskTitle}
📂 *Projet:* ${task.projectName}
⏰ *Échéance:* ${dueDate}
🎯 *Priorité:* ${task.priority}
📊 *Statut:* ${statusText}

🔗 *Lien:* ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/tasks/${task.taskId}

---
*Ceci est un rappel automatique du système de gestion de tâches.*
    `.trim();
}

// Schedule to run every 12 hours
export function scheduleTaskReminders(): void {
    // Run immediately
    sendTaskReminders();

    // Then run every 12 hours
    setInterval(sendTaskReminders, 12 * 60 * 60 * 1000);

    console.log('📅 Task reminders scheduled to run every 12 hours');
}
