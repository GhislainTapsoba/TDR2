import { NextRequest } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { handleCorsOptions, corsResponse } from '@/lib/cors';
import { createActivityLog } from '@/lib/activity-logger';

export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

// GET /api/profile - Get current user profile
export async function GET(request: NextRequest) {
    try {
        const user = await verifyAuth(request);
        if (!user) {
            return corsResponse({ error: 'Non autorisé' }, request, { status: 401 });
        }

        const { rows } = await db.query(
            `SELECT u.id, u.email, u.name, u.role, u.is_active, u.created_at, u.updated_at,
              r.name as role_name, r.description as role_description
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE u.id = $1`,
            [user.id]
        );

        if (rows.length === 0) {
            return corsResponse({ error: 'Utilisateur introuvable' }, request, { status: 404 });
        }

        return corsResponse(rows[0], request);
    } catch (error) {
        console.error('GET /api/profile error:', error);
        return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
    }
}

// PUT /api/profile - Update current user profile
export async function PUT(request: NextRequest) {
    try {
        const user = await verifyAuth(request);
        if (!user) {
            return corsResponse({ error: 'Non autorisé' }, request, { status: 401 });
        }

        const body = await request.json();
        const { name, email } = body;

        // Check if email is already taken by another user
        if (email && email !== user.email) {
            const { rows: existingRows } = await db.query(
                'SELECT id FROM users WHERE email = $1 AND id != $2',
                [email, user.id]
            );

            if (existingRows.length > 0) {
                return corsResponse({ error: 'Cet email est déjà utilisé' }, request, { status: 400 });
            }
        }

        const { rows } = await db.query(
            `UPDATE users
       SET name = COALESCE($1, name),
           email = COALESCE($2, email),
           updated_at = NOW()
       WHERE id = $3
       RETURNING id, email, name, role, is_active, created_at, updated_at`,
            [name, email, user.id]
        );

        const updatedUser = rows[0];

        // Create activity log for profile update
        const oldEmail = user.email;
        const oldName = user.name;
        const emailChanged = email && email !== oldEmail;
        const nameChanged = name && name !== oldName;

        if (emailChanged || nameChanged) {
            let action = 'updated';
            let description = `Profil utilisateur mis à jour`;

            if (emailChanged && !nameChanged) {
                description = `Email changé: ${oldEmail} → ${email}`;
            } else if (!emailChanged && nameChanged) {
                description = `Nom changé: ${oldName} → ${name}`;
            } else if (emailChanged && nameChanged) {
                description = `Profil mis à jour: nom et email modifiés`;
            }

            await createActivityLog({
                userId: user.id,
                action: action,
                entityType: 'user',
                entityId: user.id,
                description: description,
                details: {
                    old_email: oldEmail,
                    new_email: email,
                    old_name: oldName,
                    new_name: name
                }
            });
        }

        return corsResponse(updatedUser, request);
    } catch (error) {
        console.error('PUT /api/profile error:', error);
        return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
    }
}
