import { NextRequest } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { handleCorsOptions, corsResponse } from '@/lib/cors';
import { sendEmail, sendSMS, sendWhatsApp } from '@/lib/email';

export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

// GET /api/reminders - Get user reminders
export async function GET(request: NextRequest) {
    try {
        const user = await verifyAuth(request);
        if (!user) {
            return corsResponse({ error: 'Non autorisé' }, request, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const taskId = searchParams.get('task_id');

        let query = `
            SELECT r.*, t.title as task_title, t.description as task_description, 
                   t.due_date as task_due_date, t.priority as task_priority
            FROM reminders r
            LEFT JOIN tasks t ON r.task_id = t.id
            WHERE r.user_id = $1
        `;
        const params = [user.id];

        if (taskId) {
            query += ' AND r.task_id = $2';
            params.push(taskId);
        }

        query += ' ORDER BY r.reminder_time ASC';

        const { rows } = await db.query(query, params);
        return corsResponse(rows, request);
    } catch (error) {
        console.error('GET /api/reminders error:', error);
        return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
    }
}

// POST /api/reminders - Create a reminder
export async function POST(request: NextRequest) {
    try {
        const user = await verifyAuth(request);
        if (!user) {
            return corsResponse({ error: 'Non autorisé' }, request, { status: 401 });
        }

        const body = await request.json();
        const { task_id, reminder_time, reminder_type, message } = body;

        if (!task_id || !reminder_time || !reminder_type) {
            return corsResponse({ error: 'task_id, reminder_time et reminder_type sont requis' }, request, { status: 400 });
        }

        // Validate reminder_type
        const validTypes = ['email', 'sms', 'whatsapp'];
        if (!validTypes.includes(reminder_type)) {
            return corsResponse({ error: 'Type de rappel invalide' }, request, { status: 400 });
        }

        // Get task details
        const { rows: taskRows } = await db.query(
            'SELECT t.*, u.email as user_email, u.phone as user_phone FROM tasks t JOIN users u ON t.assigned_to = u.id WHERE t.id = $1',
            [task_id]
        );

        if (taskRows.length === 0) {
            return corsResponse({ error: 'Tâche non trouvée' }, request, { status: 404 });
        }

        const task = taskRows[0];

        // Create reminder
        const { rows } = await db.query(
            `INSERT INTO reminders (task_id, user_id, reminder_time, reminder_type, message, created_at)
             VALUES ($1, $2, $3, $4, $5, NOW())
             RETURNING *`,
            [task_id, user.id, reminder_time, reminder_type, message || `Rappel: ${task.title}`]
        );

        // Schedule the reminder (in a real app, you'd use a job queue like Bull or Agenda)
        // For now, we'll just log it
        console.log(`📅 Rappel planifié: ${reminder_type} à ${new Date(reminder_time).toLocaleString()} pour la tâche ${task.title}`);

        return corsResponse(rows[0], request, { status: 201 });
    } catch (error) {
        console.error('POST /api/reminders error:', error);
        return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
    }
}

