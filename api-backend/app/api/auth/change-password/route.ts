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

        const currentPasswordHash = rows[0].password_hash;
        console.log('Current password hash:', currentPasswordHash);
        console.log('Current password type:', typeof currentPasswordHash);

        // Verify current password
        let isValidPassword = false;

        console.log('Starting password verification...');
        console.log('Hash format check:', currentPasswordHash.startsWith('$2a$'));

        // For hashes created with pgcrypto (6 rounds), use database crypt directly
        if (currentPasswordHash.startsWith('$2a$06$')) {
            try {
                console.log('Using database crypt for pgcrypto hash (6 rounds)...');
                const { rows: verifyRows } = await db.query(
                    'SELECT crypt($1, $2) = $2 as is_valid',
                    [currentPassword, currentPasswordHash]
                );
                isValidPassword = verifyRows[0].is_valid;
                console.log('Database crypt result:', isValidPassword);
            } catch (error) {
                console.error('Database password verification failed:', error);
            }
        } else {
            // For hashes created with bcryptjs (10 rounds), use bcrypt.compare
            try {
                console.log('Trying bcrypt comparison for bcryptjs hash...');
                isValidPassword = await bcrypt.compare(currentPassword, currentPasswordHash);
                console.log('bcrypt result:', isValidPassword);
            } catch (error) {
                console.log('bcrypt comparison failed, trying database verification');
                console.log('bcrypt error:', error);

                // Fallback to database crypt
                if (currentPasswordHash.startsWith('$2a$')) {
                    try {
                        console.log('Fallback: trying database crypt verification...');
                        const { rows: verifyRows } = await db.query(
                            'SELECT crypt($1, $2) = $2 as is_valid',
                            [currentPassword, currentPasswordHash]
                        );
                        isValidPassword = verifyRows[0].is_valid;
                        console.log('Database crypt fallback result:', isValidPassword);
                    } catch (error) {
                        console.error('Database password verification failed:', error);
                    }
                }
            }
        }

        console.log('Final password validation result:', isValidPassword);

        if (!isValidPassword) {
            return corsResponse({ error: 'Mot de passe actuel incorrect' }, request, { status: 400 });
        }

        // Hash new password
        const newPasswordHash = await bcrypt.hash(newPassword, 10);

        // Update password and add Eye-Off confirmation
        await db.query(
            'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
            [newPasswordHash, user.id]
        );

        // Log the password change for security audit
        await db.query(
            'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
            [user.id, 'password_changed', 'user', user.id, 'Password changed successfully']
        );

        return corsResponse({ message: 'Mot de passe changé avec succès' }, request);
    } catch (error) {
        console.error('POST /api/auth/change-password error:', error);
        return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
    }
}
