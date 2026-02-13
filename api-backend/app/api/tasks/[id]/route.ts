import { NextRequest } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { handleCorsOptions, corsResponse } from '@/lib/cors';
import { mapDbRoleToUserRole, requirePermission, canManageProject, canWorkOnProject } from '@/lib/permissions';
import { sendTaskUpdateEmail, createConfirmationToken } from '@/lib/email';

export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

// GET /api/tasks/[id] - Get a single task
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
            `SELECT t.*, p.title as project_title, s.name as stage_name, c.name as created_by_name, p.manager_id,
              (SELECT json_agg(json_build_object('id', u.id, 'name', u.name, 'email', u.email))
               FROM task_assignees ta
               JOIN users u ON ta.user_id = u.id
               WHERE ta.task_id = t.id) as assignees
       FROM tasks t
       LEFT JOIN projects p ON t.project_id = p.id
       LEFT JOIN stages s ON t.stage_id = s.id
       LEFT JOIN users c ON t.created_by_id = c.id
       WHERE t.id = $1`,
            [id]
        );

        if (rows.length === 0) {
            return corsResponse({ error: 'Tâche introuvable' }, request, { status: 404 });
        }

        const task = rows[0];
        const userRole = mapDbRoleToUserRole(user.role);

        // Check permissions: admin can see all tasks, others must be manager, member of the project, or assigned to the task
        if (userRole !== 'admin') {
            // Check if user is the project manager
            if (task.manager_id !== user.id) {
                // Check if user is a member of the project
                const { rows: memberRows } = await db.query(
                    'SELECT user_id FROM project_members WHERE project_id = $1 AND user_id = $2',
                    [task.project_id, user.id]
                );

                // Check if user is assigned to this task
                const { rows: assigneeRows } = await db.query(
                    'SELECT user_id FROM task_assignees WHERE task_id = $1 AND user_id = $2',
                    [id, user.id]
                );

                if (memberRows.length === 0 && assigneeRows.length === 0) {
                    return corsResponse({ error: 'Accès non autorisé à cette tâche' }, request, { status: 403 });
                }
            }
        }

        return corsResponse(rows[0], request);
    } catch (error) {
        console.error('GET /api/tasks/[id] error:', error);
        return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
    }
}

// PUT /api/tasks/[id] - Update a task
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
        const perm = await requirePermission(userRole, 'tasks', 'update');
        if (!perm.allowed) {
            return corsResponse({ error: perm.error }, request, { status: 403 });
        }

        const { id } = await params;
        const body = await request.json();
        const { title, description, status, priority, due_date, assignee_ids, stage_id, refusal_reason } = body;

        // Get current task
        const { rows: taskRows } = await db.query(
            'SELECT t.*, p.manager_id, p.title as project_title FROM tasks t JOIN projects p ON t.project_id = p.id WHERE t.id = $1',
            [id]
        );

        if (taskRows.length === 0) {
            return corsResponse({ error: 'Tâche introuvable' }, request, { status: 404 });
        }

        const currentTask = taskRows[0];

        // Check permissions
        const canManage = canManageProject(userRole, user.id, currentTask.manager_id);
        const canWork = await canWorkOnProject(user.id, currentTask.project_id);

        if (!canManage && !canWork) {
            return corsResponse({ error: 'Permission refusée' }, request, { status: 403 });
        }

        // For employees, only allow status updates and only if they are assigned to the task
        if (!canManage && userRole === 'employee') {
            const { rows: assigneeCheck } = await db.query(
                'SELECT 1 FROM task_assignees WHERE task_id = $1 AND user_id = $2',
                [id, user.id]
            );
            if (assigneeCheck.length === 0) {
                return corsResponse({ error: 'Permission refusée' }, request, { status: 403 });
            }

            // For employees, only allow status changes
            const allowedFields = ['status'];
            const requestedFields = Object.keys(body);
            const hasInvalidFields = requestedFields.some(field => !allowedFields.includes(field));

            if (hasInvalidFields) {
                return corsResponse({ error: 'Les employés ne peuvent modifier que le statut des tâches' }, request, { status: 403 });
            }
        }

        // Update task
        const { rows: updatedRows } = await db.query(
            `UPDATE tasks
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           status = COALESCE($3, status),
           priority = COALESCE($4, priority),
           due_date = COALESCE($5, due_date),
           stage_id = COALESCE($6, stage_id),
           refusal_reason = COALESCE($7, refusal_reason),
           updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
            [title, description, status, priority, due_date, stage_id, refusal_reason, id]
        );

        const updatedTask = updatedRows[0];

        // Handle assignee changes
        if (assignee_ids && Array.isArray(assignee_ids)) {
            // Get current assignees
            const { rows: currentAssignees } = await db.query(
                'SELECT user_id FROM task_assignees WHERE task_id = $1',
                [id]
            );
            const currentAssigneeIds = currentAssignees.map(a => a.user_id);

            // Find new assignees
            const newAssigneeIds = assignee_ids.filter(id => !currentAssigneeIds.includes(id));

            // Remove old assignees
            const removedAssigneeIds = currentAssigneeIds.filter(id => !assignee_ids.includes(id));

            // Delete removed assignees
            if (removedAssigneeIds.length > 0) {
                await db.query(
                    'DELETE FROM task_assignees WHERE task_id = $1 AND user_id = ANY($2::uuid[])',
                    [id, removedAssigneeIds]
                );
            }

            // Add new assignees and send emails
            if (newAssigneeIds.length > 0) {
                for (const assigneeId of newAssigneeIds) {
                    await db.query(
                        'INSERT INTO task_assignees (task_id, user_id) VALUES ($1, $2)',
                        [id, assigneeId]
                    );
                }

                // Get new assignee details and send emails
                const { rows: newAssignees } = await db.query(
                    'SELECT id, name, email FROM users WHERE id = ANY($1::uuid[])',
                    [newAssigneeIds]
                );

                for (const assignee of newAssignees) {
                    try {
                        const confirmationToken = await createConfirmationToken({
                            type: 'TASK_ASSIGNMENT',
                            userId: assignee.id,
                            entityType: 'task',
                            entityId: id,
                            metadata: {
                                task_title: updatedTask.title,
                                project_name: currentTask.project_title,
                            },
                        });

                        await sendTaskUpdateEmail({
                            to: assignee.email,
                            recipientId: assignee.id,
                            recipientName: assignee.name || 'Utilisateur',
                            taskTitle: updatedTask.title,
                            taskId: id,
                            projectName: currentTask.project_title,
                            updatedBy: user.name || user.email,
                            updatedById: user.id,
                            changes: 'Vous avez été assigné à cette tâche',
                        });

                        await db.query(
                            `INSERT INTO notifications (user_id, type, title, message, metadata)
               VALUES ($1, 'TASK_UPDATED', 'Tâche mise à jour', $2, $3)`,
                            [
                                assignee.id,
                                `Vous avez été assigné à la tâche: ${updatedTask.title}`,
                                JSON.stringify({ task_id: id, project_id: updatedTask.project_id }),
                            ]
                        );
                    } catch (emailError) {
                        console.error('Error sending email:', emailError);
                    }
                }
            }
        }

        // Get final task with assignees
        const { rows: finalRows } = await db.query(
            `SELECT t.*, p.title as project_title, s.name as stage_name,
              (SELECT json_agg(json_build_object('id', u.id, 'name', u.name, 'email', u.email))
               FROM task_assignees ta
               JOIN users u ON ta.user_id = u.id
               WHERE ta.task_id = t.id) as assignees
       FROM tasks t
       LEFT JOIN projects p ON t.project_id = p.id
       LEFT JOIN stages s ON t.stage_id = s.id
       WHERE t.id = $1`,
            [id]
        );

        return corsResponse(finalRows[0], request);
    } catch (error) {
        console.error('PUT /api/tasks/[id] error:', error);
        return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
    }
}

// Create activity log for task update helper function
async function createTaskUpdateActivity(userId: string, taskId: string, changes: string) {
    await db.query(
        'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
        [
            userId,
            'updated',
            'task',
            taskId,
            JSON.stringify({
                description: `Tâche mise à jour: ${changes}`,
                changes: changes
            })
        ]
    );
}

// DELETE /api/tasks/[id] - Delete a task
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
        const perm = await requirePermission(userRole, 'tasks', 'delete');
        if (!perm.allowed) {
            return corsResponse({ error: perm.error }, request, { status: 403 });
        }

        const { id } = await params;

        // Check if task exists
        const { rows: taskRows } = await db.query(
            'SELECT t.*, p.manager_id FROM tasks t JOIN projects p ON t.project_id = p.id WHERE t.id = $1',
            [id]
        );

        if (taskRows.length === 0) {
            return corsResponse({ error: 'Tâche introuvable' }, request, { status: 404 });
        }

        if (!canManageProject(userRole, user.id, taskRows[0].manager_id)) {
            return corsResponse({ error: 'Permission refusée' }, request, { status: 403 });
        }

        // Get task details before deletion for activity log
        const { rows: deletionTaskRows } = await db.query(
            'SELECT title, project_id FROM tasks WHERE id = $1',
            [id]
        );

        if (deletionTaskRows.length === 0) {
            return corsResponse({ error: 'Tâche non trouvée' }, request, { status: 404 });
        }

        const taskToDelete = deletionTaskRows[0];

        await db.query('DELETE FROM tasks WHERE id = $1', [id]);

        // Create activity log for task deletion
        await db.query(
            'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
            [
                user.id,
                'deleted',
                'task',
                id,
                JSON.stringify({
                    description: `Tâche "${taskToDelete.title}" supprimée`,
                    task_title: taskToDelete.title,
                    project_id: taskToDelete.project_id
                })
            ]
        );

        return corsResponse({ message: 'Tâche supprimée avec succès' }, request);
    } catch (error) {
        console.error('DELETE /api/tasks/[id] error:', error);
        return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
    }
}
