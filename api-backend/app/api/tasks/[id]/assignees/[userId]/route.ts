import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import { corsResponse, handleCorsOptions } from '@/lib/cors';

export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

// DELETE /api/tasks/[id]/assignees/[userId] - Remove task assignee
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; userId: string }> }
) {
    try {
        const user = await verifyAuth(request);
        if (!user) {
            return corsResponse({ error: 'Non autorisé' }, request, { status: 401 });
        }

        const paramsResolved = await params;
        const taskId = paramsResolved.id;
        const userId = paramsResolved.userId;

        const result = await db.query(
            'DELETE FROM task_assignees WHERE task_id = $1 AND user_id = $2 RETURNING *',
            [taskId, userId]
        );

        if (result.rows.length === 0) {
            return corsResponse({ error: 'Assignation non trouvée' }, request, { status: 404 });
        }

        return corsResponse({ message: 'Assignation retirée avec succès' }, request);
    } catch (error: any) {
        console.error('Error removing task assignee:', error);
        return corsResponse({ error: error.message }, request, { status: 500 });
    }
}
