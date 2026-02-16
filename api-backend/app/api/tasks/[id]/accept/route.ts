import { NextRequest } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { handleCorsOptions, corsResponse } from '@/lib/cors';
import { mapDbRoleToUserRole, requirePermission } from '@/lib/permissions';
import { sendTaskUpdateEmail, sendSMS, sendWhatsApp } from '@/lib/email';
import { createActivityLog } from '@/lib/activity-logger';

export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

// POST /api/tasks/[id]/accept - Accept a task
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: taskId } = await params;
        const { searchParams } = new URL(request.url);
        const token = searchParams.get('token');

        if (!token) {
            return corsResponse({ error: 'Token de confirmation requis' }, request, { status: 400 });
        }

        // Verify user from token
        const { rows: tokenRows } = await db.query(
            'SELECT user_id FROM task_assignees WHERE task_id = $1 AND confirmation_token = $2',
            [taskId, token]
        );

        if (tokenRows.length === 0) {
            return corsResponse({ error: 'Token invalide ou expiré' }, request, { status: 400 });
        }

        const userId = tokenRows[0].user_id;

        // Check current status in task_assignees
        const { rows: statusRows } = await db.query(
            'SELECT status FROM task_assignees WHERE task_id = $1 AND user_id = $2',
            [taskId, userId]
        );

        if (statusRows.length === 0) {
            return corsResponse({ error: 'Assignation non trouvée' }, request, { status: 404 });
        }

        const currentStatus = statusRows[0].status;
        if (currentStatus !== 'pending') {
            return corsResponse({
                error: `Cette tâche a déjà été ${currentStatus === 'accepted' ? 'acceptée' : 'refusée'}`
            }, request, { status: 400 });
        }

        // Update task_assignees status to accepted
        await db.query(
            `UPDATE task_assignees 
             SET status = 'accepted', responded_at = NOW() 
             WHERE task_id = $1 AND user_id = $2`,
            [taskId, userId]
        );

        // Update task status to IN_PROGRESS
        await db.query(
            'UPDATE tasks SET status = $1, updated_at = NOW() WHERE id = $2',
            ['IN_PROGRESS', taskId]
        );

        // Get user and task details for notifications
        const { rows: userRows } = await db.query(
            'SELECT name, email FROM users WHERE id = $1',
            [userId]
        );

        const { rows: taskRows } = await db.query(
            'SELECT title, project_id FROM tasks WHERE id = $1',
            [taskId]
        );

        const user = userRows[0];
        const task = taskRows[0];

        // Get project details
        const { rows: projectRows } = await db.query(
            'SELECT title, manager_id FROM projects WHERE id = $1',
            [task.project_id]
        );

        const project = projectRows[0];

        // Create activity log
        await createActivityLog({
            userId: userId,
            action: 'accepted_task',
            entityType: 'task',
            entityId: taskId,
            description: `${user.name || user.email} a accepté la tâche "${task.title}"`,
            details: {
                task_title: task.title,
                project_id: task.project_id
            }
        });

        // Notify project manager
        if (project.manager_id) {
            const { rows: managerRows } = await db.query(
                'SELECT name, email, phone FROM users WHERE id = $1',
                [project.manager_id]
            );

            if (managerRows.length > 0) {
                const manager = managerRows[0];

                // Send email notification
                try {
                    await sendTaskUpdateEmail({
                        to: manager.email,
                        recipientId: manager.id,
                        recipientName: manager.name || 'Manager',
                        taskTitle: task.title,
                        taskId: taskId,
                        projectName: project.title,
                        updatedBy: user.name || user.email,
                        changes: 'Tâche acceptée et mise en cours'
                    });
                } catch (error) {
                    console.error('Error sending email to manager:', error);
                }

                // Send SMS notification
                try {
                    await sendSMS({
                        to: manager.phone,
                        message: `🎯 Tâche acceptée: ${task.title} par ${user.name || user.email}. Statut: En cours`
                    });
                } catch (error) {
                    console.error('Error sending SMS to manager:', error);
                }

                // Send WhatsApp notification
                try {
                    await sendWhatsApp({
                        to: manager.phone,
                        message: `🎯 *Tâche acceptée*\n\n📋 Tâche: ${task.title}\n👤 Acceptée par: ${user.name || user.email}\n📂 Projet: ${project.title}\n📊 Statut: En cours`
                    });
                } catch (error) {
                    console.error('Error sending WhatsApp to manager:', error);
                }
            }
        }

        return corsResponse({
            success: true,
            message: 'Tâche acceptée avec succès',
            task: {
                id: taskId,
                status: 'IN_PROGRESS',
                title: task.title
            }
        }, request);

    } catch (error) {
        console.error('POST /api/tasks/[id]/accept error:', error);
        return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
    }
}
