import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import { corsResponse, handleCorsOptions } from '@/lib/cors';
import ReminderService from '@/lib/reminderService';

export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
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
