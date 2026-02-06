import { NextRequest } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { handleCorsOptions, corsResponse } from '@/lib/cors';

export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

// GET /api/email_logs - Get email logs
export async function GET(request: NextRequest) {
    try {
        const user = await verifyAuth(request);
        if (!user) {
            return corsResponse({ error: 'Non autorisé' }, request, { status: 401 });
        }

        const { rows } = await db.query(
            'SELECT * FROM email_logs ORDER BY created_at DESC LIMIT 100'
        );

        return corsResponse(rows, request);
    } catch (error) {
        console.error('GET /api/email_logs error:', error);
        return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
    }
}

// POST /api/email_logs - Create email log
export async function POST(request: NextRequest) {
    try {
        const user = await verifyAuth(request);
        if (!user) {
            return corsResponse({ error: 'Non autorisé' }, request, { status: 401 });
        }

        const body = await request.json();
        const { email, subject, status, error_message } = body;

        const { rows } = await db.query(
            'INSERT INTO email_logs (email, subject, status, error_message) VALUES ($1, $2, $3, $4) RETURNING *',
            [email, subject, status, error_message]
        );

        return corsResponse(rows[0], request);
    } catch (error) {
        console.error('POST /api/email_logs error:', error);
        return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
    }
}
