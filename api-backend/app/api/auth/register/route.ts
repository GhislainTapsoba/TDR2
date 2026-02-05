import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, generateToken } from '@/lib/auth';
import { handleCorsOptions, corsResponse } from '@/lib/cors';

export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email, name, password, role = 'employee' } = body;

        // Validation
        if (!email || !password) {
            return corsResponse(
                { error: 'Email et mot de passe requis' },
                request,
                { status: 400 }
            );
        }

        if (password.length < 6) {
            return corsResponse(
                { error: 'Le mot de passe doit contenir au moins 6 caractères' },
                request,
                { status: 400 }
            );
        }

        // Check if user already exists
        const { rows: existingUsers } = await db.query(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );

        if (existingUsers.length > 0) {
            return corsResponse(
                { error: 'Un utilisateur avec cet email existe déjà' },
                request,
                { status: 409 }
            );
        }

        // Hash password
        const hashedPassword = await hashPassword(password);

        // Create user
        const { rows } = await db.query(
            `INSERT INTO users (email, name, password, role, is_active)
       VALUES ($1, $2, $3, $4, true)
       RETURNING id, email, name, role`,
            [email, name || null, hashedPassword, role]
        );

        const user = rows[0];

        // Create default user settings
        await db.query(
            'INSERT INTO user_settings (user_id) VALUES ($1)',
            [user.id]
        );

        // Create default notification preferences
        await db.query(
            'INSERT INTO notification_preferences (user_id) VALUES ($1)',
            [user.id]
        );

        // Generate JWT token
        const token = generateToken({
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
        });

        return corsResponse(
            {
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                },
            },
            request,
            { status: 201 }
        );
    } catch (error) {
        console.error('Register error:', error);
        return corsResponse(
            { error: 'Erreur serveur' },
            request,
            { status: 500 }
        );
    }
}
