import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import { requirePermission } from '@/lib/permissions';
import { corsResponse, handleCorsOptions } from '@/lib/cors';

export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

// GET /api/email-logs - Get email logs
export async function GET(request: NextRequest) {
    try {
        const user = await verifyAuth(request);
        if (!user) {
            return corsResponse({ error: 'Non autorisé' }, request, { status: 401 });
        }

        // Only admins can view email logs
        if (user.role !== 'admin') {
            return corsResponse({ error: 'Permission refusée' }, request, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');
        const status = searchParams.get('status');

        let query = `
      SELECT 
        id,
        recipient,
        subject,
        sent_at,
        status,
        error_message
      FROM email_logs
    `;

        const params: any[] = [];

        if (status) {
            query += ' WHERE status = $1';
            params.push(status);
        }

        query += ' ORDER BY sent_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
        params.push(limit, offset);

        const result = await db.query(query, params);

        // Get total count
        const countQuery = status
            ? 'SELECT COUNT(*) FROM email_logs WHERE status = $1'
            : 'SELECT COUNT(*) FROM email_logs';
        const countResult = await db.query(countQuery, status ? [status] : []);
        const total = parseInt(countResult.rows[0].count);

        return corsResponse({
            data: result.rows,
            pagination: {
                total,
                limit,
                offset,
                hasMore: offset + result.rows.length < total
            }
        }, request);
    } catch (error: any) {
        console.error('Error fetching email logs:', error);
        return corsResponse({ error: error.message }, request, { status: 500 });
    }
}
