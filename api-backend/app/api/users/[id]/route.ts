import { NextRequest } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { handleCorsOptions, corsResponse } from '@/lib/cors';
import { mapDbRoleToUserRole, requirePermission } from '@/lib/permissions';

export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

// GET /api/users/[id] - Get a specific user (admin only)
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await verifyAuth(request);
        if (!user) {
            return corsResponse({ error: 'Non autorisé' }, request, { status: 401 });
        }

        const userRole = mapDbRoleToUserRole(user.role);
        const perm = await requirePermission(userRole, 'users', 'read');
        if (!perm.allowed) {
            return corsResponse({ error: perm.error }, request, { status: 403 });
        }

        const { id } = await params;

        // Get user details
        const { rows: users } = await db.query(
            'SELECT id, name, email, role, phone, is_active, created_at, updated_at FROM users WHERE id = $1',
            [id]
        );

        if (users.length === 0) {
            return corsResponse({ error: 'Utilisateur introuvable' }, request, { status: 404 });
        }

        return corsResponse(users[0], request);
    } catch (error) {
        console.error('GET /api/users/[id] error:', error);
        return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
    }
}

// PUT /api/users/[id] - Update a user (admin only)
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await verifyAuth(request);
        if (!user) {
            return corsResponse({ error: 'Non autorisé' }, request, { status: 401 });
        }

        const userRole = mapDbRoleToUserRole(user.role);
        const perm = await requirePermission(userRole, 'users', 'update');
        if (!perm.allowed) {
            return corsResponse({ error: perm.error }, request, { status: 403 });
        }

        const { id } = await params;
        const body = await request.json();

        // Check if user exists
        const { rows: existing } = await db.query(
            'SELECT id, email, role FROM users WHERE id = $1',
            [id]
        );

        if (existing.length === 0) {
            return corsResponse({ error: 'Utilisateur introuvable' }, request, { status: 404 });
        }

        const targetUser = existing[0];

        // Prevent self-deactivation
        if (body.is_active === false && targetUser.id === user.id) {
            return corsResponse({ error: 'Vous ne pouvez pas désactiver votre propre compte' }, request, { status: 400 });
        }

        // Update user
        const { rows } = await db.query(
            `UPDATE users 
             SET name = COALESCE($1, name),
                 email = COALESCE($2, email),
                 role = COALESCE($3, role),
                 phone = COALESCE($4, phone),
                 is_active = COALESCE($5, is_active),
                 updated_at = NOW()
             WHERE id = $6
             RETURNING id, email, name, role, is_active, created_at, updated_at, phone`,
            [
                body.name,
                body.email,
                body.role,
                body.phone,
                body.is_active,
                id
            ]
        );

        return corsResponse(rows[0], request);
    } catch (error) {
        console.error('PUT /api/users/[id] error:', error);
        return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
    }
}

// DELETE /api/users/[id] - Delete a user (admin only)
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await verifyAuth(request);
        if (!user) {
            return corsResponse({ error: 'Non autorisé' }, request, { status: 401 });
        }

        const userRole = mapDbRoleToUserRole(user.role);
        const perm = await requirePermission(userRole, 'users', 'delete');
        if (!perm.allowed) {
            return corsResponse({ error: perm.error }, request, { status: 403 });
        }

        const { id } = await params;

        // Check if user exists
        const { rows: existing } = await db.query(
            'SELECT id, email, role FROM users WHERE id = $1',
            [id]
        );

        if (existing.length === 0) {
            return corsResponse({ error: 'Utilisateur introuvable' }, request, { status: 404 });
        }

        const targetUser = existing[0];

        // Prevent self-deletion
        if (targetUser.id === user.id) {
            return corsResponse({ error: 'Vous ne pouvez pas supprimer votre propre compte' }, request, { status: 400 });
        }

        // Check if user has active tasks or projects
        const { rows: activeTasks } = await db.query(
            'SELECT COUNT(*) as count FROM task_assignees WHERE user_id = $1',
            [id]
        );

        const { rows: managedProjects } = await db.query(
            'SELECT COUNT(*) as count FROM projects WHERE manager_id = $1',
            [id]
        );

        if (parseInt(activeTasks[0].count) > 0 || parseInt(managedProjects[0].count) > 0) {
            return corsResponse({
                error: 'Impossible de supprimer cet utilisateur. Il a des tâches assignées ou des projets gérés.'
            }, request, { status: 400 });
        }

        // Soft delete: deactivate user
        await db.query(
            'UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1',
            [id]
        );

        return corsResponse({
            message: 'Utilisateur désactivé avec succès',
            user: {
                id: targetUser.id,
                email: targetUser.email,
                role: targetUser.role
            }
        }, request);
    } catch (error) {
        console.error('DELETE /api/users/[id] error:', error);
        return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
    }
}
