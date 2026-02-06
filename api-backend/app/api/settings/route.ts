import { NextRequest } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { handleCorsOptions, corsResponse } from '@/lib/cors';

export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

// GET /api/settings - Get current user settings
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

        if (rows.length === 0) {
            // Create default settings if not exists
            const { rows: newRows } = await db.query(
                `INSERT INTO user_settings (user_id)
         VALUES ($1)
         RETURNING *`,
                [user.id]
            );
            return corsResponse(newRows[0], request);
        }

        return corsResponse(rows[0], request);
    } catch (error) {
        console.error('GET /api/settings error:', error);
        return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
    }
}

// PUT /api/settings - Update user settings
export async function PUT(request: NextRequest) {
    try {
        const user = await verifyAuth(request);
        if (!user) {
            return corsResponse({ error: 'Non autorisé' }, request, { status: 401 });
        }

        const body = await request.json();
        const {
            language,
            timezone,
            notifications_enabled,
            email_notifications,
            theme,
            date_format,
            items_per_page,
            font_size,
            compact_mode,
        } = body;

        // Check if settings exist
        const { rows: existingRows } = await db.query(
            'SELECT user_id FROM user_settings WHERE user_id = $1',
            [user.id]
        );

        if (existingRows.length === 0) {
            // Create settings
            const { rows } = await db.query(
                `INSERT INTO user_settings (
          user_id, language, timezone, notifications_enabled, email_notifications,
          theme, date_format, items_per_page, font_size, compact_mode
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
                [
                    user.id,
                    language || 'fr',
                    timezone || 'Europe/Paris',
                    notifications_enabled !== undefined ? notifications_enabled : true,
                    email_notifications !== undefined ? email_notifications : true,
                    theme || 'light',
                    date_format || 'DD/MM/YYYY',
                    items_per_page || 20,
                    font_size || 'medium',
                    compact_mode !== undefined ? compact_mode : false,
                ]
            );
            return corsResponse(rows[0], request);
        }

        // Update settings
        const { rows } = await db.query(
            `UPDATE user_settings
       SET language = COALESCE($1, language),
           timezone = COALESCE($2, timezone),
           notifications_enabled = COALESCE($3, notifications_enabled),
           email_notifications = COALESCE($4, email_notifications),
           theme = COALESCE($5, theme),
           date_format = COALESCE($6, date_format),
           items_per_page = COALESCE($7, items_per_page),
           font_size = COALESCE($8, font_size),
           compact_mode = COALESCE($9, compact_mode),
           updated_at = NOW()
       WHERE user_id = $10
       RETURNING *`,
            [
                language,
                timezone,
                notifications_enabled,
                email_notifications,
                theme,
                date_format,
                items_per_page,
                font_size,
                compact_mode,
                user.id,
            ]
        );

        return corsResponse(rows[0], request);
    } catch (error) {
        console.error('PUT /api/settings error:', error);
        return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
    }
}
