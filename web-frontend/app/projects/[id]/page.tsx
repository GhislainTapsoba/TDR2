'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { projectsAPI, stagesAPI, tasksAPI } from '@/lib/api';

export default function ProjectDetailPage() {
    const router = useRouter();
    const params = useParams();
    const { user, isLoading } = useAuth();
    const [project, setProject] = useState<any>(null);
    const [stages, setStages] = useState<any[]>([]);
    const [tasks, setTasks] = useState<any[]>([]);
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
            const [projectRes, stagesRes, tasksRes] = await Promise.all([
                projectsAPI.getById(params.id as string),
                stagesAPI.getAll({ project_id: params.id }),
                tasksAPI.getAll({ project_id: params.id }),
            ]);
            setProject(projectRes.data);
            setStages(stagesRes.data);
            setTasks(tasksRes.data);
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
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-6">
                    <Link href="/projects" className="text-primary hover:underline">
                        ← Retour aux projets
                    </Link>
                </div>

                {/* Project Header */}
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">{project.title}</h1>
                            <p className="text-gray-600">{project.description}</p>
                        </div>
                        <span className={`px-3 py-1 text-sm rounded-full ${project.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                                project.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                                    project.status === 'ON_HOLD' ? 'bg-yellow-100 text-yellow-800' :
                                        project.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                                            'bg-gray-100 text-gray-800'
                            }`}>
                            {project.status}
                        </span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                            <span className="text-gray-500">Manager:</span>
                            <span className="ml-2 font-medium">{project.manager_name || 'Non assigné'}</span>
                        </div>
                        <div>
                            <span className="text-gray-500">Début:</span>
                            <span className="ml-2 font-medium">{project.start_date ? new Date(project.start_date).toLocaleDateString() : 'N/A'}</span>
                        </div>
                        <div>
                            <span className="text-gray-500">Fin:</span>
                            <span className="ml-2 font-medium">{project.end_date ? new Date(project.end_date).toLocaleDateString() : 'N/A'}</span>
                        </div>
                    </div>
                </div>

                {/* Stages */}
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Étapes ({stages.length})</h2>
                    {stages.length === 0 ? (
                        <p className="text-gray-500">Aucune étape</p>
                    ) : (
                        <div className="space-y-3">
                            {stages.map((stage) => (
                                <div key={stage.id} className="border rounded-lg p-4">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <h3 className="font-semibold">{stage.name}</h3>
                                            <p className="text-sm text-gray-600">{stage.description}</p>
                                        </div>
                                        <span className={`px-2 py-1 text-xs rounded-full ${stage.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                                                stage.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                                                    stage.status === 'BLOCKED' ? 'bg-red-100 text-red-800' :
                                                        'bg-gray-100 text-gray-800'
                                            }`}>
                                            {stage.status}
                                        </span>
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
                        <p className="text-gray-500">Aucune tâche</p>
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
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2 py-1 text-xs rounded-full ${task.priority === 'URGENT' ? 'bg-red-100 text-red-800' :
                                                    task.priority === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                                                        task.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                                                            'bg-gray-100 text-gray-800'
                                                }`}>
                                                {task.priority}
                                            </span>
                                            <span className={`px-2 py-1 text-xs rounded-full ${task.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                                                    task.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                                                        'bg-gray-100 text-gray-800'
                                                }`}>
                                                {task.status}
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
