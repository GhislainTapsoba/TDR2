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

// POST /api/tasks/[id]/reject - Reject a task
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const user = await verifyAuth(request);
        if (!user) {
            return corsResponse({ error: 'Non autorisé' }, request, { status: 401 });
        }

        const userRole = mapDbRoleToUserRole(user.role);
        const taskId = params.id;
        const body = await request.json();
        const { reason } = body;

        if (!reason || reason.trim().length === 0) {
            return corsResponse({ error: 'Le motif de refus est requis' }, request, { status: 400 });
        }

        // Check if user is assigned to this task
        const { rows: assigneeRows } = await db.query(
            'SELECT 1 FROM task_assignees WHERE task_id = $1 AND user_id = $2',
            [taskId, user.id]
        );

        if (assigneeRows.length === 0) {
            return corsResponse({ error: 'Vous n\'êtes pas assigné à cette tâche' }, request, { status: 403 });
        }

        // Check if task is already accepted or rejected
        const { rows: taskRows } = await db.query(
            'SELECT status, title, project_id FROM tasks WHERE id = $1',
            [taskId]
        );

        if (taskRows.length === 0) {
            return corsResponse({ error: 'Tâche introuvable' }, request, { status: 404 });
        }

        const task = taskRows[0];
        if (task.status !== 'TODO') {
            return corsResponse({ error: 'Cette tâche a déjà été acceptée ou refusée' }, request, { status: 400 });
        }

        // Update task status to REJECTED and store rejection reason
        await db.query(
            'UPDATE tasks SET status = $1, updated_at = NOW() WHERE id = $2',
            ['REJECTED', taskId]
        );

        // Store rejection reason in activity log
        await createActivityLog({
            userId: user.id,
            action: 'rejected_task',
            entityType: 'task',
            entityId: taskId,
            description: `${user.name || user.email} a refusé la tâche "${task.title}"`,
            details: {
                task_title: task.title,
                project_id: task.project_id,
                rejection_reason: reason
            }
        });

        // Also store in a separate rejections table for better tracking
        await db.query(
            `INSERT INTO task_rejections (task_id, user_id, reason, created_at)
             VALUES ($1, $2, $3, NOW())`,
            [taskId, user.id, reason]
        );

        // Get project details
        const { rows: projectRows } = await db.query(
            'SELECT title, manager_id FROM projects WHERE id = $1',
            [task.project_id]
        );

        const project = projectRows[0];

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
                        changes: `Tâche refusée. Raison: ${reason}`
                    });
                } catch (error) {
                    console.error('Error sending email to manager:', error);
                }

                // Send SMS notification
                try {
                    await sendSMS({
                        to: manager.phone,
                        message: `❌ Tâche refusée: ${task.title} par ${user.name || user.email}. Raison: ${reason}`
                    });
                } catch (error) {
                    console.error('Error sending SMS to manager:', error);
                }

                // Send WhatsApp notification
                try {
                    await sendWhatsApp({
                        to: manager.phone,
                        message: `❌ *Tâche refusée*\n\n📋 Tâche: ${task.title}\n👤 Refusée par: ${user.name || user.email}\n📂 Projet: ${project.title}\n📝 Raison: ${reason}\n📊 Statut: Refusée`
                    });
                } catch (error) {
                    console.error('Error sending WhatsApp to manager:', error);
                }
            }
        }

        return corsResponse({
            success: true,
            message: 'Tâche refusée avec succès',
            task: {
                id: taskId,
                status: 'REJECTED',
                title: task.title,
                rejection_reason: reason
            }
        }, request);

    } catch (error) {
        console.error('POST /api/tasks/[id]/reject error:', error);
        return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
    }
}
