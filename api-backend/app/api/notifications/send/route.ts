import { NextRequest } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { handleCorsOptions, corsResponse } from '@/lib/cors';

export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

// POST /api/notifications/send - Send a notification
export async function POST(request: NextRequest) {
    try {
        const user = await verifyAuth(request);
        if (!user) {
            return corsResponse({ error: 'Non autorisé' }, request, { status: 401 });
        }

        const body = await request.json();
        const { user_id, task_id, type, title, message } = body;

        if (!user_id || !type || !title) {
            return corsResponse({ error: 'user_id, type et title sont requis' }, request, { status: 400 });
        }

        // Get user details
        const { rows: userRows } = await db.query(
            'SELECT * FROM users WHERE id = $1',
            [user_id]
        );

        if (userRows.length === 0) {
            return corsResponse({ error: 'Utilisateur non trouvé' }, request, { status: 404 });
        }

        const notificationUser = userRows[0];

        // Create notification
        const { rows } = await db.query(
            `INSERT INTO notifications (user_id, task_id, type, title, message, created_at, read_at)
             VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
             RETURNING *`,
            [user_id, task_id || null, type, title, message]
        );

        return corsResponse(rows[0], request, { status: 201 });
    } catch (error) {
        console.error('POST /api/notifications/send error:', error);
        return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
    }
}
