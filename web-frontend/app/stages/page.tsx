'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { stagesAPI } from '@/lib/api';
import BackButton from '@/components/BackButton';

interface Stage {
    id: string;
    name: string;
    description?: string;
    status: string;
    project_id: string;
    project_title?: string;
    created_at: string;
}

export default function StagesPage() {
    const router = useRouter();
    const { user, isLoading } = useAuth();
    const [stages, setStages] = useState<Stage[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');

    useEffect(() => {
        if (!isLoading && !user) {
            router.push('/login');
        }
    }, [user, isLoading, router]);

    useEffect(() => {
        if (user) {
            loadStages();
        }
    }, [user, filter]);

    const loadStages = async () => {
        try {
            const params: any = {};
            if (filter) params.status = filter;

            const response = await stagesAPI.getAll(params);
            setStages(response.data);
        } catch (error) {
            console.error('Error loading stages:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'COMPLETED': return 'bg-green-100 text-green-800';
            case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800';
            case 'BLOCKED': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'COMPLETED': return 'Terminé';
            case 'IN_PROGRESS': return 'En cours';
            case 'BLOCKED': return 'Bloqué';
            default: return status;
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
                <BackButton className="mb-4" />
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Étapes</h1>
                        <p className="text-gray-600 mt-1">Gérez toutes les étapes des projets</p>
                    </div>
                    {(user?.role === 'admin' || user?.role === 'manager') && (
                        <button
                            onClick={() => router.push('/stages/create')}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Créer une étape
                        </button>
                    )}
                </div>

                {/* Filters */}
                <div className="mt-6">
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">Tous les statuts</option>
                        <option value="COMPLETED">Terminé</option>
                        <option value="IN_PROGRESS">En cours</option>
                        <option value="BLOCKED">Bloqué</option>
                    </select>
                </div>
            </div>

            {/* Stages Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {stages.map((stage) => (
                    <div key={stage.id} className="bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-shadow">
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">{stage.name}</h3>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(stage.status)}`}>
                                    {getStatusLabel(stage.status)}
                                </span>
                            </div>

                            <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                                {stage.description || 'Aucune description'}
                            </p>

                            <div className="space-y-2 text-sm text-gray-500 mb-4">
                                {stage.project_title && (
                                    <p>Projet: <span className="font-medium text-gray-700">{stage.project_title}</span></p>
                                )}
                                <p>Créé le: <span className="font-medium text-gray-700">{new Date(stage.created_at).toLocaleDateString()}</span></p>
                            </div>

                            {/* Progress Bar */}
                            <div className="mb-4">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-xs font-medium text-gray-700">Progression</span>
                                    <span className="text-xs font-medium text-gray-700">
                                        {stage.status === 'COMPLETED' ? '100%' :
                                            stage.status === 'IN_PROGRESS' ? '50%' :
                                                stage.status === 'TODO' ? '0%' : '25%'}
                                    </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className={`h-2 rounded-full ${stage.status === 'COMPLETED' ? 'bg-green-500' :
                                                stage.status === 'IN_PROGRESS' ? 'bg-blue-500' :
                                                    stage.status === 'TODO' ? 'bg-gray-400' : 'bg-orange-500'
                                            }`}
                                        style={{
                                            width: stage.status === 'COMPLETED' ? '100%' :
                                                stage.status === 'IN_PROGRESS' ? '50%' :
                                                    stage.status === 'TODO' ? '0%' : '25%'
                                        }}
                                    ></div>
                                </div>
                            </div>

                            <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                                <span className="text-xs text-gray-500">
                                    ID: {stage.id}
                                </span>
                                <Link
                                    href={`/stages/${stage.id}`}
                                    className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                                >
                                    Voir les détails
                                </Link>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Empty State */}
            {stages.length === 0 && (
                <div className="text-center py-12">
                    <div className="text-gray-500">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <h3 className="mt-2 text-sm font-medium text-gray-900">Aucune étape trouvée</h3>
                        <p className="mt-1 text-sm text-gray-500">Commencez par créer des étapes dans les projets.</p>
                    </div>
                </div>
            )}
        </div>
    );
}
