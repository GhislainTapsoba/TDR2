import { db } from './db';

// Helper function to create activity logs
export async function createActivityLog(data: {
    userId: string;
    action: string;
    entityType: string;
    entityId: string;
    description: string;
    details?: any;
}) {
    await db.query(
        'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
        [
            data.userId,
            data.action,
            data.entityType,
            data.entityId,
            JSON.stringify({
                description: data.description,
                ...data.details
            })
        ]
    );
}

// Helper function to create notification log
export async function createNotificationLog(data: {
    userId: string;
    title: string;
    message: string;
    type?: string;
    details?: any;
}) {
    await db.query(
        'INSERT INTO notifications (user_id, title, message, type, details) VALUES ($1, $2, $3, $4, $5)',
        [
            data.userId,
            data.title,
            data.message,
            data.type || 'info',
            JSON.stringify(data.details || {})
        ]
    );
}

// Helper function to create email log
export async function createEmailLog(data: {
    to: string;
    subject: string;
    status: 'sent' | 'failed';
    errorMessage?: string;
}) {
    await db.query(
        'INSERT INTO email_logs (to, subject, status, error_message) VALUES ($1, $2, $3, $4)',
        [
            data.to,
            data.subject,
            data.status,
            data.errorMessage || null
        ]
    );
}
