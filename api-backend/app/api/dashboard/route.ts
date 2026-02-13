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

        // Get active projects count (projects not in 'COMPLETED' status)
        let activeProjectsQuery = 'SELECT COUNT(*) as count FROM projects WHERE status != $1';
        let activeProjectsParams: any[] = ['COMPLETED'];

        if (userRole !== 'admin') {
            activeProjectsQuery += ' AND (manager_id = $2 OR created_by_id = $2)';
            activeProjectsParams = ['COMPLETED', user.id];
        }

        const { rows: activeProjectsRows } = await db.query(activeProjectsQuery, activeProjectsParams);

        // Get tasks count
        let tasksQuery = 'SELECT COUNT(*) as count FROM tasks';
        let tasksParams: any[] = [];

        if (userRole !== 'admin') {
            tasksQuery += ' WHERE EXISTS (SELECT 1 FROM task_assignees WHERE task_id = tasks.id AND user_id = $1)';
            tasksParams = [user.id];
        }

        const { rows: tasksRows } = await db.query(tasksQuery, tasksParams);

        // Get completed tasks count
        let completedTasksQuery = `
            SELECT COUNT(*) as count FROM tasks t
            WHERE t.status = 'COMPLETED'
        `;
        let completedTasksParams: any[] = [];

        if (userRole !== 'admin') {
            completedTasksQuery += `
                AND (
                    EXISTS (SELECT 1 FROM task_assignees WHERE task_id = t.id AND user_id = $1)
                    OR t.created_by_id = $1
                    OR EXISTS (
                        SELECT 1 FROM projects p 
                        WHERE p.id = t.project_id 
                        AND (p.manager_id = $1 OR p.created_by_id = $1)
                    )
                )
            `;
            completedTasksParams = [user.id];
        }

        const { rows: completedTasksRows } = await db.query(completedTasksQuery, completedTasksParams);

        // Get total users count (only for admin)
        let totalUsers = 0;
        let activeUsers = 0;
        if (userRole === 'admin') {
            const { rows: usersRows } = await db.query('SELECT COUNT(*) as count FROM users');
            totalUsers = parseInt(usersRows[0].count);

            const { rows: activeUsersRows } = await db.query(
                'SELECT COUNT(DISTINCT user_id) as count FROM task_assignees'
            );
            activeUsers = parseInt(activeUsersRows[0].count);
        }

        const stats = {
            totalProjects: parseInt(projectsRows[0].count),
            activeProjects: parseInt(activeProjectsRows[0].count),
            totalTasks: parseInt(tasksRows[0].count),
            completedTasks: parseInt(completedTasksRows[0].count),
            totalUsers: totalUsers,
            activeUsers: activeUsers,
        };

        return corsResponse(stats, request);
    } catch (error) {
        console.error('GET /api/dashboard error:', error);
        return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
    }
}
