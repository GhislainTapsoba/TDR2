import { NextRequest } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { handleCorsOptions, corsResponse } from '@/lib/cors';
import { mapDbRoleToUserRole, requirePermission, canManageProject } from '@/lib/permissions';

export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

// GET /api/projects/[id] - Get a single project
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Handle "new" project case
        if (id === 'new') {
            return corsResponse({
                id: 'new',
                title: '',
                description: '',
                start_date: null,
                end_date: null,
                due_date: null,
                status: 'PLANNING',
                created_by_id: null,
                manager_id: null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                stages: [],
                tasks: []
            }, request);
        }

        const user = await verifyAuth(request);
        if (!user) {
            return corsResponse({ error: 'Non autorisé' }, request, { status: 401 });
        }

        const { rows } = await db.query(
            `SELECT p.*, m.name as manager_name, m.email as manager_email, c.name as created_by_name
       FROM projects p
       LEFT JOIN users m ON p.manager_id = m.id
       LEFT JOIN users c ON p.created_by_id = c.id
       WHERE p.id = $1`,
            [id]
        );

        if (rows.length === 0) {
            return corsResponse({ error: 'Projet introuvable' }, request, { status: 404 });
        }

        const project = rows[0];
        const userRole = mapDbRoleToUserRole(user.role);

        // Check permissions: admin can see all projects, others must be manager or member or have tasks assigned
        if (userRole !== 'admin') {
            // Check if user is the manager
            if (project.manager_id !== user.id) {
                // Check if user is a member of the project
                const { rows: memberRows } = await db.query(
                    'SELECT user_id FROM project_members WHERE project_id = $1 AND user_id = $2',
                    [id, user.id]
                );

                // Check if user has tasks assigned in this project
                const { rows: taskAssigneeRows } = await db.query(
                    'SELECT 1 FROM task_assignees ta JOIN tasks t ON ta.task_id = t.id WHERE t.project_id = $1 AND ta.user_id = $2 LIMIT 1',
                    [id, user.id]
                );

                if (memberRows.length === 0 && taskAssigneeRows.length === 0) {
                    return corsResponse({ error: 'Accès non autorisé à ce projet' }, request, { status: 403 });
                }
            }
        }

        return corsResponse({
            ...project,
            manager: project.manager_id ? {
                id: project.manager_id,
                name: project.manager_name,
                email: project.manager_email
            } : null
        }, request);
    } catch (error) {
        console.error('GET /api/projects/[id] error:', error);
        return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
    }
}

// PUT /api/projects/[id] - Update a project
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
        const perm = await requirePermission(userRole, 'projects', 'update');
        if (!perm.allowed) {
            return corsResponse({ error: perm.error }, request, { status: 403 });
        }

        const { id } = await params;
        const body = await request.json();
        const { title, description, start_date, end_date, due_date, manager_id, status } = body;

        // Check if project exists and user can manage it
        const { rows: projectRows } = await db.query(
            'SELECT manager_id FROM projects WHERE id = $1',
            [id]
        );

        if (projectRows.length === 0) {
            return corsResponse({ error: 'Projet introuvable' }, request, { status: 404 });
        }

        if (!canManageProject(userRole, user.id, projectRows[0].manager_id)) {
            return corsResponse({ error: 'Permission refusée' }, request, { status: 403 });
        }

        const { rows } = await db.query(
            `UPDATE projects
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           start_date = COALESCE($3, start_date),
           end_date = COALESCE($4, end_date),
           due_date = COALESCE($5, due_date),
           manager_id = COALESCE($6, manager_id),
           status = COALESCE($7, status),
           updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
            [title, description, start_date, end_date, due_date, manager_id, status, id]
        );

        return corsResponse(rows[0], request);
    } catch (error) {
        console.error('PUT /api/projects/[id] error:', error);
        return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
    }
}

// DELETE /api/projects/[id] - Delete a project
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
        const perm = await requirePermission(userRole, 'projects', 'delete');
        if (!perm.allowed) {
            return corsResponse({ error: perm.error }, request, { status: 403 });
        }

        const { id } = await params;

        // Check if project exists
        const { rows: projectRows } = await db.query(
            'SELECT manager_id FROM projects WHERE id = $1',
            [id]
        );

        if (projectRows.length === 0) {
            return corsResponse({ error: 'Projet introuvable' }, request, { status: 404 });
        }

        if (!canManageProject(userRole, user.id, projectRows[0].manager_id)) {
            return corsResponse({ error: 'Permission refusée' }, request, { status: 403 });
        }

        await db.query('DELETE FROM projects WHERE id = $1', [id]);

        return corsResponse({ message: 'Projet supprimé avec succès' }, request);
    } catch (error) {
        console.error('DELETE /api/projects/[id] error:', error);
        return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
    }
}
