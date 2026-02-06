import { NextRequest } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { handleCorsOptions, corsResponse } from '@/lib/cors';

export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

// GET /api/reports - Get all reports
export async function GET(request: NextRequest) {
    try {
        const user = await verifyAuth(request);
        if (!user) {
            return corsResponse({ error: 'Non autorisé' }, request, { status: 401 });
        }

        const { rows } = await db.query(
            'SELECT * FROM reports ORDER BY created_at DESC'
        );

        return corsResponse(rows, request);
    } catch (error) {
        console.error('GET /api/reports error:', error);
        return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
    }
}

// POST /api/reports - Create a new report
export async function POST(request: NextRequest) {
    try {
        const user = await verifyAuth(request);
        if (!user) {
            return corsResponse({ error: 'Non autorisé' }, request, { status: 401 });
        }

        const body = await request.json();
        const { title, content, type } = body;

        if (!title || !content) {
            return corsResponse({ error: 'Titre et contenu requis' }, request, { status: 400 });
        }

        const { rows } = await db.query(
            'INSERT INTO reports (title, content, type, created_by_id, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING *',
            [title, content, type, user.id]
        );

        return corsResponse(rows[0], request, { status: 201 });
    } catch (error) {
        console.error('POST /api/reports error:', error);
        return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
    }
}
