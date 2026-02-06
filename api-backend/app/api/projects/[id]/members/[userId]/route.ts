import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import { corsResponse, handleCorsOptions } from '@/lib/cors';

export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

// DELETE /api/projects/[id]/members/[userId] - Remove member from project
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
        const projectId = paramsResolved.id;
        const userId = paramsResolved.userId;

        // Check if user is project manager or admin
        const projectCheck = await db.query(
            'SELECT manager_id FROM projects WHERE id = $1',
            [projectId]
        );

        if (projectCheck.rows.length === 0) {
            return corsResponse({ error: 'Projet non trouvé' }, request, { status: 404 });
        }

        const isManager = projectCheck.rows[0].manager_id === user.id;
        const isAdmin = user.role === 'admin';

        if (!isManager && !isAdmin) {
            return corsResponse({ error: 'Permission refusée' }, request, { status: 403 });
        }

        // Remove member
        const result = await db.query(
            'DELETE FROM project_members WHERE project_id = $1 AND user_id = $2 RETURNING *',
            [projectId, userId]
        );

        if (result.rows.length === 0) {
            return corsResponse({ error: 'Membre non trouvé' }, request, { status: 404 });
        }

        return corsResponse({ message: 'Membre retiré avec succès' }, request);
    } catch (error: any) {
        console.error('Error removing project member:', error);
        return corsResponse({ error: error.message }, request, { status: 500 });
    }
}
