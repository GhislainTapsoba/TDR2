import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_ORIGINS = [
    'http://localhost:3001',
    'http://localhost:3000',
    process.env.NEXT_PUBLIC_FRONTEND_URL,
].filter(Boolean);

/**
 * Handle CORS preflight OPTIONS requests
 */
export function handleCorsOptions(request: NextRequest): NextResponse {
    const origin = request.headers.get('origin') || '';
    const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

    return new NextResponse(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': allowOrigin || '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Max-Age': '86400',
        },
    });
}

/**
 * Create a JSON response with CORS headers
 */
export function corsResponse(
    data: any,
    request: NextRequest,
    options: { status?: number } = {}
): NextResponse {
    const origin = request.headers.get('origin') || '';
    const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

    return NextResponse.json(data, {
        status: options.status || 200,
        headers: {
            'Access-Control-Allow-Origin': allowOrigin || '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}
