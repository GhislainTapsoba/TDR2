'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { stagesAPI, tasksAPI } from '@/lib/api';
import BackButton from '@/components/BackButton';

interface Stage {
    id: string;
    name: string;
    description?: string;
    status: string;
    position: number;
    duration?: number;
    project_id: string;
    created_at: string;
    updated_at: string;
}

interface Task {
    id: string;
    title: string;
    description?: string;
    status: string;
    priority: string;
    stage_name?: string;
    created_by_name?: string;
    assignees?: Array<{ id: string; name: string; email: string }>;
    due_date?: string;
    created_at: string;
}

export default function StageDetailPage() {
    const router = useRouter();
    const params = useParams();
    const { user, isLoading } = useAuth();
    const [stage, setStage] = useState<Stage | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        status: '',
        position: 0,
        duration: 0,
    });

    useEffect(() => {
        if (!isLoading && !user) {
            router.push('/login');
        }
    }, [user, isLoading, router]);

    useEffect(() => {
        if (user && params.id) {
            loadData();
        }
    }, [user, params.id]);

    const loadData = async () => {
        try {
            const [stageRes, tasksRes] = await Promise.all([
                stagesAPI.getById(params.id as string),
                tasksAPI.getAll({ stage_id: params.id })
            ]);
            setStage(stageRes.data);
            setTasks(tasksRes.data);
            setFormData({
                name: stageRes.data.name || '',
                description: stageRes.data.description || '',
                status: stageRes.data.status || '',
                position: stageRes.data.position || 0,
                duration: stageRes.data.duration || 0,
            });
        } catch (error) {
            console.error('Error loading stage:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStage = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await stagesAPI.update(params.id as string, formData);
            setEditing(false);
            loadData();
        } catch (error) {
            console.error('Error updating stage:', error);
        }
    };

    const handleStatusChange = async (newStatus: string) => {
        try {
            await stagesAPI.update(params.id as string, { status: newStatus });
            loadData();
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PENDING': return 'bg-gray-100 text-gray-800';
            case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800';
            case 'COMPLETED': return 'bg-green-100 text-green-800';
            case 'BLOCKED': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'PENDING': return 'En attente';
            case 'IN_PROGRESS': return 'En cours';
            case 'COMPLETED': return 'Terminé';
            case 'BLOCKED': return 'Bloqué';
            default: return status;
        }
    };

    if (isLoading || loading || !stage) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div>
            {/* Header with back button */}
            <div className="mb-8">
                <BackButton className="mb-4" />
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">{stage.name}</h1>
                        <p className="text-gray-600">{stage.description || 'Aucune description'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 text-sm rounded-full ${getStatusColor(stage.status)}`}>
                            {getStatusLabel(stage.status)}
                        </span>
                        <button
                            onClick={() => setEditing(!editing)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            {editing ? 'Annuler' : 'Modifier'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Edit Form */}
                {editing && (
                    <div className="bg-white rounded-lg shadow p-6 mb-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Modifier l'étape</h2>
                        <form onSubmit={handleUpdateStage}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Nom *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Description
                                    </label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        rows={3}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Position
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.position}
                                        onChange={(e) => setFormData({ ...formData, position: parseInt(e.target.value) })}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Durée (jours)
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.duration}
                                        onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Statut
                                    </label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="PENDING">En attente</option>
                                        <option value="IN_PROGRESS">En cours</option>
                                        <option value="COMPLETED">Terminé</option>
                                        <option value="BLOCKED">Bloqué</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex justify-end space-x-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setEditing(false)}
                                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    Enregistrer
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Quick Status Change */}
                {!editing && (
                    <div className="bg-white rounded-lg shadow p-6 mb-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Changer le statut</h2>
                        <div className="flex space-x-3">
                            <button
                                onClick={() => handleStatusChange('PENDING')}
                                className={`px-4 py-2 rounded-lg ${stage.status === 'PENDING' ? 'bg-gray-600 text-white' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}
                                disabled={stage.status === 'PENDING'}
                            >
                                En attente
                            </button>
                            <button
                                onClick={() => handleStatusChange('IN_PROGRESS')}
                                className={`px-4 py-2 rounded-lg ${stage.status === 'IN_PROGRESS' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-800 hover:bg-blue-200'}`}
                                disabled={stage.status === 'IN_PROGRESS'}
                            >
                                En cours
                            </button>
                            <button
                                onClick={() => handleStatusChange('COMPLETED')}
                                className={`px-4 py-2 rounded-lg ${stage.status === 'COMPLETED' ? 'bg-green-600 text-white' : 'bg-green-100 text-green-800 hover:bg-green-200'}`}
                                disabled={stage.status === 'COMPLETED'}
                            >
                                Terminé
                            </button>
                            <button
                                onClick={() => handleStatusChange('BLOCKED')}
                                className={`px-4 py-2 rounded-lg ${stage.status === 'BLOCKED' ? 'bg-red-600 text-white' : 'bg-red-100 text-red-800 hover:bg-red-200'}`}
                                disabled={stage.status === 'BLOCKED'}
                            >
                                Bloqué
                            </button>
                        </div>
                    </div>
                )}

                {/* Tasks in this stage */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Tâches dans cette étape ({tasks.length})</h2>
                    {tasks.length === 0 ? (
                        <p className="text-gray-500">Aucune tâche dans cette étape</p>
                    ) : (
                        <div className="space-y-3">
                            {tasks.map((task) => (
                                <Link
                                    key={task.id}
                                    href={`/tasks/${task.id}`}
                                    className="border rounded-lg p-4 block hover:bg-gray-50"
                                >
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <h3 className="font-semibold">{task.title}</h3>
                                            {task.assignees && task.assignees.length > 0 && (
                                                <p className="text-xs text-gray-500 mt-1">Assigné à: {task.assignees.map(a => a.name).join(', ')}</p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2 py-1 text-xs rounded-full ${task.priority === 'URGENT' ? 'bg-red-100 text-red-800' :
                                                task.priority === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                                                    task.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                                                        'bg-green-100 text-green-800'
                                                }`}>
                                                {task.priority === 'URGENT' ? 'Urgente' :
                                                    task.priority === 'HIGH' ? 'Haute' :
                                                        task.priority === 'MEDIUM' ? 'Moyenne' : 'Basse'}
                                            </span>
                                            <span className={`px-2 py-1 text-xs rounded-full ${task.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                                                task.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                                                    task.status === 'TODO' ? 'bg-gray-100 text-gray-800' :
                                                        task.status === 'IN_REVIEW' ? 'bg-purple-100 text-purple-800' :
                                                            'bg-gray-100 text-gray-800'
                                                }`}>
                                                {task.status === 'TODO' ? 'À faire' :
                                                    task.status === 'IN_PROGRESS' ? 'En cours' :
                                                        task.status === 'IN_REVIEW' ? 'En révision' :
                                                            task.status === 'COMPLETED' ? 'Terminé' : task.status}
                                            </span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
