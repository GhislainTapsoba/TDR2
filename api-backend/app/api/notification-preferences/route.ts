import { NextRequest } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { handleCorsOptions, corsResponse } from '@/lib/cors';

export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

// GET /api/notification-preferences - Get user notification preferences
export async function GET(request: NextRequest) {
    try {
        const user = await verifyAuth(request);
        if (!user) {
            return corsResponse({ error: 'Non autorisé' }, request, { status: 401 });
        }

        const { rows } = await db.query(
            'SELECT * FROM notification_preferences WHERE user_id = $1',
            [user.id]
        );

        if (rows.length === 0) {
            // Create default preferences if not exists
            const { rows: newRows } = await db.query(
                `INSERT INTO notification_preferences (user_id)
         VALUES ($1)
         RETURNING *`,
                [user.id]
            );
            return corsResponse(newRows[0], request);
        }

        return corsResponse(rows[0], request);
    } catch (error) {
        console.error('GET /api/notification-preferences error:', error);
        return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
    }
}

// PUT /api/notification-preferences - Update notification preferences
export async function PUT(request: NextRequest) {
    try {
        const user = await verifyAuth(request);
        if (!user) {
            return corsResponse({ error: 'Non autorisé' }, request, { status: 401 });
        }

        const body = await request.json();
        const {
            email_task_assigned,
            email_task_updated,
            email_task_due,
            email_stage_completed,
            email_project_created,
            push_notifications,
            daily_summary,
        } = body;

        // Check if preferences exist
        const { rows: existingRows } = await db.query(
            'SELECT id FROM notification_preferences WHERE user_id = $1',
            [user.id]
        );

        if (existingRows.length === 0) {
            // Create preferences
            const { rows } = await db.query(
                `INSERT INTO notification_preferences (
          user_id, email_task_assigned, email_task_updated, email_task_due,
          email_stage_completed, email_project_created, push_notifications, daily_summary
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
                [
                    user.id,
                    email_task_assigned !== undefined ? email_task_assigned : true,
                    email_task_updated !== undefined ? email_task_updated : true,
                    email_task_due !== undefined ? email_task_due : true,
                    email_stage_completed !== undefined ? email_stage_completed : false,
                    email_project_created !== undefined ? email_project_created : true,
                    push_notifications !== undefined ? push_notifications : true,
                    daily_summary !== undefined ? daily_summary : false,
                ]
            );
            return corsResponse(rows[0], request);
        }

        // Update preferences
        const { rows } = await db.query(
            `UPDATE notification_preferences
       SET email_task_assigned = COALESCE($1, email_task_assigned),
           email_task_updated = COALESCE($2, email_task_updated),
           email_task_due = COALESCE($3, email_task_due),
           email_stage_completed = COALESCE($4, email_stage_completed),
           email_project_created = COALESCE($5, email_project_created),
           push_notifications = COALESCE($6, push_notifications),
           daily_summary = COALESCE($7, daily_summary),
           updated_at = NOW()
       WHERE user_id = $8
       RETURNING *`,
            [
                email_task_assigned,
                email_task_updated,
                email_task_due,
                email_stage_completed,
                email_project_created,
                push_notifications,
                daily_summary,
                user.id,
            ]
        );

        return corsResponse(rows[0], request);
    } catch (error) {
        console.error('PUT /api/notification-preferences error:', error);
        return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
    }
}
