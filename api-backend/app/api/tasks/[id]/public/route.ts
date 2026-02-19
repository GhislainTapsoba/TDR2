import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { handleCorsOptions, corsResponse } from '@/lib/cors';

export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

// GET /api/tasks/[id]/public - Get task details for rejection (no auth required with token)
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { searchParams } = new URL(request.url);
        const token = searchParams.get('token');

        if (!token) {
            return corsResponse({ error: 'Token manquant' }, request, { status: 400 });
        }

        // Vérifier que le token de refus est valide
        const { rows: tokenRows } = await db.query(
            'SELECT task_id, user_id, expires_at FROM task_rejections WHERE token = $1 AND used = false',
            [token]
        );

        if (tokenRows.length === 0) {
            return corsResponse({ error: 'Token invalide ou déjà utilisé' }, request, { status: 400 });
        }

        const tokenData = tokenRows[0];

        // Vérifier que le token n'a pas expiré
        if (new Date() > new Date(tokenData.expires_at)) {
            return corsResponse({ error: 'Token expiré' }, request, { status: 400 });
        }

        // Vérifier que le token correspond à la tâche demandée
        if (tokenData.task_id !== id) {
            return corsResponse({ error: 'Token non valide pour cette tâche' }, request, { status: 400 });
        }

        // Récupérer les détails de la tâche
        const { rows } = await db.query(
            `SELECT t.*, p.title as project_title, s.name as stage_name, c.name as created_by_name,
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

        return corsResponse(rows[0], request);
    } catch (error) {
        console.error('GET /api/tasks/[id]/public error:', error);
        return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
    }
}
