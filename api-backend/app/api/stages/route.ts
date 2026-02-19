import { NextRequest } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { handleCorsOptions, corsResponse } from '@/lib/cors';
import { mapDbRoleToUserRole, requirePermission, canManageProject, canWorkOnProject } from '@/lib/permissions';
import { createActivityLog } from '@/lib/activity-logger';

export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

// GET /api/stages - Get all stages
export async function GET(request: NextRequest) {
    try {
        const user = await verifyAuth(request);
        if (!user) {
            return corsResponse({ error: 'Non autorisé' }, request, { status: 401 });
        }

        const userRole = mapDbRoleToUserRole(user.role);
        const { searchParams } = new URL(request.url);
        const project_id = searchParams.get('project_id');

        // Handle "new" project case - return empty stages list
        if (project_id === 'new') {
            return corsResponse([], request);
        }

        let query = `
      SELECT s.*, p.title as project_title, c.name as created_by_name
      FROM stages s
      LEFT JOIN projects p ON s.project_id = p.id
      LEFT JOIN users c ON s.created_by_id = c.id
      WHERE 1=1
    `;
        const params: any[] = [];
        const conditions: string[] = [];

        // Filter by project
        if (project_id) {
            conditions.push(`s.project_id = $${params.length + 1}`);
            params.push(project_id);
        }

        // Add role-based filtering
        if (userRole === 'employee') {
            conditions.push(`p.id IN (SELECT project_id FROM project_members WHERE user_id = $${params.length + 1})`);
            params.push(user.id);
        }
        // Managers and admins can see all stages - no additional filtering needed

        if (conditions.length > 0) {
            query += ' AND ' + conditions.join(' AND ');
        }

        query += ' ORDER BY s.position, s.created_at';

        const { rows } = await db.query(query, params);

        return corsResponse(rows, request, { status: 200 });
    } catch (error) {
        console.error('Get stages error:', error);
        return corsResponse(
            { error: 'Erreur serveur' },
            request,
            { status: 500 }
        );
    }
}

// POST /api/stages - Create a new stage
export async function POST(request: NextRequest) {
    try {
        const user = await verifyAuth(request);
        if (!user) {
            return corsResponse({ error: 'Non autorisé' }, request, { status: 401 });
        }

        const userRole = mapDbRoleToUserRole(user.role);
        const hasPermission = await requirePermission(userRole, 'stages', 'create');
        if (!hasPermission.allowed) {
            return corsResponse({ error: hasPermission.error || 'Permission refusée' }, request, { status: 403 });
        }

        const body = await request.json();
        const {
            name,
            description,
            position,
            duration,
            project_id,
        } = body;

        // Validate required fields
        if (!name || !project_id) {
            return corsResponse(
                { error: 'Nom et projet requis' },
                request,
                { status: 400 }
            );
        }

        // Check if project exists and user can manage it
        const { rows: projectRows } = await db.query(
            'SELECT manager_id FROM projects WHERE id = $1',
            [project_id]
        );

        if (projectRows.length === 0) {
            return corsResponse({ error: 'Projet introuvable' }, request, { status: 404 });
        }

        // Check if user can manage project or work on it
        const canManage = canManageProject(userRole, user.id, projectRows[0].manager_id);
        const canWork = await canWorkOnProject(user.id, project_id);

        // Managers and admins can create stages in any project
        // Employees can only create stages in projects they work on
        if (userRole === 'employee' && !canWork) {
            return corsResponse({ error: 'Permission refusée pour ce projet' }, request, { status: 403 });
        }
        // For managers and admins, no additional project-level restrictions needed

        // Insert stage
        const { rows } = await db.query(
            `INSERT INTO stages (name, description, position, duration, project_id, created_by_id, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', NOW(), NOW())
       RETURNING *`,
            [name, description, position || 0, duration, project_id, user.id]
        );

        const stage = rows[0];

        // Create activity log for stage creation
        await createActivityLog({
            userId: user.id,
            action: 'created',
            entityType: 'stage',
            entityId: stage.id,
            description: `Étape "${stage.name}" créée`,
            details: {
                stage_name: stage.name,
                project_id: stage.project_id
            }
        });

        return corsResponse(rows[0], request, { status: 201 });
    } catch (error) {
        console.error('Create stage error:', error);
        return corsResponse(
            { error: 'Erreur serveur' },
            request,
            { status: 500 }
        );
    }
}

// DELETE /api/stages - Delete a stage
export async function DELETE(request: NextRequest) {
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

        const { searchParams } = new URL(request.url);
        const stageId = searchParams.get('id');

        if (!stageId) {
            return corsResponse({ error: 'ID de l\'étape requis' }, request, { status: 400 });
        }

        // Check if stage exists and user can delete it
        const { rows: stageRows } = await db.query(
            'SELECT s.*, p.manager_id FROM stages s LEFT JOIN projects p ON s.project_id = p.id WHERE s.id = $1',
            [stageId]
        );

        if (stageRows.length === 0) {
            return corsResponse({ error: 'Étape introuvable' }, request, { status: 404 });
        }

        // Check if user can manage project or work on it
        const canManage = canManageProject(userRole, user.id, stageRows[0].manager_id);
        const canWork = await canWorkOnProject(user.id, stageRows[0].project_id);

        // Managers and admins can delete stages in any project
        // Employees can only delete stages in projects they work on
        if (userRole === 'employee' && !canWork) {
            return corsResponse({ error: 'Permission refusée pour cette étape' }, request, { status: 403 });
        }
        // For managers and admins, no additional project-level restrictions needed

        // Delete stage
        await db.query('DELETE FROM stages WHERE id = $1', [stageId]);

        // Create activity log for stage deletion
        await createActivityLog({
            userId: user.id,
            action: 'deleted',
            entityType: 'stage',
            entityId: stageId,
            description: `Étape "${stageRows[0].name}" supprimée`,
            details: {
                stage_name: stageRows[0].name,
                project_id: stageRows[0].project_id
            }
        });

        return corsResponse({ message: 'Étape supprimée avec succès' }, request, { status: 200 });
    } catch (error) {
        console.error('Delete stage error:', error);
        return corsResponse(
            { error: 'Erreur serveur' },
            request,
            { status: 500 }
        );
    }
}
