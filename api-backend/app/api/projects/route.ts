import { NextRequest } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { handleCorsOptions, corsResponse } from '@/lib/cors';
import { mapDbRoleToUserRole, requirePermission } from '@/lib/permissions';

export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

// GET /api/projects - Get all projects
export async function GET(request: NextRequest) {
    try {
        const user = await verifyAuth(request);
        if (!user) {
            return corsResponse({ error: 'Non autorisé' }, request, { status: 401 });
        }

        const userRole = mapDbRoleToUserRole(user.role);
        const perm = await requirePermission(userRole, 'projects', 'read');
        if (!perm.allowed) {
            return corsResponse({ error: perm.error }, request, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');

        let query = `
      SELECT p.id, p.title, p.description, p.start_date, p.end_date, p.due_date,
             p.status, p.manager_id, p.created_by_id, p.created_at, p.updated_at,
             m.name as manager_name, m.email as manager_email,
             c.name as created_by_name
      FROM projects p
      LEFT JOIN users m ON p.manager_id = m.id
      LEFT JOIN users c ON p.created_by_id = c.id
    `;

        const params: any[] = [];
        const whereClauses: string[] = [];

        // Filter by role
        if (userRole !== 'admin') {
            whereClauses.push(`(p.manager_id = $${params.length + 1} OR p.created_by_id = $${params.length + 1}
        OR EXISTS (
          SELECT 1 FROM tasks t
          JOIN task_assignees ta ON t.id = ta.task_id
          WHERE t.project_id = p.id AND ta.user_id = $${params.length + 1}
        ))`);
            params.push(user.id);
        }

        // Filter by status
        if (status) {
            whereClauses.push(`p.status = $${params.length + 1}`);
            params.push(status);
        }

        if (whereClauses.length > 0) {
            query += ' WHERE ' + whereClauses.join(' AND ');
        }

        query += ' ORDER BY p.created_at DESC';

        const { rows } = await db.query(query, params);

        const projects = rows.map(row => ({
            id: row.id,
            title: row.title,
            description: row.description,
            start_date: row.start_date,
            end_date: row.end_date,
            due_date: row.due_date,
            status: row.status,
            manager_id: row.manager_id,
            created_by_id: row.created_by_id,
            created_at: row.created_at,
            updated_at: row.updated_at,
            manager: row.manager_id ? {
                id: row.manager_id,
                name: row.manager_name,
                email: row.manager_email
            } : null,
            created_by: row.created_by_id ? {
                id: row.created_by_id,
                name: row.created_by_name
            } : null
        }));

        return corsResponse(projects, request);
    } catch (error) {
        console.error('GET /api/projects error:', error);
        return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
    }
}

// POST /api/projects - Create a new project
export async function POST(request: NextRequest) {
    try {
        const user = await verifyAuth(request);
        if (!user) {
            return corsResponse({ error: 'Non autorisé' }, request, { status: 401 });
        }

        const userRole = mapDbRoleToUserRole(user.role);
        const perm = await requirePermission(userRole, 'projects', 'create');
        if (!perm.allowed) {
            return corsResponse({ error: perm.error }, request, { status: 403 });
        }

        const body = await request.json();
        const { title, description, start_date, end_date, due_date, manager_id, status = 'PLANNING' } = body;

        if (!title) {
            return corsResponse({ error: 'Le titre est requis' }, request, { status: 400 });
        }

        // Only admin can assign a different manager
        let finalManagerId = manager_id;
        if (userRole !== 'admin' && manager_id && manager_id !== user.id) {
            finalManagerId = user.id;
        }

        const { rows } = await db.query(
            `INSERT INTO projects (title, description, start_date, end_date, due_date, status, manager_id, created_by_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, title, description, start_date, end_date, due_date, status, manager_id, created_by_id, created_at, updated_at`,
            [title, description || null, start_date || null, end_date || null, due_date || null, status, finalManagerId || null, user.id]
        );

        const project = rows[0];

        // Create activity log for project creation
        await db.query(
            'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
            [
                user.id,
                'created',
                'project',
                project.id,
                JSON.stringify({
                    description: `Projet "${project.title}" créé`,
                    project_title: project.title
                })
            ]
        );

        // Get manager info
        if (project.manager_id) {
            const { rows: managerRows } = await db.query(
                'SELECT name, email FROM users WHERE id = $1',
                [project.manager_id]
            );
            if (managerRows.length > 0) {
                project.manager = {
                    id: project.manager_id,
                    name: managerRows[0].name,
                    email: managerRows[0].email
                };
            }
        }

        return corsResponse(project, request, { status: 201 });
    } catch (error) {
        console.error('POST /api/projects error:', error);
        return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
    }
}
