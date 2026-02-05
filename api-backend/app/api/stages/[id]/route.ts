import { NextRequest } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { handleCorsOptions, corsResponse } from '@/lib/cors';
import { mapDbRoleToUserRole, requirePermission, canManageProject } from '@/lib/permissions';

export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

// GET /api/stages/[id] - Get a single stage
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
            `SELECT s.*, p.title as project_title, c.name as created_by_name
       FROM stages s
       LEFT JOIN projects p ON s.project_id = p.id
       LEFT JOIN users c ON s.created_by_id = c.id
       WHERE s.id = $1`,
            [id]
        );

        if (rows.length === 0) {
            return corsResponse({ error: 'Étape introuvable' }, request, { status: 404 });
        }

        return corsResponse(rows[0], request);
    } catch (error) {
        console.error('GET /api/stages/[id] error:', error);
        return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
    }
}

// PUT /api/stages/[id] - Update a stage
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await verifyAuth(request);
        if (!user) {
            return corsResponse({ error: 'Non autorisé' }, request, { status: 401 });
        }

        const userRole = mapDbRoleToUserRole(user.role);
        const perm = await requirePermission(userRole, 'stages', 'update');
        if (!perm.allowed) {
            return corsResponse({ error: perm.error }, request, { status: 403 });
        }

        const { id } = params;
        const body = await request.json();
        const { name, description, order, duration, status } = body;

        // Get current stage
        const { rows: stageRows } = await db.query(
            'SELECT s.*, p.manager_id FROM stages s JOIN projects p ON s.project_id = p.id WHERE s.id = $1',
            [id]
        );

        if (stageRows.length === 0) {
            return corsResponse({ error: 'Étape introuvable' }, request, { status: 404 });
        }

        const currentStage = stageRows[0];

        // Check permissions
        if (!canManageProject(userRole, user.id, currentStage.manager_id)) {
            return corsResponse({ error: 'Permission refusée' }, request, { status: 403 });
        }

        // Update stage
        const { rows: updatedRows } = await db.query(
            `UPDATE stages
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           "order" = COALESCE($3, "order"),
           duration = COALESCE($4, duration),
           status = COALESCE($5, status),
           updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
            [name, description, order, duration, status, id]
        );

        return corsResponse(updatedRows[0], request);
    } catch (error) {
        console.error('PUT /api/stages/[id] error:', error);
        return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
    }
}

// DELETE /api/stages/[id] - Delete a stage
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
        const perm = await requirePermission(userRole, 'stages', 'delete');
        if (!perm.allowed) {
            return corsResponse({ error: perm.error }, request, { status: 403 });
        }

        const { id } = params;

        // Check if stage exists
        const { rows: stageRows } = await db.query(
            'SELECT s.*, p.manager_id FROM stages s JOIN projects p ON s.project_id = p.id WHERE s.id = $1',
            [id]
        );

        if (stageRows.length === 0) {
            return corsResponse({ error: 'Étape introuvable' }, request, { status: 404 });
        }

        if (!canManageProject(userRole, user.id, stageRows[0].manager_id)) {
            return corsResponse({ error: 'Permission refusée' }, request, { status: 403 });
        }

        await db.query('DELETE FROM stages WHERE id = $1', [id]);

        return corsResponse({ message: 'Étape supprimée avec succès' }, request);
    } catch (error) {
        console.error('DELETE /api/stages/[id] error:', error);
        return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
    }
}
