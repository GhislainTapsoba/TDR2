import { NextRequest } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { handleCorsOptions, corsResponse } from '@/lib/cors';

export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

// POST /api/auth/change-password - Change user password
export async function POST(request: NextRequest) {
    try {
        const user = await verifyAuth(request);
        if (!user) {
            return corsResponse({ error: 'Non autorisé' }, request, { status: 401 });
        }

        const body = await request.json();
        const { currentPassword, newPassword } = body;

        if (!currentPassword || !newPassword) {
            return corsResponse({ error: 'Mot de passe actuel et nouveau mot de passe requis' }, request, { status: 400 });
        }

        if (newPassword.length < 6) {
            return corsResponse({ error: 'Le mot de passe doit contenir au moins 6 caractères' }, request, { status: 400 });
        }

        // Get current password hash
        const { rows } = await db.query(
            'SELECT password_hash FROM users WHERE id = $1',
            [user.id]
        );

        if (rows.length === 0) {
            return corsResponse({ error: 'Utilisateur non trouvé' }, request, { status: 404 });
        }

        // Verify current password
        const isValidPassword = await bcrypt.compare(currentPassword, rows[0].password_hash);
        if (!isValidPassword) {
            return corsResponse({ error: 'Mot de passe actuel incorrect' }, request, { status: 400 });
        }

        // Hash new password
        const newPasswordHash = await bcrypt.hash(newPassword, 10);

        // Update password
        await db.query(
            'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
            [newPasswordHash, user.id]
        );

        return corsResponse({ message: 'Mot de passe changé avec succès' }, request);
    } catch (error) {
        console.error('POST /api/auth/change-password error:', error);
        return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
    }
}
