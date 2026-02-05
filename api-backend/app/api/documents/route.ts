import { NextRequest } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { handleCorsOptions, corsResponse } from '@/lib/cors';
import { mapDbRoleToUserRole, requirePermission } from '@/lib/permissions';

export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

// GET /api/documents - Get all documents
export async function GET(request: NextRequest) {
    try {
        const user = await verifyAuth(request);
        if (!user) {
            return corsResponse({ error: 'Non autorisé' }, request, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const project_id = searchParams.get('project_id');
        const task_id = searchParams.get('task_id');

        let query = `
      SELECT d.*, p.title as project_title, t.title as task_title, u.name as uploaded_by_name
      FROM documents d
      LEFT JOIN projects p ON d.project_id = p.id
      LEFT JOIN tasks t ON d.task_id = t.id
      LEFT JOIN users u ON d.uploaded_by = u.id
    `;

        const params: any[] = [];
        const whereClauses: string[] = [];

        if (project_id) {
            whereClauses.push(`d.project_id = $${params.length + 1}`);
            params.push(project_id);
        }

        if (task_id) {
            whereClauses.push(`d.task_id = $${params.length + 1}`);
            params.push(task_id);
        }

        if (whereClauses.length > 0) {
            query += ' WHERE ' + whereClauses.join(' AND ');
        }

        query += ' ORDER BY d.created_at DESC';

        const { rows } = await db.query(query, params);

        return corsResponse(rows, request);
    } catch (error) {
        console.error('GET /api/documents error:', error);
        return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
    }
}

// POST /api/documents - Create a new document
export async function POST(request: NextRequest) {
    try {
        const user = await verifyAuth(request);
        if (!user) {
            return corsResponse({ error: 'Non autorisé' }, request, { status: 401 });
        }

        const userRole = mapDbRoleToUserRole(user.role);
        const perm = await requirePermission(userRole, 'documents', 'create');
        if (!perm.allowed) {
            return corsResponse({ error: perm.error }, request, { status: 403 });
        }

        const body = await request.json();
        const { name, file_url, file_type, file_size, description, project_id, task_id } = body;

        if (!name || !file_url) {
            return corsResponse({ error: 'Le nom et l\'URL du fichier sont requis' }, request, { status: 400 });
        }

        const { rows } = await db.query(
            `INSERT INTO documents (name, file_url, file_type, file_size, description, project_id, task_id, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
            [name, file_url, file_type || null, file_size || null, description || null, project_id || null, task_id || null, user.id]
        );

        return corsResponse(rows[0], request, { status: 201 });
    } catch (error) {
        console.error('POST /api/documents error:', error);
        return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
    }
}
