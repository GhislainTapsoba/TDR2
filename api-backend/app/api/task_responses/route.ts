import { NextRequest } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { handleCorsOptions, corsResponse } from '@/lib/cors';

export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

// GET /api/task_responses - Get all task responses
export async function GET(request: NextRequest) {
    try {
        const user = await verifyAuth(request);
        if (!user) {
            return corsResponse({ error: 'Non autorisé' }, request, { status: 401 });
        }

        const { rows } = await db.query(
            'SELECT * FROM task_responses ORDER BY created_at DESC'
        );

        return corsResponse(rows, request);
    } catch (error) {
        console.error('GET /api/task_responses error:', error);
        return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
    }
}

// POST /api/task_responses - Create a new task response
export async function POST(request: NextRequest) {
    try {
        const user = await verifyAuth(request);
        if (!user) {
            return corsResponse({ error: 'Non autorisé' }, request, { status: 401 });
        }

        const body = await request.json();
        const { task_id, response_text } = body;

        if (!task_id || !response_text) {
            return corsResponse({ error: 'task_id et response_text requis' }, request, { status: 400 });
        }

        const { rows } = await db.query(
            'INSERT INTO task_responses (task_id, response_text, created_by_id, created_at) VALUES ($1, $2, $3, NOW()) RETURNING *',
            [task_id, response_text, user.id]
        );

        return corsResponse(rows[0], request, { status: 201 });
    } catch (error) {
        console.error('POST /api/task_responses error:', error);
        return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
    }
}
