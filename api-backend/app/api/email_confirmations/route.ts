import { NextRequest } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { handleCorsOptions, corsResponse } from '@/lib/cors';

export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

// POST /api/email_confirmations - Confirm email
export async function POST(request: NextRequest) {
    try {
        const user = await verifyAuth(request);
        if (!user) {
            return corsResponse({ error: 'Non autorisé' }, request, { status: 401 });
        }

        const body = await request.json();
        const { token } = body;

        if (!token) {
            return corsResponse({ error: 'Token requis' }, request, { status: 400 });
        }

        // Find confirmation
        const { rows } = await db.query(
            'SELECT * FROM email_confirmations WHERE token = $1 AND expires_at > NOW()',
            [token]
        );

        if (rows.length === 0) {
            return corsResponse({ error: 'Token invalide ou expiré' }, request, { status: 400 });
        }

        const confirmation = rows[0];

        // Update user email_confirmed
        await db.query(
            'UPDATE users SET email_confirmed = true WHERE id = $1',
            [confirmation.user_id]
        );

        // Delete the confirmation
        await db.query('DELETE FROM email_confirmations WHERE id = $1', [confirmation.id]);

        return corsResponse({ message: 'Email confirmé avec succès' }, request);
    } catch (error) {
        console.error('POST /api/email_confirmations error:', error);
        return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
    }
}
