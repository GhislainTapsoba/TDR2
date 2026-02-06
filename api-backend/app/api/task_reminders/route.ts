import { NextRequest } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { handleCorsOptions, corsResponse } from '@/lib/cors';

export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

// GET /api/task_reminders - Get all task reminders
export async function GET(request: NextRequest) {
    try {
        const user = await verifyAuth(request);
        if (!user) {
            return corsResponse({ error: 'Non autorisé' }, request, { status: 401 });
        }

        const { rows } = await db.query(
            'SELECT * FROM task_reminders ORDER BY reminder_date DESC'
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
        const { task_id, reminder_date, message } = body;

        if (!task_id || !reminder_date) {
            return corsResponse({ error: 'task_id et reminder_date requis' }, request, { status: 400 });
        }

        const { rows } = await db.query(
            'INSERT INTO task_reminders (task_id, reminder_date, message, created_by_id, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING *',
            [task_id, reminder_date, message, user.id]
        );

        return corsResponse(rows[0], request, { status: 201 });
    } catch (error) {
        console.error('POST /api/task_reminders error:', error);
        return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
    }
}
