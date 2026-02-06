'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { activityLogsAPI } from '@/lib/api';

interface ActivityLog {
    id: string;
    user_id: string;
    user_name?: string;
    action: string;
    entity_type: string;
    entity_id: string;
    details?: string;
    created_at: string;
}

export default function ActivityPage() {
    const { user } = useAuth();
    const [activities, setActivities] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');

    useEffect(() => {
        if (user) {
            loadActivities();
        }
    }, [user, filter]);

    const loadActivities = async () => {
        try {
            const params = filter ? { entity_type: filter } : {};
            const response = await activityLogsAPI.getAll(params);
            setActivities(response.data);
        } catch (error) {
            console.error('Error loading activities:', error);
        } finally {
            setLoading(false);
        }
    };

    const getActionColor = (action: string) => {
        switch (action.toLowerCase()) {
            case 'create': return 'bg-green-100 text-green-800';
            case 'update': return 'bg-blue-100 text-blue-800';
            case 'delete': return 'bg-red-100 text-red-800';
            case 'login': return 'bg-purple-100 text-purple-800';
            case 'logout': return 'bg-gray-100 text-gray-800';
            default: return 'bg-yellow-100 text-yellow-800';
        }
    };

    const getActionLabel = (action: string) => {
        switch (action.toLowerCase()) {
            case 'create': return 'Création';
            case 'update': return 'Mise à jour';
            case 'delete': return 'Suppression';
            case 'login': return 'Connexion';
            case 'logout': return 'Déconnexion';
            default: return action;
        }
    };

    const getEntityTypeLabel = (entityType: string) => {
        switch (entityType.toLowerCase()) {
            case 'project': return 'Projet';
            case 'task': return 'Tâche';
            case 'user': return 'Utilisateur';
            case 'stage': return 'Étape';
            case 'notification': return 'Notification';
            default: return entityType;
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
                <button
                    onClick={() => window.history.back()}
                    className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
                >
                    <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Retour
                </button>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Journal d'activité</h1>
                        <p className="text-gray-600 mt-1">Consultez toutes les activités récentes</p>
                    </div>
                </div>
                {/* Filters */}
                <div className="mt-6 flex space-x-4">
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">Toutes les entités</option>
                        <option value="project">Projets</option>
                        <option value="task">Tâches</option>
                        <option value="user">Utilisateurs</option>
                        <option value="stage">Étapes</option>
                        <option value="notification">Notifications</option>
                    </select>
                </div>
            </div>

            {/* Activity Timeline */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="divide-y divide-gray-200">
                    {activities.map((activity) => (
                        <div key={activity.id} className="p-6 hover:bg-gray-50">
                            <div className="flex items-start space-x-4">
                                <div className="flex-shrink-0">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getActionColor(activity.action)}`}>
                                        <span className="text-xs font-bold">
                                            {activity.action.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center space-x-2 mb-2">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getActionColor(activity.action)}`}>
                                            {getActionLabel(activity.action)}
                                        </span>
                                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                                            {getEntityTypeLabel(activity.entity_type)}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-900 mb-1">
                                        {activity.user_name || 'Utilisateur'} a {getActionLabel(activity.action).toLowerCase()} {getEntityTypeLabel(activity.entity_type).toLowerCase()}
                                    </p>
                                    {activity.details && (
                                        <p className="text-sm text-gray-600 mb-2">{activity.details}</p>
                                    )}
                                    <p className="text-xs text-gray-500">
                                        {new Date(activity.created_at).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                
                {activities.length === 0 && (
                    <div className="text-center py-12">
                        <div className="text-gray-500">
                            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <h3 className="mt-2 text-sm font-medium text-gray-900">Aucune activité</h3>
                            <p className="mt-1 text-sm text-gray-500">Commencez à utiliser l'application pour voir les activités ici.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
