'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { projectsAPI, usersAPI } from '@/lib/api';
import BackButton from '@/components/BackButton';

interface Project {
    id: string;
    title: string;
    description?: string;
    status: string;
    start_date?: string;
    end_date?: string;
    due_date?: string;
    created_by_name?: string;
    manager_name?: string;
    created_at: string;
}

interface User {
    id: string;
    name?: string;
    email: string;
    role: string;
    is_active: boolean;
}

export default function ProjectsPage() {
    const { user } = useAuth();
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        start_date: '',
        end_date: '',
        due_date: '',
        manager_id: '',
        members: [] as string[],
    });
    const [users, setUsers] = useState<User[]>([]);

    useEffect(() => {
        if (user) {
            loadProjects();
            loadUsers();
        }
    }, [user, filter, searchTerm]);

    const loadUsers = async () => {
        try {
            const response = await usersAPI.getAll();
            setUsers(response.data);
        } catch (error) {
            console.error('Error loading users:', error);
        }
    };

    const loadProjects = async () => {
        try {
            const params: any = {};
            if (filter) params.status = filter;
            if (searchTerm) params.search = searchTerm;

            const response = await projectsAPI.getAll(params);
            setProjects(response.data);
        } catch (error) {
            console.error('Error loading projects:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateProject = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Create project first
            const projectResponse = await projectsAPI.create(formData);
            const projectId = projectResponse.data.id;

            // Add members if any selected
            if (formData.members.length > 0) {
                await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/members`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${sessionStorage.getItem('token')}`,
                    },
                    body: JSON.stringify({ member_ids: formData.members }),
                });
            }

            setShowCreateModal(false);
            setFormData({
                title: '',
                description: '',
                start_date: '',
                end_date: '',
                due_date: '',
                manager_id: '',
                members: [],
            });
            loadProjects();
        } catch (error) {
            console.error('Error creating project:', error);
        }
    };

    const handleDeleteProject = async (id: string) => {
        if (confirm('Êtes-vous sûr de vouloir supprimer ce projet ?')) {
            try {
                await projectsAPI.delete(id);
                loadProjects();
            } catch (error) {
                console.error('Error deleting project:', error);
            }
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PLANNING': return 'bg-yellow-100 text-yellow-800';
            case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800';
            case 'ON_HOLD': return 'bg-orange-100 text-orange-800';
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

    const filteredProjects = projects.filter(project =>
        project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (project.description && project.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
                        <h1 className="text-2xl font-bold text-gray-900">
                            {user?.role === 'employee' ? 'Mes Projets' : 'Projets'}
                        </h1>
                        <p className="text-gray-600 mt-1">
                            {user?.role === 'employee'
                                ? 'Projets sur lesquels vous travaillez actuellement'
                                : 'Gérez tous vos projets'
                            }
                        </p>
                    </div>
                    {(user?.role === 'admin' || user?.role === 'manager') && (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Nouveau projet
                        </button>
                    )}
                </div>

                {/* Search and Filters */}
                <div className="mt-6 flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                        <input
                            type="text"
                            placeholder="Rechercher un projet..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">Tous les statuts</option>
                        <option value="PLANNING">Planification</option>
                        <option value="IN_PROGRESS">En cours</option>
                        <option value="ON_HOLD">En pause</option>
                        <option value="COMPLETED">Terminé</option>
                        <option value="CANCELLED">Annulé</option>
                    </select>
                </div>
            </div>

            {/* Projects Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {filteredProjects.map((project) => (
                    <div key={project.id} className="bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-shadow">
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">{project.title}</h3>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                                    {getStatusLabel(project.status)}
                                </span>
                            </div>

                            <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                                {project.description || 'Aucune description'}
                            </p>

                            <div className="space-y-2 text-sm text-gray-500 mb-4">
                                {project.manager_name && (
                                    <p>Manager: <span className="font-medium text-gray-700">{project.manager_name}</span></p>
                                )}
                                {project.due_date && (
                                    <p>Échéance: <span className="font-medium text-gray-700">{new Date(project.due_date).toLocaleDateString()}</span></p>
                                )}
                            </div>

                            {/* Progress Bar */}
                            <div className="mb-4">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-xs font-medium text-gray-700">Progression</span>
                                    <span className="text-xs font-medium text-gray-700">
                                        {project.status === 'COMPLETED' ? '100%' :
                                            project.status === 'IN_PROGRESS' ? '50%' :
                                                project.status === 'PLANNING' ? '0%' : '25%'}
                                    </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className={`h-2 rounded-full ${project.status === 'COMPLETED' ? 'bg-green-500' :
                                            project.status === 'IN_PROGRESS' ? 'bg-blue-500' :
                                                project.status === 'PLANNING' ? 'bg-gray-400' : 'bg-orange-500'
                                            }`}
                                        style={{
                                            width: project.status === 'COMPLETED' ? '100%' :
                                                project.status === 'IN_PROGRESS' ? '50%' :
                                                    project.status === 'PLANNING' ? '0%' : '25%'
                                        }}
                                    ></div>
                                </div>
                            </div>

                            <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                                <Link
                                    href={`/projects/${project.id}`}
                                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                >
                                    Voir détails →
                                </Link>
                                {(user?.role === 'admin' || user?.role === 'manager') && (
                                    <button
                                        onClick={() => handleDeleteProject(project.id)}
                                        className="text-red-600 hover:text-red-800 text-sm"
                                    >
                                        Supprimer
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Empty State */}
            {filteredProjects.length === 0 && (
                <div className="text-center py-12">
                    <div className="text-gray-500">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <h3 className="mt-2 text-sm font-medium text-gray-900">
                            {user?.role === 'employee' ? 'Aucun projet assigné' : 'Aucun projet trouvé'}
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                            {user?.role === 'employee'
                                ? 'Vous n\'êtes actuellement assigné à aucune tâche. Contactez votre manager pour obtenir des assignments.'
                                : 'Commencez par créer un nouveau projet.'
                            }
                        </p>
                    </div>
                </div>
            )}

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-8">
                            <h2 className="text-2xl font-bold text-gray-900 mb-6">Nouveau projet</h2>
                            <form onSubmit={handleCreateProject}>
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Titre *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.title}
                                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="Nom du projet"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Description
                                        </label>
                                        <textarea
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            rows={4}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="Description du projet"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Début
                                            </label>
                                            <input
                                                type="date"
                                                value={formData.start_date}
                                                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Fin
                                            </label>
                                            <input
                                                type="date"
                                                value={formData.end_date}
                                                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Manager du projet
                                        </label>
                                        <select
                                            value={formData.manager_id}
                                            onChange={(e) => setFormData({ ...formData, manager_id: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="">Sélectionner un manager</option>
                                            {users.filter(u => u.role === 'manager' || u.role === 'admin').map((userItem) => (
                                                <option key={userItem.id} value={userItem.id}>
                                                    {userItem.name || userItem.email}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Membres de l'équipe
                                        </label>
                                        <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-3">
                                            {users.filter(u => u.role === 'employee').map((userItem) => (
                                                <label key={userItem.id} className="flex items-center space-x-2">
                                                    <input
                                                        type="checkbox"
                                                        value={userItem.id}
                                                        checked={formData.members.includes(userItem.id)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setFormData({ ...formData, members: [...formData.members, userItem.id] });
                                                            } else {
                                                                setFormData({ ...formData, members: formData.members.filter(id => id !== userItem.id) });
                                                            }
                                                        }}
                                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                    />
                                                    <span className="text-sm text-gray-700">
                                                        {userItem.name || userItem.email}
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-end space-x-4 mt-8">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateModal(false)}
                                        className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium"
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                                    >
                                        Créer le projet
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
