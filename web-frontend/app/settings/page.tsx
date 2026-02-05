'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { settingsAPI, notificationPreferencesAPI } from '@/lib/api';

export default function SettingsPage() {
    const router = useRouter();
    const { user, isLoading } = useAuth();
    const [settings, setSettings] = useState<any>(null);
    const [preferences, setPreferences] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!isLoading && !user) {
            router.push('/login');
        }
    }, [user, isLoading, router]);

    useEffect(() => {
        if (user) {
            loadSettings();
        }
    }, [user]);

    const loadSettings = async () => {
        try {
            const [settingsRes, preferencesRes] = await Promise.all([
                settingsAPI.get(),
                notificationPreferencesAPI.get(),
            ]);
            setSettings(settingsRes.data);
            setPreferences(preferencesRes.data);
        } catch (error) {
            console.error('Error loading settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await Promise.all([
                settingsAPI.update(settings),
                notificationPreferencesAPI.update(preferences),
            ]);
            alert('Paramètres enregistrés avec succès');
        } catch (error) {
            console.error('Error saving settings:', error);
            alert('Erreur lors de l\'enregistrement');
        } finally {
            setSaving(false);
        }
    };

    if (isLoading || loading || !settings || !preferences) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">Paramètres</h1>

                <form onSubmit={handleSaveSettings} className="space-y-6">
                    {/* User Settings */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Préférences générales</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Langue</label>
                                <select
                                    value={settings.language}
                                    onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                                >
                                    <option value="fr">Français</option>
                                    <option value="en">English</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Fuseau horaire</label>
                                <select
                                    value={settings.timezone}
                                    onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                                >
                                    <option value="Europe/Paris">Europe/Paris</option>
                                    <option value="America/New_York">America/New_York</option>
                                    <option value="Asia/Tokyo">Asia/Tokyo</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Thème</label>
                                <select
                                    value={settings.theme}
                                    onChange={(e) => setSettings({ ...settings, theme: e.target.value })}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                                >
                                    <option value="light">Clair</option>
                                    <option value="dark">Sombre</option>
                                    <option value="auto">Automatique</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Taille de police</label>
                                <select
                                    value={settings.font_size}
                                    onChange={(e) => setSettings({ ...settings, font_size: e.target.value })}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                                >
                                    <option value="small">Petite</option>
                                    <option value="medium">Moyenne</option>
                                    <option value="large">Grande</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Notification Preferences */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Notifications</h2>
                        <div className="space-y-3">
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={preferences.email_task_assigned}
                                    onChange={(e) => setPreferences({ ...preferences, email_task_assigned: e.target.checked })}
                                    className="mr-2"
                                />
                                <span className="text-sm">Email lors de l'assignation d'une tâche</span>
                            </label>
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={preferences.email_task_updated}
                                    onChange={(e) => setPreferences({ ...preferences, email_task_updated: e.target.checked })}
                                    className="mr-2"
                                />
                                <span className="text-sm">Email lors de la mise à jour d'une tâche</span>
                            </label>
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={preferences.email_task_due}
                                    onChange={(e) => setPreferences({ ...preferences, email_task_due: e.target.checked })}
                                    className="mr-2"
                                />
                                <span className="text-sm">Email pour les tâches échues</span>
                            </label>
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={preferences.email_project_created}
                                    onChange={(e) => setPreferences({ ...preferences, email_project_created: e.target.checked })}
                                    className="mr-2"
                                />
                                <span className="text-sm">Email lors de la création d'un projet</span>
                            </label>
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={preferences.push_notifications}
                                    onChange={(e) => setPreferences({ ...preferences, push_notifications: e.target.checked })}
                                    className="mr-2"
                                />
                                <span className="text-sm">Notifications push</span>
                            </label>
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={preferences.daily_summary}
                                    onChange={(e) => setPreferences({ ...preferences, daily_summary: e.target.checked })}
                                    className="mr-2"
                                />
                                <span className="text-sm">Résumé quotidien par email</span>
                            </label>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={saving}
                            className="bg-primary text-white px-6 py-2 rounded-md hover:bg-primary/90 disabled:opacity-50"
                        >
                            {saving ? 'Enregistrement...' : 'Enregistrer'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
