import { NextRequest } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { handleCorsOptions, corsResponse } from '@/lib/cors';

export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

// PUT /api/comments/[id] - Update a comment
// @ts-ignore
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await verifyAuth(request);
        if (!user) {
            return corsResponse({ error: 'Non autorisé' }, request, { status: 401 });
        }

        const { id } = params;
        const body = await request.json();
        const { content } = body;

        if (!content) {
            return corsResponse({ error: 'Le contenu est requis' }, request, { status: 400 });
        }

        // Check if comment exists and user is author
        const { rows: commentRows } = await db.query(
            'SELECT * FROM comments WHERE id = $1',
            [id]
        );

        if (commentRows.length === 0) {
            return corsResponse({ error: 'Commentaire introuvable' }, request, { status: 404 });
        }

        if (commentRows[0].author_id !== user.id) {
            return corsResponse({ error: 'Permission refusée' }, request, { status: 403 });
        }

        const { rows } = await db.query(
            `UPDATE comments
       SET content = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
            [content, id]
        );

        return corsResponse(rows[0], request);
    } catch (error) {
        console.error('PUT /api/comments/[id] error:', error);
        return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
    }
}

// DELETE /api/comments/[id] - Delete a comment
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await verifyAuth(request);
        if (!user) {
            return corsResponse({ error: 'Non autorisé' }, request, { status: 401 });
        }

        const { id } = params;

        // Check if comment exists and user is author
        const { rows: commentRows } = await db.query(
            'SELECT * FROM comments WHERE id = $1',
            [id]
        );

        if (commentRows.length === 0) {
            return corsResponse({ error: 'Commentaire introuvable' }, request, { status: 404 });
        }

        if (commentRows[0].author_id !== user.id) {
            return corsResponse({ error: 'Permission refusée' }, request, { status: 403 });
        }

        await db.query('DELETE FROM comments WHERE id = $1', [id]);

        return corsResponse({ message: 'Commentaire supprimé avec succès' }, request);
    } catch (error) {
        console.error('DELETE /api/comments/[id] error:', error);
        return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
    }
}
