'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { tasksAPI } from '@/lib/api';

export default function TaskRejectPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    const [taskId, setTaskId] = useState<string>('');
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [task, setTask] = useState<any>(null);

    useEffect(() => {
        const getTaskId = async () => {
            const resolvedParams = await params;
            setTaskId(resolvedParams.id);
        };
        getTaskId();
    }, [params]);

    useEffect(() => {
        if (!token) {
            setError('Token de confirmation manquant');
            return;
        }

        // Fetch task details
        const fetchTask = async () => {
            try {
                const response = await tasksAPI.getById(taskId);
                setTask(response.data);
            } catch (err: any) {
                setError(err.response?.data?.error || 'Erreur lors du chargement de la tâche');
            }
        };

        if (taskId) {
            fetchTask();
        }
    }, [token, taskId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!reason.trim()) {
            setError('Veuillez fournir une raison pour le refus');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await fetch(`/api/tasks/${taskId}/reject?token=${token}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ reason: reason.trim() }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Erreur lors du refus de la tâche');
            }

            setSuccess(true);
            setTimeout(() => {
                router.push('/dashboard');
            }, 3000);
        } catch (error: any) {
            setError(error.message || 'Erreur serveur');
        } finally {
            setLoading(false);
        }
    };

    if (!token) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
                    <div className="text-center">
                        <div className="text-red-500 text-6xl mb-4">🔒</div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Accès non autorisé</h1>
                        <p className="text-gray-600 mb-6">Ce lien de refus n'est pas valide ou a expiré.</p>
                        <button
                            onClick={() => router.push('/dashboard')}
                            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                        >
                            Retour au tableau de bord
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Tâche refusée</h1>
                    <p className="text-gray-600 mb-4">
                        Votre refus a été enregistré avec succès. Vous allez être redirigé vers le tableau de bord...
                    </p>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4">
            <div className="max-w-2xl mx-auto">
                <div className="bg-white rounded-lg shadow-md p-8">
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Refuser la tâche</h1>
                        <p className="text-gray-600">
                            Veuillez indiquer la raison pour laquelle vous refusez cette tâche
                        </p>
                    </div>

                    {task && (
                        <div className="bg-gray-50 rounded-lg p-6 mb-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Détails de la tâche</h2>
                            <div className="space-y-2">
                                <p><strong>Titre:</strong> {task.title}</p>
                                <p><strong>Description:</strong> {task.description || 'N/A'}</p>
                                <p><strong>Projet:</strong> {task.project_title || 'N/A'}</p>
                                <p><strong>Priorité:</strong> {task.priority}</p>
                                <p><strong>Échéance:</strong> {task.due_date ? new Date(task.due_date).toLocaleDateString('fr-FR') : 'N/A'}</p>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-600">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
                                Raison du refus *
                            </label>
                            <textarea
                                id="reason"
                                rows={6}
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                placeholder="Veuillez expliquer pourquoi vous ne pouvez pas accepter cette tâche..."
                                required
                            />
                        </div>

                        <div className="flex space-x-4">
                            <button
                                type="button"
                                onClick={() => router.push('/dashboard')}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
                            >
                                Annuler
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Envoi en cours...' : 'Refuser la tâche'}
                            </button>
                        </div>
                    </form>

                    <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm text-yellow-800">
                            <strong>⚠️ Important:</strong> Une fois que vous refusez cette tâche, vous ne pourrez plus l'accepter.
                            Le gestionnaire de projet sera notifié de votre décision et du motif du refus.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
