import { NextRequest } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { handleCorsOptions, corsResponse } from '@/lib/cors';
import { mapDbRoleToUserRole, requirePermission, canManageProject, canWorkOnProject } from '@/lib/permissions';
import { sendTaskAssignmentEmail, sendTaskUpdateEmail, createConfirmationToken } from '@/lib/email';

export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

// GET /api/tasks - Get all tasks
export async function GET(request: NextRequest) {
    try {
        const user = await verifyAuth(request);
        if (!user) {
            return corsResponse({ error: 'Non autorisé' }, request, { status: 401 });
        }

        const userRole = mapDbRoleToUserRole(user.role);
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const project_id = searchParams.get('project_id');
        const assigned_to_me = searchParams.get('assigned_to_me');

        // Handle "new" project case - return empty tasks list
        if (project_id === 'new') {
            return corsResponse([], request);
        }

        let query = `
      SELECT t.*, p.title as project_title, s.name as stage_name, c.name as created_by_name,
             (SELECT json_agg(json_build_object('id', u.id, 'name', u.name, 'email', u.email))
              FROM task_assignees ta
              JOIN users u ON ta.user_id = u.id
              WHERE ta.task_id = t.id) as assignees
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN stages s ON t.stage_id = s.id
      LEFT JOIN users c ON t.created_by_id = c.id
    `;

        const params: any[] = [];
        const whereClauses: string[] = [];

        // Filter by role
        if (userRole !== 'admin') {
            whereClauses.push(`(EXISTS (
        SELECT 1 FROM task_assignees ta WHERE ta.task_id = t.id AND ta.user_id = $${params.length + 1}
      ) OR t.project_id IN (
        SELECT id FROM projects WHERE manager_id = $${params.length + 1} OR created_by_id = $${params.length + 1}
      ))`);
            params.push(user.id);
        }

        // Filter by status
        if (status) {
            whereClauses.push(`t.status = $${params.length + 1}`);
            params.push(status);
        }

        // Filter by project
        if (project_id) {
            whereClauses.push(`t.project_id = $${params.length + 1}`);
            params.push(project_id);
        }

        // Filter by assigned_to_me
        if (assigned_to_me === 'true') {
            whereClauses.push(`EXISTS (
                SELECT 1 FROM task_assignees ta WHERE ta.task_id = t.id AND ta.user_id = $${params.length + 1}
            )`);
            params.push(user.id);
        }

        if (whereClauses.length > 0) {
            query += ' WHERE ' + whereClauses.join(' AND ');
        }

        query += ' ORDER BY t.created_at DESC';

        const { rows } = await db.query(query, params);

        return corsResponse(rows, request);
    } catch (error) {
        console.error('GET /api/tasks error:', error);
        return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
    }
}

// POST /api/tasks - Create a new task
export async function POST(request: NextRequest) {
    try {
        const user = await verifyAuth(request);
        if (!user) {
            return corsResponse({ error: 'Non autorisé' }, request, { status: 401 });
        }

        const userRole = mapDbRoleToUserRole(user.role);
        const perm = await requirePermission(userRole, 'tasks', 'create');
        if (!perm.allowed) {
            return corsResponse({ error: perm.error }, request, { status: 403 });
        }

        const body = await request.json();
        const { title, description, status = 'TODO', priority = 'MEDIUM', due_date, assignee_ids, project_id, stage_id } = body;

        // Parse assignee_ids if it's a string
        let parsedAssigneeIds = assignee_ids;
        if (typeof assignee_ids === 'string') {
            try {
                parsedAssigneeIds = JSON.parse(assignee_ids);
            } catch (e) {
                console.error('Error parsing assignee_ids:', e);
                parsedAssigneeIds = [];
            }
        }

        console.log('Task creation request body:', { title, description, status, priority, due_date, assignee_ids: parsedAssigneeIds, project_id, stage_id });

        if (!title || !project_id) {
            return corsResponse({ error: 'Le titre et le project_id sont requis' }, request, { status: 400 });
        }

        // Verify project exists and user can manage it
        const { rows: projectRows } = await db.query(
            'SELECT id, manager_id, title FROM projects WHERE id = $1',
            [project_id]
        );

        if (projectRows.length === 0) {
            return corsResponse({ error: 'Projet introuvable' }, request, { status: 404 });
        }

        const project = projectRows[0];

        // Check if user can manage project or work on it (for employees)
        const canManage = canManageProject(userRole, user.id, project.manager_id);
        const canWork = await canWorkOnProject(user.id, project_id);

        if (!canManage && !canWork) {
            return corsResponse({ error: 'Vous ne pouvez créer des tâches que sur les projets où vous êtes membre' }, request, { status: 403 });
        }

        // Create task
        const { rows: taskRows } = await db.query(
            `INSERT INTO tasks (title, description, status, priority, due_date, project_id, stage_id, created_by_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
            [title, description || null, status, priority, due_date || null, project_id, stage_id || null, user.id]
        );

        const task = taskRows[0];

        // Create activity log for task creation
        await db.query(
            'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
            [
                user.id,
                'created',
                'task',
                task.id,
                JSON.stringify({
                    description: `Tâche "${task.title}" créée`,
                    task_title: task.title,
                    project_id: task.project_id
                })
            ]
        );

        // Assign users and send emails
        if (parsedAssigneeIds && Array.isArray(parsedAssigneeIds) && parsedAssigneeIds.length > 0) {
            console.log('Assigning task to users:', parsedAssigneeIds);

            // Insert assignees
            for (const assigneeId of parsedAssigneeIds) {
                console.log('Inserting assignee:', assigneeId);
                await db.query(
                    'INSERT INTO task_assignees (task_id, user_id) VALUES ($1, $2)',
                    [task.id, assigneeId]
                );
            }

            // Get assignee details
            const { rows: assignees } = await db.query(
                'SELECT id, name, email FROM users WHERE id = ANY($1::uuid[])',
                [parsedAssigneeIds]
            );

            // Send email to each assignee
            for (const assignee of assignees) {
                try {
                    const confirmationToken = await createConfirmationToken({
                        type: 'TASK_ASSIGNMENT',
                        userId: assignee.id,
                        entityType: 'task',
                        entityId: task.id,
                        metadata: {
                            task_title: task.title,
                            project_name: project.title,
                        },
                    });

                    await sendTaskAssignmentEmail({
                        to: assignee.email,
                        recipientId: assignee.id,
                        recipientName: assignee.name || 'Utilisateur',
                        taskTitle: task.title,
                        taskId: task.id,
                        projectName: project.title,
                        assignedBy: user.name || user.email,
                        assignedById: user.id,
                        confirmationToken,
                    });

                    // Create notification
                    await db.query(
                        `INSERT INTO notifications (user_id, type, title, message, metadata)
             VALUES ($1, 'TASK_ASSIGNED', 'Nouvelle tâche assignée', $2, $3)`,
                        [
                            assignee.id,
                            `Vous avez été assigné à la tâche: ${task.title}`,
                            JSON.stringify({ task_id: task.id, project_id: task.project_id }),
                        ]
                    );
                } catch (emailError) {
                    console.error('Error sending email to assignee:', emailError);
                    // Continue even if email fails
                }
            }

            task.assignees = assignees;
        }

        return corsResponse(task, request, { status: 201 });
    } catch (error) {
        console.error('POST /api/tasks error:', error);
        return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
    }
}
