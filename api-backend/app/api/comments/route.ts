import { NextRequest } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { handleCorsOptions, corsResponse } from '@/lib/cors';

export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

// GET /api/comments - Get comments for a task
export async function GET(request: NextRequest) {
    try {
        const user = await verifyAuth(request);
        if (!user) {
            return corsResponse({ error: 'Non autorisé' }, request, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const task_id = searchParams.get('task_id');

        if (!task_id) {
            return corsResponse({ error: 'task_id est requis' }, request, { status: 400 });
        }

        const { rows } = await db.query(
            `SELECT c.*, u.name as author_name, u.email as author_email
       FROM comments c
       LEFT JOIN users u ON c.author_id = u.id
       WHERE c.task_id = $1
       ORDER BY c.created_at ASC`,
            [task_id]
        );

        return corsResponse(rows, request);
    } catch (error) {
        console.error('GET /api/comments error:', error);
        return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
    }
}

// POST /api/comments - Create a new comment
export async function POST(request: NextRequest) {
    try {
        const user = await verifyAuth(request);
        if (!user) {
            return corsResponse({ error: 'Non autorisé' }, request, { status: 401 });
        }

        const body = await request.json();
        const { content, task_id } = body;

        if (!content || !task_id) {
            return corsResponse({ error: 'Le contenu et task_id sont requis' }, request, { status: 400 });
        }

        // Verify task exists
        const { rows: taskRows } = await db.query(
            'SELECT id FROM tasks WHERE id = $1',
            [task_id]
        );

        if (taskRows.length === 0) {
            return corsResponse({ error: 'Tâche introuvable' }, request, { status: 404 });
        }

        const { rows } = await db.query(
            `INSERT INTO comments (content, task_id, author_id)
       VALUES ($1, $2, $3)
       RETURNING *`,
            [content, task_id, user.id]
        );

        // Get comment with author info
        const { rows: commentRows } = await db.query(
            `SELECT c.*, u.name as author_name, u.email as author_email
       FROM comments c
       LEFT JOIN users u ON c.author_id = u.id
       WHERE c.id = $1`,
            [rows[0].id]
        );

        return corsResponse(commentRows[0], request, { status: 201 });
    } catch (error) {
        console.error('POST /api/comments error:', error);
        return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
    }
}
