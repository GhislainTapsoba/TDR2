import { NextRequest } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { handleCorsOptions, corsResponse } from '@/lib/cors';
import { sendEmail, sendSMS, sendWhatsApp } from '@/lib/email';

export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

// GET /api/tasks/[id]/reminders - Get reminders for a specific task
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await verifyAuth(request);
        if (!user) {
            return corsResponse({ error: 'Non autorisé' }, request, { status: 401 });
        }

        const { id } = await params;

        const { rows } = await db.query(
            `SELECT r.*, u.name as user_name, u.email as user_email, u.phone as user_phone
             FROM reminders r
             JOIN users u ON r.user_id = u.id
             WHERE r.task_id = $1
             ORDER BY r.reminder_time ASC`,
            [id]
        );

        return corsResponse(rows, request);
    } catch (error) {
        console.error('GET /api/tasks/[id]/reminders error:', error);
        return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
    }
}

// POST /api/tasks/[id]/reminders - Create a reminder for a task
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await verifyAuth(request);
        if (!user) {
            return corsResponse({ error: 'Non autorisé' }, request, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();
        const { reminder_time, reminder_type, message, user_id } = body;

        if (!reminder_time || !reminder_type || !user_id) {
            return corsResponse({ error: 'reminder_time, reminder_type et user_id sont requis' }, request, { status: 400 });
        }

        // Validate reminder_type
        const validTypes = ['email', 'sms', 'whatsapp'];
        if (!validTypes.includes(reminder_type)) {
            return corsResponse({ error: 'Type de rappel invalide' }, request, { status: 400 });
        }

        // Get task details
        const { rows: taskRows } = await db.query(
            'SELECT * FROM tasks WHERE id = $1',
            [id]
        );

        if (taskRows.length === 0) {
            return corsResponse({ error: 'Tâche non trouvée' }, request, { status: 404 });
        }

        const task = taskRows[0];

        // Get user details
        const { rows: userRows } = await db.query(
            'SELECT * FROM users WHERE id = $1',
            [user_id]
        );

        if (userRows.length === 0) {
            return corsResponse({ error: 'Utilisateur non trouvé' }, request, { status: 404 });
        }

        const reminderUser = userRows[0];

        // Create reminder
        const { rows } = await db.query(
            `INSERT INTO reminders (task_id, user_id, reminder_time, reminder_type, message, created_at)
             VALUES ($1, $2, $3, $4, $5, NOW())
             RETURNING *`,
            [id, user_id, reminder_time, reminder_type, message || `Rappel: ${task.title}`]
        );

        return corsResponse(rows[0], request, { status: 201 });
    } catch (error) {
        console.error('POST /api/tasks/[id]/reminders error:', error);
        return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
    }
}
