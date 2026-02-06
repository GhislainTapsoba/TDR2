import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import { corsResponse, handleCorsOptions } from '@/lib/cors';

export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

// PUT /api/responses/[id] - Update response
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
        const responseId = id;
        const { response } = await request.json();

        if (!response) {
            return corsResponse({ error: 'response requis' }, request, { status: 400 });
        }

        // Check ownership
        const checkResult = await db.query(
            'SELECT user_id FROM task_responses WHERE id = $1',
            [responseId]
        );

        if (checkResult.rows.length === 0) {
            return corsResponse({ error: 'Réponse non trouvée' }, request, { status: 404 });
        }

        if (checkResult.rows[0].user_id !== user.id && user.role !== 'admin') {
            return corsResponse({ error: 'Permission refusée' }, request, { status: 403 });
        }

        const result = await db.query(
            `UPDATE task_responses
       SET response = $1, responded_at = NOW()
       WHERE id = $2
       RETURNING *`,
            [response, responseId]
        );

        return corsResponse({ data: result.rows[0] }, request);
    } catch (error: any) {
        console.error('Error updating response:', error);
        return corsResponse({ error: error.message }, request, { status: 500 });
    }
}

// DELETE /api/responses/[id] - Delete response
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
        const responseId = id;

        // Check ownership
        const checkResult = await db.query(
            'SELECT user_id FROM task_responses WHERE id = $1',
            [responseId]
        );

        if (checkResult.rows.length === 0) {
            return corsResponse({ error: 'Réponse non trouvée' }, request, { status: 404 });
        }

        if (checkResult.rows[0].user_id !== user.id && user.role !== 'admin') {
            return corsResponse({ error: 'Permission refusée' }, request, { status: 403 });
        }

        await db.query('DELETE FROM task_responses WHERE id = $1', [responseId]);

        return corsResponse({ message: 'Réponse supprimée avec succès' }, request);
    } catch (error: any) {
        console.error('Error deleting response:', error);
        return corsResponse({ error: error.message }, request, { status: 500 });
    }
}
