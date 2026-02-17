'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function AcceptTaskPage({ params }: { params: Promise<{ id: string }> }) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [task, setTask] = useState<any>(null);
    const router = useRouter();
    const { user } = useAuth();
    const searchParams = useSearchParams();

    const [taskId, setTaskId] = useState<string>('');

    useEffect(() => {
        const getTaskId = async () => {
            const resolvedParams = await params;
            setTaskId(resolvedParams.id);

            const acceptTask = async () => {
                try {
                    const token = searchParams.get('token');
                    if (!token) {
                        throw new Error('Token de confirmation manquant');
                    }

                    const response = await fetch(`/api/tasks/${resolvedParams.id}/accept?token=${encodeURIComponent(token)}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    });

                    const data = await response.json();

                    if (!response.ok) {
                        throw new Error(data.error || 'Erreur lors de l\'acceptation de la tâche');
                    }

                    setTask(data.task);
                    setSuccess(true);
                } catch (err: any) {
                    setError(err.message);
                } finally {
                    setLoading(false);
                }
            };

            acceptTask();
        };

        getTaskId();
    }, [params, searchParams]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <h1 className="text-xl font-semibold text-gray-900">Acceptation de la tâche...</h1>
                        <p className="text-gray-600 mt-2">Veuillez patienter</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
                    <div className="text-center">
                        <div className="text-red-500 text-6xl mb-4">❌</div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Erreur</h1>
                        <p className="text-gray-600 mb-6">{error}</p>
                        <button
                            onClick={() => router.push('/tasks')}
                            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                        >
                            Retour aux tâches
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
                    <div className="text-center">
                        <div className="text-green-500 text-6xl mb-4">✅</div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Tâche acceptée !</h1>
                        <p className="text-gray-600 mb-6">
                            La tâche "{task?.title}" a été acceptée et est maintenant en cours.
                        </p>
                        <div className="space-y-3">
                            <button
                                onClick={() => router.push(`/tasks/${taskId}`)}
                                className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium"
                            >
                                Voir les détails de la tâche
                            </button>
                            <button
                                onClick={() => router.push('/tasks')}
                                className="w-full bg-gray-200 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-300 font-medium"
                            >
                                Retour à la liste des tâches
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return null;
}
