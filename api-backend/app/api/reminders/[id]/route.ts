import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import { corsResponse, handleCorsOptions } from '@/lib/cors';

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

        const result = await db.query(
            'DELETE FROM task_reminders WHERE id = $1 RETURNING *',
            [reminderId]
        );

        if (result.rows.length === 0) {
            return corsResponse({ error: 'Rappel non trouvé' }, request, { status: 404 });
        }

        return corsResponse({ message: 'Rappel supprimé avec succès' }, request);
    } catch (error: any) {
        console.error('Error deleting reminder:', error);
        return corsResponse({ error: error.message }, request, { status: 500 });
    }
}
