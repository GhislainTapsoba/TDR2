import { NextRequest } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { handleCorsOptions, corsResponse } from '@/lib/cors';

export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

// GET /api/task_assignees - Get all task assignees
export async function GET(request: NextRequest) {
    try {
        const user = await verifyAuth(request);
        if (!user) {
            return corsResponse({ error: 'Non autorisé' }, request, { status: 401 });
        }

        const { rows } = await db.query(
            'SELECT * FROM task_assignees ORDER BY assigned_at DESC'
        );

        return corsResponse(rows, request);
    } catch (error) {
        console.error('GET /api/task_assignees error:', error);
        return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
    }
}

// POST /api/task_assignees - Assign a task to a user
export async function POST(request: NextRequest) {
    try {
        const user = await verifyAuth(request);
        if (!user) {
            return corsResponse({ error: 'Non autorisé' }, request, { status: 401 });
        }

        const body = await request.json();
        const { task_id, user_id } = body;

        if (!task_id || !user_id) {
            return corsResponse({ error: 'task_id et user_id requis' }, request, { status: 400 });
        }

        const { rows } = await db.query(
            'INSERT INTO task_assignees (task_id, user_id, assigned_at) VALUES ($1, $2, NOW()) RETURNING *',
            [task_id, user_id]
        );

        return corsResponse(rows[0], request, { status: 201 });
    } catch (error) {
        console.error('POST /api/task_assignees error:', error);
        return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
    }
}
