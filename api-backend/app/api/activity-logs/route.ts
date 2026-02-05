import { NextRequest } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { handleCorsOptions, corsResponse } from '@/lib/cors';
import { mapDbRoleToUserRole } from '@/lib/permissions';

export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

// GET /api/activity-logs - Get activity logs
export async function GET(request: NextRequest) {
    try {
        const user = await verifyAuth(request);
        if (!user) {
            return corsResponse({ error: 'Non autorisé' }, request, { status: 401 });
        }

        const userRole = mapDbRoleToUserRole(user.role);
        const { searchParams } = new URL(request.url);
        const entity_type = searchParams.get('entity_type');
        const entity_id = searchParams.get('entity_id');
        const limit = parseInt(searchParams.get('limit') || '50');

        let query = `
      SELECT a.*, u.name as user_name, u.email as user_email
      FROM activity_logs a
      LEFT JOIN users u ON a.user_id = u.id
    `;

        const params: any[] = [];
        const whereClauses: string[] = [];

        // Non-admin users can only see their own activity
        if (userRole !== 'admin') {
            whereClauses.push(`a.user_id = $${params.length + 1}`);
            params.push(user.id);
        }

        if (entity_type) {
            whereClauses.push(`a.entity_type = $${params.length + 1}`);
            params.push(entity_type);
        }

        if (entity_id) {
            whereClauses.push(`a.entity_id = $${params.length + 1}`);
            params.push(entity_id);
        }

        if (whereClauses.length > 0) {
            query += ' WHERE ' + whereClauses.join(' AND ');
        }

        query += ` ORDER BY a.created_at DESC LIMIT $${params.length + 1}`;
        params.push(limit);

        const { rows } = await db.query(query, params);

        return corsResponse(rows, request);
    } catch (error) {
        console.error('GET /api/activity-logs error:', error);
        return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
    }
}

// POST /api/activity-logs - Create activity log
export async function POST(request: NextRequest) {
    try {
        const user = await verifyAuth(request);
        if (!user) {
            return corsResponse({ error: 'Non autorisé' }, request, { status: 401 });
        }

        const body = await request.json();
        const { action, entity_type, entity_id, details, metadata } = body;

        if (!action || !entity_type || !entity_id) {
            return corsResponse({ error: 'action, entity_type et entity_id sont requis' }, request, { status: 400 });
        }

        const { rows } = await db.query(
            `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
            [user.id, action, entity_type, entity_id, details || null, metadata || null]
        );

        return corsResponse(rows[0], request, { status: 201 });
    } catch (error) {
        console.error('POST /api/activity-logs error:', error);
        return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
    }
}
