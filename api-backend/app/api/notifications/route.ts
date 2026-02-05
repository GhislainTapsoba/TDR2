import { NextRequest } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { handleCorsOptions, corsResponse } from '@/lib/cors';

export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

// GET /api/notifications - Get user notifications
export async function GET(request: NextRequest) {
    try {
        const user = await verifyAuth(request);
        if (!user) {
            return corsResponse({ error: 'Non autorisé' }, request, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const unread_only = searchParams.get('unread_only') === 'true';

        let query = 'SELECT * FROM notifications WHERE user_id = $1';
        if (unread_only) {
            query += ' AND is_read = false';
        }
        query += ' ORDER BY created_at DESC LIMIT 50';

        const { rows } = await db.query(query, [user.id]);

        return corsResponse(rows, request);
    } catch (error) {
        console.error('GET /api/notifications error:', error);
        return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
    }
}
