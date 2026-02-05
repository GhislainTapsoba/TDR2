'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { activityLogsAPI } from '@/lib/api';

export default function ActivityPage() {
    const router = useRouter();
    const { user, isLoading } = useAuth();
    const [activities, setActivities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isLoading && !user) {
            router.push('/login');
        }
    }, [user, isLoading, router]);

    useEffect(() => {
        if (user) {
            loadActivities();
        }
    }, [user]);

    const loadActivities = async () => {
        try {
            const response = await activityLogsAPI.getAll({ limit: 100 });
            setActivities(response.data);
        } catch (error) {
            console.error('Error loading activities:', error);
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
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">Journal d'activité</h1>

                {loading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                    </div>
                ) : activities.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-gray-500">Aucune activité</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-lg shadow">
                        <div className="divide-y divide-gray-200">
                            {activities.map((activity) => (
                                <div key={activity.id} className="p-4 hover:bg-gray-50">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-semibold text-sm">{activity.user_name}</span>
                                                <span className="text-xs text-gray-500">
                                                    {new Date(activity.created_at).toLocaleString()}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-700">
                                                <span className="font-medium">{activity.action}</span>
                                                {' '}sur{' '}
                                                <span className="font-medium">{activity.entity_type}</span>
                                            </p>
                                            {activity.details && (
                                                <p className="text-xs text-gray-600 mt-1">{activity.details}</p>
                                            )}
                                        </div>
                                        <span className={`px-2 py-1 text-xs rounded-full ${activity.action.includes('CREATE') ? 'bg-green-100 text-green-800' :
                                                activity.action.includes('UPDATE') ? 'bg-blue-100 text-blue-800' :
                                                    activity.action.includes('DELETE') ? 'bg-red-100 text-red-800' :
                                                        'bg-gray-100 text-gray-800'
                                            }`}>
                                            {activity.action}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
