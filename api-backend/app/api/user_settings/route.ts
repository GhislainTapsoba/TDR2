import { NextRequest } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { handleCorsOptions, corsResponse } from '@/lib/cors';

export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

// GET /api/user_settings - Get user settings
export async function GET(request: NextRequest) {
    try {
        const user = await verifyAuth(request);
        if (!user) {
            return corsResponse({ error: 'Non autorisé' }, request, { status: 401 });
        }

        const { rows } = await db.query(
            'SELECT * FROM user_settings WHERE user_id = $1',
            [user.id]
        );

        return corsResponse(rows[0] || {}, request);
    } catch (error) {
        console.error('GET /api/user_settings error:', error);
        return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
    }
}

// POST /api/user_settings - Create or update user settings
export async function POST(request: NextRequest) {
    try {
        const user = await verifyAuth(request);
        if (!user) {
            return corsResponse({ error: 'Non autorisé' }, request, { status: 401 });
        }

        const body = await request.json();
        const { theme, language, notifications } = body;

        const { rows } = await db.query(
            `INSERT INTO user_settings (user_id, theme, language, notifications, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET theme = EXCLUDED.theme, language = EXCLUDED.language, notifications = EXCLUDED.notifications, updated_at = NOW()
       RETURNING *`,
            [user.id, theme, language, notifications]
        );

        return corsResponse(rows[0], request);
    } catch (error) {
        console.error('POST /api/user_settings error:', error);
        return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
    }
}
