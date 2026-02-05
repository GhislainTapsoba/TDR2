import { NextRequest } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { handleCorsOptions, corsResponse } from '@/lib/cors';

export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

// PUT /api/notifications/[id] - Mark notification as read
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await verifyAuth(request);
        if (!user) {
            return corsResponse({ error: 'Non autorisé' }, request, { status: 401 });
        }

        const { id } = params;

        // Check if notification belongs to user
        const { rows: notifRows } = await db.query(
            'SELECT * FROM notifications WHERE id = $1 AND user_id = $2',
            [id, user.id]
        );

        if (notifRows.length === 0) {
            return corsResponse({ error: 'Notification introuvable' }, request, { status: 404 });
        }

        const { rows } = await db.query(
            `UPDATE notifications
       SET is_read = true
       WHERE id = $1
       RETURNING *`,
            [id]
        );

        return corsResponse(rows[0], request);
    } catch (error) {
        console.error('PUT /api/notifications/[id] error:', error);
        return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
    }
}

// DELETE /api/notifications/[id] - Delete notification
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await verifyAuth(request);
        if (!user) {
            return corsResponse({ error: 'Non autorisé' }, request, { status: 401 });
        }

        const { id } = params;

        // Check if notification belongs to user
        const { rows: notifRows } = await db.query(
            'SELECT * FROM notifications WHERE id = $1 AND user_id = $2',
            [id, user.id]
        );

        if (notifRows.length === 0) {
            return corsResponse({ error: 'Notification introuvable' }, request, { status: 404 });
        }

        await db.query('DELETE FROM notifications WHERE id = $1', [id]);

        return corsResponse({ message: 'Notification supprimée avec succès' }, request);
    } catch (error) {
        console.error('DELETE /api/notifications/[id] error:', error);
        return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
    }
}
