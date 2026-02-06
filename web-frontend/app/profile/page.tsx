'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { profileAPI } from '@/lib/api';
import BackButton from '@/components/BackButton';

export default function ProfilePage() {
    const router = useRouter();
    const { user, isLoading } = useAuth();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({ name: '', email: '' });
    const [passwordData, setPasswordData] = useState({ 
        currentPassword: '', 
        newPassword: '', 
        confirmPassword: '' 
    });
    const [showPasswordForm, setShowPasswordForm] = useState(false);

    useEffect(() => {
        if (!isLoading && !user) {
            router.push('/login');
        }
    }, [user, isLoading, router]);

    useEffect(() => {
        if (user) {
            loadProfile();
        }
    }, [user]);

    const loadProfile = async () => {
        try {
            const response = await profileAPI.get();
            setProfile(response.data);
            setFormData({
                name: response.data.name || '',
                email: response.data.email || '',
            });
        } catch (error) {
            console.error('Error loading profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await profileAPI.update(formData);
            alert('Profil mis à jour avec succès');
            loadProfile();
        } catch (error: any) {
            alert('Erreur lors de la mise à jour: ' + (error.message || 'Erreur inconnue'));
        } finally {
            setSaving(false);
        }
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            alert('Les mots de passe ne correspondent pas');
            return;
        }

        if (passwordData.newPassword.length < 6) {
            alert('Le mot de passe doit contenir au moins 6 caractères');
            return;
        }

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/change-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                },
                body: JSON.stringify({
                    currentPassword: passwordData.currentPassword,
                    newPassword: passwordData.newPassword,
                }),
            });

            if (response.ok) {
                alert('Mot de passe changé avec succès');
                setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                setShowPasswordForm(false);
            } else {
                const error = await response.json();
                alert('Erreur: ' + (error.error || 'Impossible de changer le mot de passe'));
            }
        } catch (error) {
            alert('Erreur lors du changement de mot de passe');
        }
    };

    if (isLoading || loading || !profile) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header with back button */}
                <BackButton className="mb-6" />
                
                <h1 className="text-3xl font-bold text-gray-900 mb-8">Mon Profil</h1>

                <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Informations du compte</h2>
                    <div className="grid grid-cols-2 gap-4 text-sm mb-6">
                        <div>
                            <span className="text-gray-500">Rôle:</span>
                            <span className="ml-2 font-medium">{profile.role}</span>
                        </div>
                        <div>
                            <span className="text-gray-500">Statut:</span>
                            <span className={`ml-2 px-2 py-1 text-xs rounded-full ${profile.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                {profile.is_active ? 'Actif' : 'Inactif'}
                            </span>
                        </div>
                        <div>
                            <span className="text-gray-500">Membre depuis:</span>
                            <span className="ml-2 font-medium">{new Date(profile.created_at).toLocaleDateString()}</span>
                        </div>
                    </div>

                    <form onSubmit={handleSave} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                                required
                            />
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

                {/* Password Change Section */}
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-gray-900">Mot de passe</h2>
                        <button
                            type="button"
                            onClick={() => setShowPasswordForm(!showPasswordForm)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                            {showPasswordForm ? 'Annuler' : 'Changer le mot de passe'}
                        </button>
                    </div>

                    {showPasswordForm && (
                        <form onSubmit={handlePasswordChange} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Mot de passe actuel
                                </label>
                                <input
                                    type="password"
                                    value={passwordData.currentPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Nouveau mot de passe
                                </label>
                                <input
                                    type="password"
                                    value={passwordData.newPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                                    required
                                    minLength={6}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Confirmer le nouveau mot de passe
                                </label>
                                <input
                                    type="password"
                                    value={passwordData.confirmPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                                    required
                                    minLength={6}
                                />
                            </div>
                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
                                >
                                    Changer le mot de passe
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
