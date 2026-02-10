import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import { corsResponse, handleCorsOptions } from '@/lib/cors';
import ReminderService from '@/lib/reminderService';

export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

// PUT /api/reminders/[id] - Update reminder
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await verifyAuth(request);
        if (!user) {
            return corsResponse({ error: 'Non autorisé' }, request, { status: 401 });
        }

        const { id } = await params;
        const reminderId = id;
        const body = await request.json();
        const { reminder_time, reminder_type, message, is_active } = body;

        // Check if reminder exists and belongs to user
        const { rows: existingRows } = await db.query(
            'SELECT user_id FROM reminders WHERE id = $1',
            [reminderId]
        );

        if (existingRows.length === 0) {
            return corsResponse({ error: 'Rappel non trouvé' }, request, { status: 404 });
        }

        if (existingRows[0].user_id !== user.id) {
            return corsResponse({ error: 'Non autorisé' }, request, { status: 403 });
        }

        // Update reminder
        const { rows } = await db.query(
            `UPDATE reminders 
             SET reminder_time = COALESCE($1, reminder_time),
                 reminder_type = COALESCE($2, reminder_type),
                 message = COALESCE($3, message),
                 is_active = COALESCE($4, is_active),
                 updated_at = NOW()
             WHERE id = $5
             RETURNING *`,
            [reminder_time, reminder_type, message, is_active, reminderId]
        );

        return corsResponse(rows[0], request);
    } catch (error) {
        console.error('PUT /api/reminders/[id] error:', error);
        return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
    }
}

// DELETE /api/reminders/[id] - Delete reminder
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await verifyAuth(request);
        if (!user) {
            return corsResponse({ error: 'Non autorisé' }, request, { status: 401 });
        }

        const { id } = await params;
        const reminderId = id;

        // Vérifier que le rappel appartient à l'utilisateur
        const { rows } = await db.query(
            'SELECT user_id FROM reminders WHERE id = $1',
            [reminderId]
        );

        if (rows.length === 0) {
            return corsResponse({ error: 'Rappel non trouvé' }, request, { status: 404 });
        }

        if (rows[0].user_id !== user.id) {
            return corsResponse({ error: 'Non autorisé' }, request, { status: 403 });
        }

        const reminderService = ReminderService.getInstance();
        await reminderService.cancelReminder(reminderId);

        return corsResponse({ message: 'Rappel supprimé avec succès' }, request);
    } catch (error: any) {
        console.error('Error deleting reminder:', error);
        return corsResponse({ error: error.message }, request, { status: 500 });
    }
}
