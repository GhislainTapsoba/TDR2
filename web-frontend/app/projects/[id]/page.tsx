'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { projectsAPI, stagesAPI, tasksAPI } from '@/lib/api';
import BackButton from '@/components/BackButton';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { canAccessPage } from '@/lib/permissions';

export default function ProjectDetailPage() {
    const router = useRouter();
    const params = useParams();
    const { user, isLoading } = useAuth();
    const [project, setProject] = useState<any>(null);
    const [stages, setStages] = useState<any[]>([]);
    const [tasks, setTasks] = useState<any[]>([]);
    const [members, setMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

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
            const [projectRes, stagesRes, tasksRes, membersRes] = await Promise.all([
                projectsAPI.getById(params.id as string),
                stagesAPI.getAll({ project_id: params.id }),
                tasksAPI.getAll({ project_id: params.id }),
                projectsAPI.getMembers(params.id as string),
            ]);
            setProject(projectRes.data);
            setStages(stagesRes.data);
            setTasks(tasksRes.data);
            setMembers(membersRes.data || []);
        } catch (error) {
            console.error('Error loading project:', error);
        } finally {
            setLoading(false);
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
        <ProtectedRoute requiredPath={`/projects/[id]`}>
            <>
                {/* Header with back button */}
                <div className="mb-8">
                    <BackButton className="mb-4" />
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Project Header */}
                    <div className="bg-white rounded-lg shadow p-6 mb-6">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900 mb-2">{project.title}</h1>
                                <p className="text-gray-600">{project.description}</p>
                            </div>
                            <div className="flex gap-2">
                                <span className={`px-3 py-1 text-sm rounded-full ${project.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                                    project.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                                        project.status === 'ON_HOLD' ? 'bg-yellow-100 text-yellow-800' :
                                            project.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                                                'bg-gray-100 text-gray-800'
                                    }`}>
                                    {project.status === 'PLANNING' ? 'Planification' :
                                        project.status === 'IN_PROGRESS' ? 'En cours' :
                                            project.status === 'ON_HOLD' ? 'En pause' :
                                                project.status === 'COMPLETED' ? 'Terminé' :
                                                    project.status === 'CANCELLED' ? 'Annulé' : project.status}
                                </span>
                                {(user.role === 'admin' || user.role === 'manager' || project.manager_id === user.id) && (
                                    <Link
                                        href={`/projects/${params.id}/edit`}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                    >
                                        Modifier
                                    </Link>
                                )}
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                            <div>
                                <span className="text-gray-500">Manager:</span>
                                <span className="ml-2 font-medium">{project.manager?.name || 'Non assigné'}</span>
                            </div>
                            <div>
                                <span className="text-gray-500">Début:</span>
                                <span className="ml-2 font-medium">{project.start_date ? new Date(project.start_date).toLocaleDateString() : 'N/A'}</span>
                            </div>
                            <div>
                                <span className="text-gray-500">Fin:</span>
                                <span className="ml-2 font-medium">{project.end_date ? new Date(project.end_date).toLocaleDateString() : 'N/A'}</span>
                            </div>
                            <div>
                                <span className="text-gray-500">Échéance:</span>
                                <span className="ml-2 font-medium">{project.due_date ? new Date(project.due_date).toLocaleDateString() : 'N/A'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Project Members */}
                    <div className="bg-white rounded-lg shadow p-6 mb-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Équipe ({members.length})</h2>
                        {members.length === 0 ? (
                            <p className="text-gray-500">Aucun membre assigné</p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {members.map((member) => (
                                    <div key={member.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                            <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">{member.user_name || member.name || 'Utilisateur'}</p>
                                            <p className="text-sm text-gray-500">{member.user_email || member.email || 'N/A'}</p>
                                            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-800 rounded-full">
                                                {member.role || 'Membre'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Stages */}
                    <div className="bg-white rounded-lg shadow p-6 mb-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Étapes ({stages.length})</h2>
                        {stages.length === 0 ? (
                            <p className="text-gray-500">Aucune étape définie</p>
                        ) : (
                            <div className="space-y-3">
                                {stages.map((stage) => (
                                    <div key={stage.id} className="border rounded-lg p-4">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <h3 className="font-semibold">{stage.name}</h3>
                                                <p className="text-sm text-gray-600">{stage.description || 'Aucune description'}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2 py-1 text-xs rounded-full ${stage.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                                                    stage.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                                                        stage.status === 'BLOCKED' ? 'bg-red-100 text-red-800' :
                                                            'bg-gray-100 text-gray-800'
                                                    }`}>
                                                    {stage.status === 'COMPLETED' ? 'Terminé' :
                                                        stage.status === 'IN_PROGRESS' ? 'En cours' :
                                                            stage.status === 'BLOCKED' ? 'Bloqué' : stage.status}
                                                </span>
                                                <Link
                                                    href={`/stages/${stage.id}`}
                                                    className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                                                >
                                                    Voir détails
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Tasks */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Tâches ({tasks.length})</h2>
                        {tasks.length === 0 ? (
                            <p className="text-gray-500">Aucune tâche assignée</p>
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
                                                <p className="text-sm text-gray-600">{task.stage_name || 'Sans étape'}</p>
                                                {task.assigned_to_name && (
                                                    <p className="text-xs text-gray-500 mt-1">Assigné à: {task.assigned_to_name}</p>
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
            </>
        </ProtectedRoute>
    );
}
