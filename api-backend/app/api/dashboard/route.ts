import { NextRequest } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { handleCorsOptions, corsResponse } from '@/lib/cors';
import { mapDbRoleToUserRole } from '@/lib/permissions';

export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

// GET /api/dashboard - Get dashboard statistics
export async function GET(request: NextRequest) {
    try {
        const user = await verifyAuth(request);
        if (!user) {
            return corsResponse({ error: 'Non autorisé' }, request, { status: 401 });
        }

        const userRole = mapDbRoleToUserRole(user.role);

        // Get projects count
        let projectsQuery = 'SELECT COUNT(*) as count FROM projects';
        let projectsParams: any[] = [];

        if (userRole !== 'admin') {
            projectsQuery += ' WHERE manager_id = $1 OR created_by_id = $1';
            projectsParams = [user.id];
        }

        const { rows: projectsRows } = await db.query(projectsQuery, projectsParams);

        // Get tasks count
        let tasksQuery = 'SELECT COUNT(*) as count FROM tasks';
        let tasksParams: any[] = [];

        if (userRole !== 'admin') {
            tasksQuery += ' WHERE EXISTS (SELECT 1 FROM task_assignees WHERE task_id = tasks.id AND user_id = $1)';
            tasksParams = [user.id];
        }

        const { rows: tasksRows } = await db.query(tasksQuery, tasksParams);

        // Get my tasks count
        const { rows: myTasksRows } = await db.query(
            'SELECT COUNT(*) as count FROM task_assignees WHERE user_id = $1',
            [user.id]
        );

        // Get pending tasks count
        const { rows: pendingTasksRows } = await db.query(
            `SELECT COUNT(*) as count FROM tasks t
       WHERE t.status = 'TODO'
       AND EXISTS (SELECT 1 FROM task_assignees WHERE task_id = t.id AND user_id = $1)`,
            [user.id]
        );

        // Get completed tasks count
        const { rows: completedTasksRows } = await db.query(
            `SELECT COUNT(*) as count FROM tasks t
       WHERE t.status = 'COMPLETED'
       AND EXISTS (SELECT 1 FROM task_assignees WHERE task_id = t.id AND user_id = $1)`,
            [user.id]
        );

        // Get unread notifications count (all notifications are considered unread for now)
        const { rows: notificationsRows } = await db.query(
            'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1',
            [user.id]
        );

        // Get recent activity
        const { rows: activityRows } = await db.query(
            `SELECT a.*, u.name as user_name
       FROM activity_logs a
       LEFT JOIN users u ON a.user_id = u.id
       ORDER BY a.created_at DESC
       LIMIT 10`
        );

        const stats = {
            projects_count: parseInt(projectsRows[0].count),
            tasks_count: parseInt(tasksRows[0].count),
            my_tasks_count: parseInt(myTasksRows[0].count),
            pending_tasks_count: parseInt(pendingTasksRows[0].count),
            completed_tasks_count: parseInt(completedTasksRows[0].count),
            unread_notifications_count: parseInt(notificationsRows[0].count),
            recent_activity: activityRows,
        };

        return corsResponse(stats, request);
    } catch (error) {
        console.error('GET /api/dashboard error:', error);
        return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
    }
}
