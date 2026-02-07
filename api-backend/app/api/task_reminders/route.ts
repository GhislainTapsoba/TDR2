import { NextRequest } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { handleCorsOptions, corsResponse } from '@/lib/cors';
import ReminderService from '@/lib/reminderService';

export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

// GET /api/task_reminders - Get all task reminders for authenticated user
export async function GET(request: NextRequest) {
    try {
        const user = await verifyAuth(request);
        if (!user) {
            return corsResponse({ error: 'Non autorisé' }, request, { status: 401 });
        }

        const { rows } = await db.query(
            `SELECT r.*, t.title as task_title, t.description as task_description,
                    t.due_date as task_due_date, t.priority as task_priority, t.status as task_status
             FROM reminders r
             JOIN tasks t ON r.task_id = t.id
             WHERE r.user_id = $1
             ORDER BY r.reminder_time DESC`,
            [user.id]
        );

        return corsResponse(rows, request);
    } catch (error) {
        console.error('GET /api/task_reminders error:', error);
        return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
    }
}

// POST /api/task_reminders - Create a new task reminder
export async function POST(request: NextRequest) {
    try {
        const user = await verifyAuth(request);
        if (!user) {
            return corsResponse({ error: 'Non autorisé' }, request, { status: 401 });
        }

        const body = await request.json();
        const { task_id, reminder_time, reminder_type = 'email', message } = body;

        if (!task_id || !reminder_time) {
            return corsResponse({ error: 'task_id et reminder_time requis' }, request, { status: 400 });
        }

        if (!['email', 'sms', 'whatsapp'].includes(reminder_type)) {
            return corsResponse({ error: 'reminder_type doit être email, sms ou whatsapp' }, request, { status: 400 });
        }

        const reminderService = ReminderService.getInstance();
        const reminder = await reminderService.scheduleReminder(
            task_id,
            user.id,
            new Date(reminder_time),
            reminder_type,
            message
        );

        return corsResponse(reminder, request, { status: 201 });
    } catch (error) {
        console.error('POST /api/task_reminders error:', error);
        return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
    }
}
