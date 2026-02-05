import { NextRequest } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { handleCorsOptions, corsResponse } from '@/lib/cors';
import { mapDbRoleToUserRole, requirePermission } from '@/lib/permissions';

export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

// GET /api/users - Get all users
export async function GET(request: NextRequest) {
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

        const { rows } = await db.query(
            `SELECT id, email, name, role, is_active, created_at, updated_at, phone
       FROM users
       ORDER BY created_at DESC`
        );

        return corsResponse(rows, request);
    } catch (error) {
        console.error('GET /api/users error:', error);
        return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
    }
}

// POST /api/users - Create a new user (admin only)
export async function POST(request: NextRequest) {
    try {
        const user = await verifyAuth(request);
        if (!user) {
            return corsResponse({ error: 'Non autorisé' }, request, { status: 401 });
        }

        const userRole = mapDbRoleToUserRole(user.role);
        const perm = await requirePermission(userRole, 'users', 'create');
        if (!perm.allowed) {
            return corsResponse({ error: perm.error }, request, { status: 403 });
        }

        const body = await request.json();
        const { email, name, role = 'employee', password, phone } = body;

        if (!email || !password) {
            return corsResponse(
                { error: 'Email et mot de passe requis' },
                request,
                { status: 400 }
            );
        }

        // Check if user exists
        const { rows: existing } = await db.query(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );

        if (existing.length > 0) {
            return corsResponse(
                { error: 'Un utilisateur avec cet email existe déjà' },
                request,
                { status: 409 }
            );
        }

        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash(password, 10);

        const { rows } = await db.query(
            `INSERT INTO users (email, name, role, password, phone, is_active)
       VALUES ($1, $2, $3, $4, $5, true)
       RETURNING id, email, name, role, is_active, created_at, phone`,
            [email, name || null, role, hashedPassword, phone || null]
        );

        const newUser = rows[0];

        // Create default settings
        await db.query('INSERT INTO user_settings (user_id) VALUES ($1)', [newUser.id]);
        await db.query('INSERT INTO notification_preferences (user_id) VALUES ($1)', [newUser.id]);

        return corsResponse(newUser, request, { status: 201 });
    } catch (error) {
        console.error('POST /api/users error:', error);
        return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
    }
}
