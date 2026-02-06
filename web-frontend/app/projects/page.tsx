'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { projectsAPI } from '@/lib/api';

export default function ProjectsPage() {
    const router = useRouter();
    const { user, logout, isLoading } = useAuth();
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');

    useEffect(() => {
        if (!isLoading && !user) {
            router.push('/login');
        }
    }, [user, isLoading, router]);

    useEffect(() => {
        if (user) {
            loadProjects();
        }
    }, [user, filter]);

    const loadProjects = async () => {
        try {
            const params = filter ? { status: filter } : {};
            const response = await projectsAPI.getAll(params);
            setProjects(response.data);
        } catch (error) {
            console.error('Error loading projects:', error);
        } finally {
            setLoading(false);
        }
    };

    if (isLoading || !user) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-900">Team Project</h1>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-600">{user.name || user.email}</span>
                        <button
                            onClick={logout}
                            className="text-sm text-red-600 hover:text-red-800"
                        >
                            Déconnexion
                        </button>
                    </div>
                </div>
            </header>

            {/* Navigation */}
            <nav className="bg-white border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex space-x-8">
                        <Link
                            href="/dashboard"
                            className="border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 px-3 py-4 text-sm font-medium"
                        >
                            Tableau de bord
                        </Link>
                        <Link
                            href="/projects"
                            className="border-b-2 border-primary text-primary px-3 py-4 text-sm font-medium"
                        >
                            Projets
                        </Link>
                        <Link
                            href="/tasks"
                            className="border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 px-3 py-4 text-sm font-medium"
                        >
                            Tâches
                        </Link>
                        <Link
                            href="/users"
                            className="border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 px-3 py-4 text-sm font-medium"
                        >
                            Utilisateurs
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Projets</h2>
                    <Link
                        href="/projects/new"
                        className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90"
                    >
                        Nouveau projet
                    </Link>
                </div>

                {/* Filters */}
                <div className="mb-6">
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="border border-gray-300 rounded-md px-3 py-2"
                    >
                        <option value="">Tous les statuts</option>
                        <option value="PLANNING">Planification</option>
                        <option value="IN_PROGRESS">En cours</option>
                        <option value="ON_HOLD">En pause</option>
                        <option value="COMPLETED">Terminé</option>
                        <option value="CANCELLED">Annulé</option>
                    </select>
                </div>

                {/* Projects List */}
                {loading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                    </div>
                ) : projects.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-gray-500">Aucun projet trouvé</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {projects.map((project) => (
                            <Link
                                key={project.id}
                                href={`/projects/${project.id}`}
                                className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
                            >
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                    {project.title}
                                </h3>
                                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                                    {project.description || 'Aucune description'}
                                </p>
                                <div className="flex items-center justify-between">
                                    <span className={`px-2 py-1 text-xs rounded-full ${project.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                                            project.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                                                project.status === 'ON_HOLD' ? 'bg-yellow-100 text-yellow-800' :
                                                    project.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                                                        'bg-gray-100 text-gray-800'
                                        }`}>
                                        {project.status}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                        {project.manager_name || 'Non assigné'}
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
