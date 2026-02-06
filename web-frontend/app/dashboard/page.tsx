'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { dashboardAPI, projectsAPI, tasksAPI } from '@/lib/api';

export default function DashboardPage() {
    const router = useRouter();
    const { user, logout, isLoading } = useAuth();
    const [stats, setStats] = useState<any>(null);
    const [projects, setProjects] = useState<any[]>([]);
    const [tasks, setTasks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isLoading && !user) {
            router.push('/login');
        }
    }, [user, isLoading, router]);

    useEffect(() => {
        if (user) {
            loadData();
        }
    }, [user]);

    const loadData = async () => {
        try {
            const [statsRes, projectsRes, tasksRes] = await Promise.all([
                dashboardAPI.getStats(),
                projectsAPI.getAll(),
                tasksAPI.getAll(),
            ]);
            setStats(statsRes.data);
            setProjects(projectsRes.data);
            setTasks(tasksRes.data);
        } catch (error) {
            console.error('Error loading data:', error);
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
                        <Link href="/profile" className="text-sm text-gray-600 hover:text-gray-900">
                            {user.name || user.email}
                        </Link>
                        <Link href="/settings" className="text-sm text-gray-600 hover:text-gray-900">
                            Paramètres
                        </Link>
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
                            className="border-b-2 border-primary text-primary px-3 py-4 text-sm font-medium"
                        >
                            Tableau de bord
                        </Link>
                        <Link
                            href="/projects"
                            className="border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 px-3 py-4 text-sm font-medium"
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
                        <Link
                            href="/activity"
                            className="border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 px-3 py-4 text-sm font-medium"
                        >
                            Activité
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Stats Cards */}
                {stats && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <div className="bg-white rounded-lg shadow p-6">
                            <h3 className="text-sm font-medium text-gray-500 mb-2">Projets</h3>
                            <p className="text-3xl font-bold text-gray-900">{stats.projects_count}</p>
                        </div>
                        <div className="bg-white rounded-lg shadow p-6">
                            <h3 className="text-sm font-medium text-gray-500 mb-2">Mes tâches</h3>
                            <p className="text-3xl font-bold text-gray-900">{stats.my_tasks_count}</p>
                        </div>
                        <div className="bg-white rounded-lg shadow p-6">
                            <h3 className="text-sm font-medium text-gray-500 mb-2">En attente</h3>
                            <p className="text-3xl font-bold text-yellow-600">{stats.pending_tasks_count}</p>
                        </div>
                        <div className="bg-white rounded-lg shadow p-6">
                            <h3 className="text-sm font-medium text-gray-500 mb-2">Terminées</h3>
                            <p className="text-3xl font-bold text-green-600">{stats.completed_tasks_count}</p>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Projects Card */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-semibold text-gray-900">Projets récents</h2>
                            <Link
                                href="/projects"
                                className="text-sm text-primary hover:underline"
                            >
                                Voir tous
                            </Link>
                        </div>
                        {loading ? (
                            <p className="text-gray-500">Chargement...</p>
                        ) : projects.length === 0 ? (
                            <p className="text-gray-500">Aucun projet</p>
                        ) : (
                            <ul className="space-y-2">
                                {projects.slice(0, 5).map((project) => (
                                    <li key={project.id} className="border-b pb-2">
                                        <Link
                                            href={`/projects/${project.id}`}
                                            className="text-sm font-medium text-gray-900 hover:text-primary"
                                        >
                                            {project.title}
                                        </Link>
                                        <p className="text-xs text-gray-500">{project.status}</p>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* Tasks Card */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-semibold text-gray-900">Mes tâches</h2>
                            <Link
                                href="/tasks"
                                className="text-sm text-primary hover:underline"
                            >
                                Voir toutes
                            </Link>
                        </div>
                        {loading ? (
                            <p className="text-gray-500">Chargement...</p>
                        ) : tasks.length === 0 ? (
                            <p className="text-gray-500">Aucune tâche</p>
                        ) : (
                            <ul className="space-y-2">
                                {tasks.slice(0, 5).map((task) => (
                                    <li key={task.id} className="border-b pb-2">
                                        <Link
                                            href={`/tasks/${task.id}`}
                                            className="text-sm font-medium text-gray-900 hover:text-primary"
                                        >
                                            {task.title}
                                        </Link>
                                        <p className="text-xs text-gray-500">
                                            {task.status} - {task.priority}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
