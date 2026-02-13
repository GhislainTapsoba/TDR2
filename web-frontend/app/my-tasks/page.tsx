'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { tasksAPI } from '@/lib/api';
import BackButton from '@/components/BackButton';

interface Task {
    id: string;
    title: string;
    description?: string;
    status: string;
    priority: string;
    project_id: string;
    project_title?: string;
    stage_name?: string;
    created_by_name?: string;
    assignees?: Array<{ id: string; name: string; email: string }>;
    due_date?: string;
    created_at: string;
}

export default function MyTasksPage() {
    const { user } = useAuth();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');

    useEffect(() => {
        if (user) {
            loadMyTasks();
        }
    }, [user, filter]);

    const loadMyTasks = async () => {
        try {
            const params = filter ? { status: filter, assigned_to_me: true } : { assigned_to_me: true };
            const response = await tasksAPI.getAll(params);
            setTasks(response.data);
        } catch (error) {
            console.error('Error loading my tasks:', error);
        } finally {
            setLoading(false);
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'LOW': return 'bg-green-100 text-green-800';
            case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
            case 'HIGH': return 'bg-orange-100 text-orange-800';
            case 'URGENT': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'TODO': return 'bg-gray-100 text-gray-800';
            case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800';
            case 'DONE': return 'bg-green-100 text-green-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div>
            {/* Header with back button */}
            <div className="mb-8">
                <BackButton className="mb-4" />
                <h1 className="text-3xl font-bold text-gray-900">Mes Tâches</h1>
                <p className="text-gray-600">Gérez vos tâches assignées</p>
            </div>

            {/* Filters */}
            <div className="mb-6 flex gap-4">
                <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="">Toutes les tâches</option>
                    <option value="TODO">À faire</option>
                    <option value="IN_PROGRESS">En cours</option>
                    <option value="DONE">Terminées</option>
                </select>
            </div>

            {/* Tasks List */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {tasks.length === 0 ? (
                    <div className="bg-white rounded-lg shadow p-6 text-center">
                        <p className="text-gray-500">Aucune tâche assignée</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {tasks.map((task) => (
                            <div key={task.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900">{task.title}</h3>
                                        <p className="text-sm text-gray-600">{task.project_title || 'Projet non spécifié'}</p>
                                        {task.stage_name && (
                                            <p className="text-sm text-gray-500">Étape: {task.stage_name}</p>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(task.priority)}`}>
                                            {task.priority === 'LOW' ? 'Basse' :
                                             task.priority === 'MEDIUM' ? 'Moyenne' :
                                             task.priority === 'HIGH' ? 'Haute' : 'Urgente'}
                                        </span>
                                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(task.status)}`}>
                                            {task.status === 'TODO' ? 'À faire' :
                                             task.status === 'IN_PROGRESS' ? 'En cours' :
                                             task.status === 'DONE' ? 'Terminée' : task.status}
                                        </span>
                                    </div>
                                </div>

                                {task.description && (
                                    <p className="text-gray-600 mb-4">{task.description}</p>
                                )}

                                {task.assignees && task.assignees.length > 0 && (
                                    <p className="text-sm text-gray-500 mb-2">
                                        Assigné à: {task.assignees.map(a => a.name).join(', ')}
                                    </p>
                                )}

                                {task.due_date && (
                                    <p className="text-sm text-gray-500">
                                        Échéance: {new Date(task.due_date).toLocaleDateString()}
                                    </p>
                                )}

                                <div className="flex justify-end">
                                    <Link
                                        href={`/tasks/${task.id}`}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                    >
                                        Voir les détails
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
