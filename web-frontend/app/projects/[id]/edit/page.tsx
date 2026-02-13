'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { projectsAPI, stagesAPI, tasksAPI } from '@/lib/api';
import BackButton from '@/components/BackButton';

interface Project {
    id: string;
    title: string;
    description?: string;
    status: string;
    start_date?: string;
    end_date?: string;
    due_date?: string;
    manager_id?: string;
    created_at: string;
    updated_at: string;
}

interface Stage {
    id: string;
    name: string;
    description?: string;
    status: string;
    position: number;
    duration?: number;
}

interface Task {
    id: string;
    title: string;
    description?: string;
    status: string;
    priority: string;
    assignees?: Array<{ id: string; name: string; email: string }>;
    due_date?: string;
}

export default function EditProjectPage() {
    const router = useRouter();
    const params = useParams();
    const { user, isLoading } = useAuth();
    const [project, setProject] = useState<Project | null>(null);
    const [stages, setStages] = useState<Stage[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        status: '',
        start_date: '',
        end_date: '',
        due_date: '',
    });

    useEffect(() => {
        if (!isLoading && !user) {
            router.push('/login');
        }
    }, [user, isLoading, router]);

    useEffect(() => {
        if (user && params.id) {
            loadProjectData();
        }
    }, [user, params.id]);

    const loadProjectData = async () => {
        try {
            const [projectRes, stagesRes, tasksRes] = await Promise.all([
                projectsAPI.getById(params.id as string),
                stagesAPI.getAll({ project_id: params.id }),
                tasksAPI.getAll({ project_id: params.id }),
            ]);
            setProject(projectRes.data);
            setStages(stagesRes.data);
            setTasks(tasksRes.data);
            setFormData({
                title: projectRes.data.title || '',
                description: projectRes.data.description || '',
                status: projectRes.data.status || '',
                start_date: projectRes.data.start_date || '',
                end_date: projectRes.data.end_date || '',
                due_date: projectRes.data.due_date || '',
            });
        } catch (error) {
            console.error('Error loading project:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateProject = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await projectsAPI.update(params.id as string, formData);
            setEditing(false);
            loadProjectData();
        } catch (error) {
            console.error('Error updating project:', error);
        }
    };

    const handleStatusChange = async (newStatus: string) => {
        try {
            await projectsAPI.update(params.id as string, { status: newStatus });
            loadProjectData();
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PLANNING': return 'bg-gray-100 text-gray-800';
            case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800';
            case 'ON_HOLD': return 'bg-yellow-100 text-yellow-800';
            case 'COMPLETED': return 'bg-green-100 text-green-800';
            case 'CANCELLED': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'PLANNING': return 'Planification';
            case 'IN_PROGRESS': return 'En cours';
            case 'ON_HOLD': return 'En pause';
            case 'COMPLETED': return 'Terminé';
            case 'CANCELLED': return 'Annulé';
            default: return status;
        }
    };

    if (isLoading || loading || !project) {
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
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Modifier le projet</h1>
                        <p className="text-gray-600">{project.description}</p>
                    </div>
                    <div className="flex gap-2">
                        <span className={`px-3 py-1 text-sm rounded-full ${getStatusColor(project.status)}`}>
                            {getStatusLabel(project.status)}
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

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Edit Form */}
                {editing && (
                    <div className="bg-white rounded-lg shadow p-6 mb-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Modifier le projet</h2>
                        <form onSubmit={handleUpdateProject}>
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
                                        rows={4}
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
                                        <option value="PLANNING">Planification</option>
                                        <option value="IN_PROGRESS">En cours</option>
                                        <option value="ON_HOLD">En pause</option>
                                        <option value="COMPLETED">Terminé</option>
                                        <option value="CANCELLED">Annulé</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Date de début
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.start_date}
                                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Date de fin
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.end_date}
                                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
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
                                onClick={() => handleStatusChange('PLANNING')}
                                className={`px-4 py-2 rounded-lg ${project.status === 'PLANNING' ? 'bg-gray-600 text-white' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}
                                disabled={project.status === 'PLANNING'}
                            >
                                Planification
                            </button>
                            <button
                                onClick={() => handleStatusChange('IN_PROGRESS')}
                                className={`px-4 py-2 rounded-lg ${project.status === 'IN_PROGRESS' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-800 hover:bg-blue-200'}`}
                                disabled={project.status === 'IN_PROGRESS'}
                            >
                                En cours
                            </button>
                            <button
                                onClick={() => handleStatusChange('ON_HOLD')}
                                className={`px-4 py-2 rounded-lg ${project.status === 'ON_HOLD' ? 'bg-yellow-600 text-white' : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'}`}
                                disabled={project.status === 'ON_HOLD'}
                            >
                                En pause
                            </button>
                            <button
                                onClick={() => handleStatusChange('COMPLETED')}
                                className={`px-4 py-2 rounded-lg ${project.status === 'COMPLETED' ? 'bg-green-600 text-white' : 'bg-green-100 text-green-800 hover:bg-green-200'}`}
                                disabled={project.status === 'COMPLETED'}
                            >
                                Terminé
                            </button>
                            <button
                                onClick={() => handleStatusChange('CANCELLED')}
                                className={`px-4 py-2 rounded-lg ${project.status === 'CANCELLED' ? 'bg-red-600 text-white' : 'bg-red-100 text-red-800 hover:bg-red-200'}`}
                                disabled={project.status === 'CANCELLED'}
                            >
                                Annulé
                            </button>
                        </div>
                    </div>
                )}

                {/* Project Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Étapes</h3>
                        <div className="text-3xl font-bold text-blue-600">{stages.length}</div>
                        <p className="text-sm text-gray-600">
                            {stages.filter(s => s.status === 'COMPLETED').length} terminées
                        </p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Tâches</h3>
                        <div className="text-3xl font-bold text-blue-600">{tasks.length}</div>
                        <div className="text-sm text-gray-600">
                            <div>{tasks.filter(t => t.status === 'COMPLETED').length} terminées</div>
                            <div>{tasks.filter(t => t.status === 'IN_PROGRESS').length} en cours</div>
                            <div>{tasks.filter(t => t.status === 'TODO').length} à faire</div>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Progression</h3>
                        <div className="w-full bg-gray-200 rounded-full h-4">
                            <div 
                                className="bg-blue-600 h-4 rounded-full flex items-center justify-center text-white text-sm font-medium"
                                style={{ width: `${(stages.filter(s => s.status === 'COMPLETED').length / Math.max(stages.length, 1)) * 100}%` }}
                            >
                                {Math.round((stages.filter(s => s.status === 'COMPLETED').length / Math.max(stages.length, 1)) * 100)}%
                            </div>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <div className="mt-8 flex justify-center space-x-4">
                    <Link
                        href={`/projects/${params.id}`}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                        Retour au projet
                    </Link>
                    <Link
                        href="/projects"
                        className="px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200"
                    >
                        Tous les projets
                    </Link>
                </div>
            </div>
        </div>
    );
}
