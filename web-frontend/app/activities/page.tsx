'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { activitiesAPI } from '@/lib/api';

interface Activity {
    id: string;
    action: string;
    entity_type: string;
    entity_id: string;
    description: string;
    created_at: string;
    user_name: string;
    user_email: string;
    entity_title?: string;
}

export default function ActivitiesPage() {
    const { user, isLoading } = useAuth();
    const [activities, setActivities] = useState<Activity[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isLoading && !user) {
            window.location.href = '/login';
            return;
        }

        if (user) {
            loadActivities();
        }
    }, [user, isLoading]);

    const loadActivities = async () => {
        try {
            const response = await activitiesAPI.getAll();
            setActivities(response.data || []);
        } catch (error) {
            console.error('Error loading activities:', error);
        } finally {
            setLoading(false);
        }
    };

    const getActionIcon = (action: string) => {
        switch (action) {
            case 'created':
                return (
                    <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H8m8 0l-8 8m0 0l8-8" />
                    </svg>
                );
            case 'updated':
                return (
                    <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-4h-4v4m0 0l8-8m-8 8v4" />
                    </svg>
                );
            case 'deleted':
                return (
                    <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                );
            case 'completed':
                return (
                    <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                );
            default:
                return (
                    <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h1m0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                );
        }
    };

    const getEntityTypeLabel = (entityType: string) => {
        switch (entityType) {
            case 'project': return 'Projet';
            case 'stage': return 'Étape';
            case 'task': return 'Tâche';
            case 'user': return 'Utilisateur';
            default: return entityType;
        }
    };

    const getActionLabel = (action: string) => {
        switch (action) {
            case 'created': return 'Créé';
            case 'updated': return 'Modifié';
            case 'deleted': return 'Supprimé';
            case 'completed': return 'Terminé';
            default: return action;
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString('fr-FR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (isLoading || loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Activités récentes</h1>
                    <p className="text-gray-600 mt-1">Dernières activités dans le système</p>
                </div>

                {/* Activities List */}
                <div className="bg-white rounded-lg shadow">
                    {activities.length === 0 ? (
                        <div className="p-8 text-center">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune activité</h3>
                            <p className="text-gray-500">Commencez à utiliser l'application pour voir les activités apparaître ici.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-200">
                            {activities.map((activity) => (
                                <div key={activity.id} className="p-6 hover:bg-gray-50 transition-colors">
                                    <div className="flex items-start space-x-4">
                                        {/* Icon */}
                                        <div className="flex-shrink-0 mt-1">
                                            {getActionIcon(activity.action)}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <span className="text-sm font-medium text-gray-900">
                                                        {activity.user_name}
                                                    </span>
                                                    <span className="text-sm text-gray-500 ml-2">
                                                        {getActionLabel(activity.action)} {getEntityTypeLabel(activity.entity_type)}
                                                    </span>
                                                    {activity.entity_title && (
                                                        <span className="text-sm font-medium text-gray-700 ml-2">
                                                            "{activity.entity_title}"
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-xs text-gray-500">
                                                    {formatDate(activity.created_at)}
                                                </span>
                                            </div>
                                            {activity.description && (
                                                <p className="text-sm text-gray-600 mt-1">
                                                    {activity.description}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
