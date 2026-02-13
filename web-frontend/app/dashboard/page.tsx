'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { dashboardAPI, projectsAPI, tasksAPI } from '@/lib/api';

interface DashboardStats {
    totalProjects: number;
    activeProjects: number;
    totalTasks: number;
    completedTasks: number;
    totalUsers: number;
    activeUsers: number;
}

interface Project {
    id: string;
    title: string;
    status: string;
    due_date?: string;
    manager?: {
        id: string;
        name: string;
        email: string;
    };
    created_by?: {
        id: string;
        name: string;
    };
}

interface Task {
    id: string;
    title: string;
    status: string;
    priority: string;
    project_title?: string;
    due_date?: string;
}

interface ProjectMember {
    user_id: string;
    user_name: string;
    user_email: string;
    user_role?: string;
    is_assigned: boolean;
    joined_at?: string;
    role_id?: string;
    project_id: string;
    project_title: string;
    role?: string;
}

export default function DashboardPage() {
    const { user } = useAuth();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [projects, setProjects] = useState<Project[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            loadData();
        }
    }, [user]);

    const loadData = async () => {
        try {
            const [statsRes, projectsRes, tasksRes] = await Promise.all([
                dashboardAPI.getStats(),
                projectsAPI.getAll({ limit: 5 }),
                tasksAPI.getAll({ limit: 5, assigned_to: user?.id }),
            ]);
            setStats(statsRes.data);
            setProjects(projectsRes.data);
            setTasks(tasksRes.data);

            // Load members for recent projects
            const membersPromises = projectsRes.data.map(async (project: Project) => {
                try {
                    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects/${project.id}/members`, {
                        headers: {
                            'Authorization': `Bearer ${sessionStorage.getItem('token')}`,
                        },
                    });
                    const membersData = await response.json();
                    return membersData.data || [];
                } catch (error) {
                    console.error(`Error loading members for project ${project.id}:`, error);
                    return [];
                }
            });

            const allMembers = await Promise.all(membersPromises);
            const flattenedMembers = allMembers.flat()
                .map((member: any) => ({
                    ...member,
                    project_title: projectsRes.data.find((p: Project) => p.id === member.project_id)?.title || 'Projet inconnu'
                }));
            setProjectMembers(flattenedMembers);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PLANNING': return 'bg-yellow-100 text-yellow-800';
            case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800';
            case 'COMPLETED': return 'bg-green-100 text-green-800';
            case 'TODO': return 'bg-gray-100 text-gray-800';
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
            case 'PLANNING': return 'Planification';
            case 'IN_PROGRESS': return 'En cours';
            case 'COMPLETED': return 'Terminé';
            case 'TODO': return 'À faire';
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
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
                <p className="text-gray-600 mt-1">Bienvenue, {user?.name || user?.email}</p>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <div className="flex items-center">
                            <div className="flex-shrink-0 bg-blue-100 rounded-lg p-3">
                                <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Projets totaux</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.totalProjects}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <div className="flex items-center">
                            <div className="flex-shrink-0 bg-green-100 rounded-lg p-3">
                                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Projets actifs</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.activeProjects}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <div className="flex items-center">
                            <div className="flex-shrink-0 bg-purple-100 rounded-lg p-3">
                                <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Tâches totales</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.totalTasks}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <div className="flex items-center">
                            <div className="flex-shrink-0 bg-yellow-100 rounded-lg p-3">
                                <svg className="w-6 h-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Tâches terminées</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.completedTasks}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
                {/* Recent Projects */}
                <div className="bg-white rounded-lg border border-gray-200">
                    <div className="p-6 border-b border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900">Projets récents</h2>
                    </div>
                    <div className="p-6">
                        <div className="space-y-4">
                            {projects.map((project) => (
                                <div key={project.id} className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">{project.title}</p>
                                        <p className="text-xs text-gray-500">{project.manager?.name || 'Non assigné'}</p>
                                    </div>
                                    <div className="flex items-center space-x-2 ml-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                                            {getStatusLabel(project.status)}
                                        </span>
                                        {project.due_date && (
                                            <span className="text-xs text-gray-500">
                                                {new Date(project.due_date).toLocaleDateString()}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                        {projects.length === 0 && (
                            <div className="text-center py-8">
                                <p className="text-gray-500 text-sm">Aucun projet récent</p>
                            </div>
                        )}
                        <div className="mt-6 pt-4 border-t border-gray-200">
                            <Link
                                href="/projects"
                                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                            >
                                Voir tous les projets →
                            </Link>
                        </div>
                    </div>
                </div>

                {/* My Tasks */}
                <div className="bg-white rounded-lg border border-gray-200">
                    <div className="p-6 border-b border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900">Mes tâches</h2>
                    </div>
                    <div className="p-6">
                        <div className="space-y-4">
                            {tasks.map((task) => (
                                <div key={task.id} className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                                        <p className="text-xs text-gray-500">{task.project_title || 'Non assigné'}</p>
                                    </div>
                                    <div className="flex items-center space-x-2 ml-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                                            {getPriorityLabel(task.priority)}
                                        </span>
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                                            {getStatusLabel(task.status)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {tasks.length === 0 && (
                            <div className="text-center py-8">
                                <p className="text-gray-500 text-sm">Aucune tâche assignée</p>
                            </div>
                        )}
                        <div className="mt-6 pt-4 border-t border-gray-200">
                            <Link
                                href="/tasks"
                                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                            >
                                Voir toutes les tâches →
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Project Members */}
                <div className="bg-white rounded-lg border border-gray-200">
                    <div className="p-6 border-b border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900">Membres des projets</h2>
                    </div>
                    <div className="p-6">
                        <div className="space-y-4">
                            {projectMembers.slice(0, 5).map((member) => (
                                <div key={`${member.project_id}-${member.user_id}`} className="flex items-center space-x-3">
                                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                        <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">{member.user_name || 'Utilisateur'}</p>
                                        <p className="text-xs text-gray-500 truncate">{member.project_title}</p>
                                    </div>
                                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-800 rounded-full flex-shrink-0">
                                        {member.role || 'Membre'}
                                    </span>
                                </div>
                            ))}
                        </div>
                        {projectMembers.length === 0 && (
                            <div className="text-center py-8">
                                <p className="text-gray-500 text-sm">Aucun membre trouvé</p>
                            </div>
                        )}
                        {projectMembers.length > 5 && (
                            <div className="mt-6 pt-4 border-t border-gray-200">
                                <Link
                                    href="/projects"
                                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                >
                                    Voir tous les membres →
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions rapides</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Link
                        href="/projects"
                        className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow text-center"
                    >
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                            <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                        </div>
                        <p className="text-sm font-medium text-gray-900">Nouveau projet</p>
                    </Link>

                    <Link
                        href="/tasks"
                        className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow text-center"
                    >
                        <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                            <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                        </div>
                        <p className="text-sm font-medium text-gray-900">Nouvelle tâche</p>
                    </Link>

                    <Link
                        href="/users"
                        className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow text-center"
                    >
                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                            <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                        </div>
                        <p className="text-sm font-medium text-gray-900">Gérer l'équipe</p>
                    </Link>

                    <Link
                        href="/activity"
                        className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow text-center"
                    >
                        <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                            <svg className="w-6 h-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                        </div>
                        <p className="text-sm font-medium text-gray-900">Voir l'activité</p>
                    </Link>
                </div>
            </div>
        </div>
    );
}
