'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { emailAPI } from '@/lib/api';

export default function EmailRedirectClient() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');
    const taskId = searchParams.get('taskId');

    useEffect(() => {
        if (token) {
            confirmEmail();
        }
    }, [token]);

    const confirmEmail = async () => {
        try {
            await emailAPI.confirm(token!);
            // Redirect to task if taskId is provided
            if (taskId) {
                router.push(`/tasks/${taskId}`);
            } else {
                router.push('/dashboard');
            }
        } catch (error) {
            console.error('Error confirming email:', error);
            router.push('/dashboard');
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-gray-600">Confirmation en cours...</p>
            </div>
        </div>
    );
}
