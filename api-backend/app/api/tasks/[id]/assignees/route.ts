import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import { corsResponse, handleCorsOptions } from '@/lib/cors';
import { sendEmail } from '@/lib/email';

export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

// GET /api/tasks/[id]/assignees - Get task assignees
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const authResult = await verifyAuth(request);
        if (!authResult.authenticated || !authResult.user) {
            return corsResponse({ error: 'Non authentifié' }, request, { status: 401 });
        }

        const taskId = params.id;

        const result = await db.query(
            `SELECT 
        ta.id,
        ta.task_id,
        ta.user_id,
        ta.assigned_at,
        ta.assigned_by,
        u.name as user_name,
        u.email as user_email,
        assigner.name as assigned_by_name
      FROM task_assignees ta
      JOIN users u ON ta.user_id = u.id
      LEFT JOIN users assigner ON ta.assigned_by = assigner.id
      WHERE ta.task_id = $1
      ORDER BY ta.assigned_at DESC`,
            [taskId]
        );

        return corsResponse({ data: result.rows }, request);
    } catch (error: any) {
        console.error('Error fetching task assignees:', error);
        return corsResponse({ error: error.message }, request, { status: 500 });
    }
}

// POST /api/tasks/[id]/assignees - Assign task to user
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const authResult = await verifyAuth(request);
        if (!authResult.authenticated || !authResult.user) {
            return corsResponse({ error: 'Non authentifié' }, request, { status: 401 });
        }

        const taskId = params.id;
        const { user_id } = await request.json();

        if (!user_id) {
            return corsResponse({ error: 'user_id requis' }, request, { status: 400 });
        }

        // Check if already assigned
        const existingAssignee = await db.query(
            'SELECT id FROM task_assignees WHERE task_id = $1 AND user_id = $2',
            [taskId, user_id]
        );

        if (existingAssignee.rows.length > 0) {
            return corsResponse({ error: 'Utilisateur déjà assigné' }, request, { status: 400 });
        }

        // Get task details for email
        const taskResult = await db.query(
            'SELECT title, description, due_date FROM tasks WHERE id = $1',
            [taskId]
        );

        if (taskResult.rows.length === 0) {
            return corsResponse({ error: 'Tâche non trouvée' }, request, { status: 404 });
        }

        const task = taskResult.rows[0];

        // Get user details
        const userResult = await db.query(
            'SELECT name, email FROM users WHERE id = $1',
            [user_id]
        );

        if (userResult.rows.length === 0) {
            return corsResponse({ error: 'Utilisateur non trouvé' }, request, { status: 404 });
        }

        const assignee = userResult.rows[0];

        // Assign task
        const result = await db.query(
            `INSERT INTO task_assignees (task_id, user_id, assigned_by, assigned_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING *`,
            [taskId, user_id, authResult.user.id]
        );

        // Send email notification
        try {
            await sendEmail({
                to: assignee.email,
                subject: `Nouvelle tâche assignée: ${task.title}`,
                html: `
          <h2>Nouvelle tâche assignée</h2>
          <p>Bonjour ${assignee.name},</p>
          <p>Une nouvelle tâche vous a été assignée:</p>
          <h3>${task.title}</h3>
          <p>${task.description || ''}</p>
          ${task.due_date ? `<p><strong>Date limite:</strong> ${new Date(task.due_date).toLocaleDateString()}</p>` : ''}
          <p>Connectez-vous pour voir les détails.</p>
        `,
            });
        } catch (emailError) {
            console.error('Error sending assignment email:', emailError);
        }

        return corsResponse({ data: result.rows[0] }, request, { status: 201 });
    } catch (error: any) {
        console.error('Error assigning task:', error);
        return corsResponse({ error: error.message }, request, { status: 500 });
    }
}
