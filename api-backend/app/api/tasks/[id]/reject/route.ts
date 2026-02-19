import { NextRequest } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { handleCorsOptions, corsResponse } from '@/lib/cors';
import { mapDbRoleToUserRole, requirePermission } from '@/lib/permissions';
import { sendTaskUpdateEmail, sendSMS, sendWhatsApp, getManagersAndAdmins } from '@/lib/email';
import { createActivityLog } from '@/lib/activity-logger';

export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

// POST /api/tasks/[id]/reject - Reject a task
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

        // Get request body for rejection reason
        const body = await request.json();
        const { reason } = body;

        if (!reason || reason.trim().length === 0) {
            return corsResponse({ error: 'La raison du refus est requise' }, request, { status: 400 });
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

        // Update task_assignees status to rejected
        await db.query(
            `UPDATE task_assignees 
             SET status = 'rejected', responded_at = NOW() 
             WHERE task_id = $1 AND user_id = $2`,
            [taskId, userId]
        );

        // Get task details
        const { rows: taskRows } = await db.query(
            'SELECT title, project_id FROM tasks WHERE id = $1',
            [taskId]
        );

        const task = taskRows[0];

        // Add to task_rejections table
        await db.query(
            'INSERT INTO task_rejections (task_id, user_id, reason) VALUES ($1, $2, $3)',
            [taskId, userId, reason.trim()]
        );

        // Update task status to REJECTED
        await db.query(
            'UPDATE tasks SET status = $1, updated_at = NOW() WHERE id = $2',
            ['REJECTED', taskId]
        );

        // Get user details
        const { rows: userRows } = await db.query(
            'SELECT name, email FROM users WHERE id = $1',
            [userId]
        );

        const user = userRows[0];

        // Get project details
        const { rows: projectRows } = await db.query(
            'SELECT title, manager_id FROM projects WHERE id = $1',
            [task.project_id]
        );

        const project = projectRows[0];

        // Create activity log
        await createActivityLog({
            userId: userId,
            action: 'rejected_task',
            entityType: 'task',
            entityId: taskId,
            description: `${user.name || user.email} a refusé la tâche "${task.title}"`,
            details: {
                task_title: task.title,
                project_id: task.project_id,
                rejection_reason: reason.trim()
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
                        changes: `Tâche refusée. Raison: ${reason.trim()}`
                    });
                } catch (error) {
                    console.error('Error sending email to manager:', error);
                }

                // Send SMS notification
                try {
                    await sendSMS({
                        to: manager.phone,
                        message: `❌ Tâche refusée: ${task.title} par ${user.name || user.email}. Raison: ${reason.trim()}`
                    });
                } catch (error) {
                    console.error('Error sending SMS to manager:', error);
                }

                // Send WhatsApp notification
                try {
                    await sendWhatsApp({
                        to: manager.phone,
                        message: `❌ *Tâche refusée*\n\n📋 Tâche: ${task.title}\n👤 Refusée par: ${user.name || user.email}\n📂 Projet: ${project.title}\n📝 Raison: ${reason.trim()}`
                    });
                } catch (error) {
                    console.error('Error sending WhatsApp to manager:', error);
                }
            }
        }

        // Notify all admins and managers
        try {
            const managersAndAdmins = await getManagersAndAdmins();
            for (const adminManager of managersAndAdmins) {
                // Skip if it's the same user who rejected the task or the project manager (already notified)
                if (adminManager.id !== userId && adminManager.id !== project.manager_id) {
                    try {
                        await sendTaskUpdateEmail({
                            to: adminManager.email,
                            recipientId: adminManager.id,
                            recipientName: adminManager.name || 'Admin/Manager',
                            taskTitle: task.title,
                            taskId: taskId,
                            projectName: project.title,
                            updatedBy: user.name || user.email,
                            changes: `Tâche refusée par ${user.name || user.email}. Raison: ${reason.trim()}`
                        });
                    } catch (error) {
                        console.error('Error sending email to admin/manager:', error);
                    }
                }
            }
        } catch (error) {
            console.error('Error getting managers and admins:', error);
        }

        return corsResponse({
            success: true,
            message: 'Tâche refusée avec succès. Le statut de la tâche a été mis à jour à "REJETÉ" et le manager a été notifié.',
            task: {
                id: taskId,
                status: 'REJECTED',
                title: task.title,
                rejection_reason: reason.trim()
            },
            updates: {
                task_status: 'REJECTED',
                assignee_status: 'rejected',
                rejection_recorded: true,
                manager_notified: true,
                activity_logged: true
            }
        }, request);

    } catch (error) {
        console.error('POST /api/tasks/[id]/reject error:', error);
        return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
    }
}
