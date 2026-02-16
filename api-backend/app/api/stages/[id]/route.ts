import { NextRequest } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { handleCorsOptions, corsResponse } from '@/lib/cors';
import { mapDbRoleToUserRole, requirePermission, canManageProject, canWorkOnProject } from '@/lib/permissions';
import { createActivityLog } from '@/lib/activity-logger';

export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

// GET /api/stages/[id] - Get a single stage
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await verifyAuth(request);
        if (!user) {
            return corsResponse({ error: 'Non autorisé' }, request, { status: 401 });
        }

        const { id } = await params;

        const { rows } = await db.query(
            `SELECT s.*, p.title as project_title, p.manager_id, p.id as project_id
       FROM stages s
       LEFT JOIN projects p ON s.project_id = p.id
       WHERE s.id = $1`,
            [id]
        );

        if (rows.length === 0) {
            return corsResponse({ error: 'Étape introuvable' }, request, { status: 404 });
        }

        const stage = rows[0];
        const userRole = mapDbRoleToUserRole(user.role);

        // Check permissions: admin can see all stages, others must be manager or member of project
        if (userRole !== 'admin') {
            const canManage = canManageProject(userRole, user.id, stage.manager_id);
            const canWork = await canWorkOnProject(user.id, stage.project_id);

            if (!canManage && !canWork) {
                return corsResponse({ error: 'Permission refusée' }, request, { status: 403 });
            }
        }

        return corsResponse(stage, request);
    } catch (error) {
        console.error('GET /api/stages/[id] error:', error);
        return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
    }
}

// PUT /api/stages/[id] - Update a stage
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
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

        const { id } = await params;
        const body = await request.json();
        const { name, description, status, position, duration } = body;

        // Get current stage with project info
        const { rows: stageRows } = await db.query(
            'SELECT s.*, p.manager_id, p.id as project_id FROM stages s JOIN projects p ON s.project_id = p.id WHERE s.id = $1',
            [id]
        );

        if (stageRows.length === 0) {
            return corsResponse({ error: 'Étape introuvable' }, request, { status: 404 });
        }

        const currentStage = stageRows[0];

        // Check permissions
        const canManage = canManageProject(userRole, user.id, currentStage.manager_id);
        const canWork = await canWorkOnProject(user.id, currentStage.project_id);

        if (!canManage && !canWork) {
            return corsResponse({ error: 'Permission refusée' }, request, { status: 403 });
        }

        // For employees, only allow status changes
        if (!canManage && userRole === 'employee') {
            const allowedFields = ['status'];
            const requestedFields = Object.keys(body);
            const hasInvalidFields = requestedFields.some(field => !allowedFields.includes(field));

            if (hasInvalidFields) {
                return corsResponse({ error: 'Les employés ne peuvent modifier que le statut des étapes' }, request, { status: 403 });
            }
        }

        // Update stage
        const { rows: updatedRows } = await db.query(
            `UPDATE stages
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           status = COALESCE($3, status),
           position = COALESCE($4, position),
           duration = COALESCE($5, duration),
           updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
            [name, description, status, position, duration, id]
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
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await verifyAuth(request);
        if (!user) {
            return corsResponse({ error: 'Non autorisé' }, request, { status: 401 });
        }

        const userRole = mapDbRoleToUserRole(user.role);
        const hasPermission = await requirePermission(userRole, 'stages', 'delete');
        if (!hasPermission.allowed) {
            return corsResponse({ error: hasPermission.error || 'Permission refusée' }, request, { status: 403 });
        }

        const { id } = await params;

        // Check if stage exists and user can delete it
        const { rows: stageRows } = await db.query(
            'SELECT s.*, p.manager_id FROM stages s LEFT JOIN projects p ON s.project_id = p.id WHERE s.id = $1',
            [id]
        );

        if (stageRows.length === 0) {
            return corsResponse({ error: 'Étape introuvable' }, request, { status: 404 });
        }

        // Check if user can manage project or work on it
        const canManage = canManageProject(userRole, user.id, stageRows[0].manager_id);
        const canWork = await canWorkOnProject(user.id, stageRows[0].project_id);

        if (!canManage && !canWork) {
            return corsResponse({ error: 'Permission refusée pour cette étape' }, request, { status: 403 });
        }

        // Delete stage
        await db.query('DELETE FROM stages WHERE id = $1', [id]);

        // Create activity log for stage deletion
        await createActivityLog({
            userId: user.id,
            action: 'deleted',
            entityType: 'stage',
            entityId: id,
            description: `Étape "${stageRows[0].name}" supprimée`,
            details: {
                stage_name: stageRows[0].name,
                project_id: stageRows[0].project_id
            }
        });

        return corsResponse({ message: 'Étape supprimée avec succès' }, request, { status: 200 });
    } catch (error) {
        console.error('DELETE /api/stages/[id] error:', error);
        return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
    }
}
