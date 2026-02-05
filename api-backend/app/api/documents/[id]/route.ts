import { NextRequest } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { handleCorsOptions, corsResponse } from '@/lib/cors';
import { mapDbRoleToUserRole, requirePermission } from '@/lib/permissions';

export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

// GET /api/documents/[id] - Get a single document
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await verifyAuth(request);
        if (!user) {
            return corsResponse({ error: 'Non autorisé' }, request, { status: 401 });
        }

        const { id } = params;

        const { rows } = await db.query(
            `SELECT d.*, p.title as project_title, t.title as task_title, u.name as uploaded_by_name
       FROM documents d
       LEFT JOIN projects p ON d.project_id = p.id
       LEFT JOIN tasks t ON d.task_id = t.id
       LEFT JOIN users u ON d.uploaded_by = u.id
       WHERE d.id = $1`,
            [id]
        );

        if (rows.length === 0) {
            return corsResponse({ error: 'Document introuvable' }, request, { status: 404 });
        }

        return corsResponse(rows[0], request);
    } catch (error) {
        console.error('GET /api/documents/[id] error:', error);
        return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
    }
}

// DELETE /api/documents/[id] - Delete a document
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await verifyAuth(request);
        if (!user) {
            return corsResponse({ error: 'Non autorisé' }, request, { status: 401 });
        }

        const userRole = mapDbRoleToUserRole(user.role);
        const perm = await requirePermission(userRole, 'documents', 'delete');
        if (!perm.allowed) {
            return corsResponse({ error: perm.error }, request, { status: 403 });
        }

        const { id } = params;

        // Check if document exists
        const { rows: docRows } = await db.query(
            'SELECT * FROM documents WHERE id = $1',
            [id]
        );

        if (docRows.length === 0) {
            return corsResponse({ error: 'Document introuvable' }, request, { status: 404 });
        }

        // Only admin or uploader can delete
        if (userRole !== 'admin' && docRows[0].uploaded_by !== user.id) {
            return corsResponse({ error: 'Permission refusée' }, request, { status: 403 });
        }

        await db.query('DELETE FROM documents WHERE id = $1', [id]);

        return corsResponse({ message: 'Document supprimé avec succès' }, request);
    } catch (error) {
        console.error('DELETE /api/documents/[id] error:', error);
        return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
    }
}
