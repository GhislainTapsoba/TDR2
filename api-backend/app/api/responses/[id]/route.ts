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
    { params }: { params: { id: string } }
) {
    try {
        const authResult = await verifyAuth(request);
        if (!authResult.authenticated || !authResult.user) {
            return corsResponse({ error: 'Non authentifié' }, request, { status: 401 });
        }

        const responseId = params.id;
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

        if (checkResult.rows[0].user_id !== authResult.user.id && authResult.user.role !== 'admin') {
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
    { params }: { params: { id: string } }
) {
    try {
        const authResult = await verifyAuth(request);
        if (!authResult.authenticated || !authResult.user) {
            return corsResponse({ error: 'Non authentifié' }, request, { status: 401 });
        }

        const responseId = params.id;

        // Check ownership
        const checkResult = await db.query(
            'SELECT user_id FROM task_responses WHERE id = $1',
            [responseId]
        );

        if (checkResult.rows.length === 0) {
            return corsResponse({ error: 'Réponse non trouvée' }, request, { status: 404 });
        }

        if (checkResult.rows[0].user_id !== authResult.user.id && authResult.user.role !== 'admin') {
            return corsResponse({ error: 'Permission refusée' }, request, { status: 403 });
        }

        await db.query('DELETE FROM task_responses WHERE id = $1', [responseId]);

        return corsResponse({ message: 'Réponse supprimée avec succès' }, request);
    } catch (error: any) {
        console.error('Error deleting response:', error);
        return corsResponse({ error: error.message }, request, { status: 500 });
    }
}
