import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { comparePassword, generateToken } from '@/lib/auth';
import { handleCorsOptions, corsResponse } from '@/lib/cors';

export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email, password } = body;

        if (!email || !password) {
            return corsResponse(
                { error: 'Email et mot de passe requis' },
                request,
                { status: 400 }
            );
        }

        // Find user by email
        const { rows } = await db.query(
            'SELECT id, email, name, password, role, is_active FROM users WHERE email = $1',
            [email]
        );

        if (rows.length === 0) {
            return corsResponse(
                { error: 'Email ou mot de passe incorrect' },
                request,
                { status: 401 }
            );
        }

        const user = rows[0];

        // Check if user is active
        if (!user.is_active) {
            return corsResponse(
                { error: 'Compte désactivé' },
                request,
                { status: 403 }
            );
        }

        // Verify password
        const isValidPassword = await comparePassword(password, user.password);
        if (!isValidPassword) {
            return corsResponse(
                { error: 'Email ou mot de passe incorrect' },
                request,
                { status: 401 }
            );
        }

        // Generate JWT token
        const token = generateToken({
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role || 'employee',
        });

        return corsResponse(
            {
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role || 'employee',
                },
            },
            request
        );
    } catch (error) {
        console.error('Login error:', error);
        return corsResponse(
            { error: 'Erreur serveur' },
            request,
            { status: 500 }
        );
    }
}
