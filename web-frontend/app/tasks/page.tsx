'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { tasksAPI, projectsAPI, usersAPI } from '@/lib/api';
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

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
}

interface Project {
    id: string;
    title: string;
}

export default function TasksPage() {
    const { user } = useAuth();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        priority: 'MEDIUM',
        project_id: '',
        due_date: '',
        assignee_ids: [] as string[],
    });

    useEffect(() => {
        if (user) {
            loadData();
        }
    }, [user, filter]);

    const loadData = async () => {
        try {
            const params = filter ? { status: filter } : {};
            const [tasksResponse, projectsResponse, usersResponse] = await Promise.all([
                tasksAPI.getAll(params),
                projectsAPI.getAll(),
                usersAPI.getAll()
            ]);
            setTasks(tasksResponse.data);
            setProjects(projectsResponse.data);
            setUsers(usersResponse.data);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await tasksAPI.create(formData);
            setShowCreateModal(false);
            setFormData({
                title: '',
                description: '',
                priority: 'MEDIUM',
                project_id: '',
                due_date: '',
                assignee_ids: [],
            });
            loadData();
        } catch (error) {
            console.error('Error creating task:', error);
        }
    };

    const handleDeleteTask = async (id: string) => {
        if (confirm('Êtes-vous sûr de vouloir supprimer cette tâche ?')) {
            try {
                await tasksAPI.delete(id);
                loadData();
            } catch (error) {
                console.error('Error deleting task:', error);
            }
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'TODO': return 'bg-gray-100 text-gray-800';
            case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800';
            case 'IN_REVIEW': return 'bg-purple-100 text-purple-800';
            case 'COMPLETED': return 'bg-green-100 text-green-800';
            case 'CANCELLED': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'LOW': return 'bg-green-100 text-green-800';
            case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
            case 'HIGH': return 'bg-red-100 text-red-800';
            case 'URGENT': return 'bg-purple-100 text-purple-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'TODO': return 'À faire';
            case 'IN_PROGRESS': return 'En cours';
            case 'IN_REVIEW': return 'En révision';
            case 'COMPLETED': return 'Terminé';
            case 'CANCELLED': return 'Annulé';
            default: return status;
        }
    };

    const getPriorityLabel = (priority: string) => {
        switch (priority) {
            case 'LOW': return 'Basse';
            case 'MEDIUM': return 'Moyenne';
            case 'HIGH': return 'Haute';
            case 'URGENT': return 'Urgente';
            default: return priority;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div>
            {/* Header with back button */}
            <div className="mb-8">
                <BackButton className="mb-4" />
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Tâches</h1>
                        <p className="text-gray-600 mt-1">Gérez toutes vos tâches</p>
                    </div>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Nouvelle tâche
                    </button>
                </div>
                {/* Filters */}
                <div className="mt-6 flex space-x-4">
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">Tous les statuts</option>
                        <option value="TODO">À faire</option>
                        <option value="IN_PROGRESS">En cours</option>
                        <option value="COMPLETED">Terminé</option>
                        <option value="CANCELLED">Annulé</option>
                    </select>
                </div>
            </div>

            {/* Tasks Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tasks.map((task) => (
                    <div key={task.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-xl font-semibold text-gray-900">{task.title}</h3>
                                <div className="flex space-x-2">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                                        {getStatusLabel(task.status)}
                                    </span>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                                        {getPriorityLabel(task.priority)}
                                    </span>
                                </div>
                            </div>

                            <p className="text-gray-600 mb-4 line-clamp-2">
                                {task.description || 'Aucune description'}
                            </p>

                            <div className="space-y-2 text-sm text-gray-500 mb-4">
                                {task.project_title && (
                                    <p>Projet: <span className="font-medium">{task.project_title}</span></p>
                                )}
                                {task.due_date && (
                                    <p>Échéance: <span className="font-medium">{new Date(task.due_date).toLocaleDateString()}</span></p>
                                )}
                                {task.assignees && task.assignees.length > 0 && (
                                    <p>Assigné à: <span className="font-medium">{task.assignees.map(a => a.name).join(', ')}</span></p>
                                )}
                            </div>

                            <div className="flex justify-between items-center">
                                <Link
                                    href={`/tasks/${task.id}`}
                                    className="text-blue-600 hover:text-blue-800 font-medium"
                                >
                                    Voir détails
                                </Link>
                                {(user?.role === 'admin' || user?.role === 'manager' || (user?.role === 'employee' && task.assignees?.some((a: any) => a.id === user.id))) && (
                                    <button
                                        onClick={() => handleDeleteTask(task.id)}
                                        className="text-red-600 hover:text-red-800"
                                    >
                                        Supprimer
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Nouvelle tâche</h2>
                            <button
                                type="button"
                                onClick={() => setShowCreateModal(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <form onSubmit={handleCreateTask}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Titre *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
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
                                        Projet *
                                    </label>
                                    <select
                                        required
                                        value={formData.project_id}
                                        onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">Sélectionner un projet</option>
                                        {projects.map((project) => (
                                            <option key={project.id} value={project.id}>
                                                {project.title}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Priorité
                                    </label>
                                    <select
                                        value={formData.priority}
                                        onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="LOW">Basse</option>
                                        <option value="MEDIUM">Moyenne</option>
                                        <option value="HIGH">Haute</option>
                                        <option value="URGENT">Urgente</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Date d'échéance
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.due_date}
                                        onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Assigné à
                                    </label>
                                    <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-300 rounded-lg p-3">
                                        {users.filter(user => user.role !== 'admin').map((user) => (
                                            <label key={user.id} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                                                <input
                                                    type="checkbox"
                                                    value={user.id}
                                                    checked={formData.assignee_ids.includes(user.id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setFormData({ ...formData, assignee_ids: [...formData.assignee_ids, user.id] });
                                                        } else {
                                                            setFormData({ ...formData, assignee_ids: formData.assignee_ids.filter(id => id !== user.id) });
                                                        }
                                                    }}
                                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                />
                                                <span className="text-sm text-gray-700">
                                                    {user.name || user.email}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Cochez les employés à assigner à cette tâche
                                    </p>
                                </div>
                            </div>
                            <div className="flex justify-end space-x-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    Créer
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
