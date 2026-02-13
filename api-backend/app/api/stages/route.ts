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

        // Check if user can manage project or work on it (for employees)
        const canManage = canManageProject(userRole, user.id, projectRows[0].manager_id);
        const canWork = await canWorkOnProject(user.id, project_id);

        if (!canManage && !canWork) {
            return corsResponse({ error: 'Permission refusée pour ce projet' }, request, { status: 403 });
        }

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
