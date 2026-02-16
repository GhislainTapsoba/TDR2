'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function RejectTaskPage({ params }: { params: Promise<{ id: string }> }) {
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [task, setTask] = useState<any>(null);
    const [tokenValid, setTokenValid] = useState(true);
    const [taskId, setTaskId] = useState<string>('');
    const router = useRouter();
    const { user } = useAuth();

    useEffect(() => {
        const getTaskId = async () => {
            const resolvedParams = await params;
            setTaskId(resolvedParams.id);

            const urlParams = new URLSearchParams(window.location.search);
            const token = urlParams.get('token');

            if (!token) {
                setTokenValid(false);
                return;
            }

            // Fetch task details
            fetch(`/api/tasks/${taskId}`)
                .then(res => {
                    if (!res.ok) {
                        throw new Error('Tâche introuvable');
                    }
                    return res.json();
                })
                .then(data => {
                    setTask(data);
                })
                .catch(err => {
                    setError(err.message);
                });
        };

        getTaskId();
    }, [params]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!reason.trim()) {
            setError('Le motif de refus est requis');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await fetch(`/api/tasks/${taskId}/reject`, {
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

            // Redirect to success page or tasks list
            router.push('/tasks?message=Tâche refusée avec succès');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!tokenValid) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
                    <div className="text-center">
                        <div className="text-red-500 text-6xl mb-4">🔒</div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Accès non autorisé</h1>
                        <p className="text-gray-600 mb-6">Ce lien de refus n'est pas valide ou a expiré.</p>
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

    if (error && !task) {
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

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4">
            <div className="max-w-2xl mx-auto">
                <div className="bg-white rounded-lg shadow-md p-8">
                    <div className="text-center mb-8">
                        <div className="text-red-500 text-6xl mb-4">❌</div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Refuser la tâche</h1>
                        <p className="text-gray-600">
                            Veuillez indiquer la raison pour laquelle vous refusez cette tâche.
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

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
                                Motif du refus *
                            </label>
                            <textarea
                                id="reason"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                rows={6}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                placeholder="Veuillez expliquer pourquoi vous refusez cette tâche..."
                                required
                            />
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                <p className="text-red-600">{error}</p>
                            </div>
                        )}

                        <div className="flex space-x-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                            >
                                {loading ? 'Traitement en cours...' : 'Confirmer le refus'}
                            </button>
                            <button
                                type="button"
                                onClick={() => router.push('/tasks')}
                                className="flex-1 bg-gray-200 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-300 font-medium"
                            >
                                Annuler
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
