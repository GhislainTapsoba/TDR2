'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { usersAPI } from '@/lib/api';
import BackButton from '@/components/BackButton';

interface User {
    id: string;
    name?: string;
    email: string;
    role: string;
    is_active: boolean;
    phone?: string;
    created_at: string;
    updated_at: string;
}

export default function UserDetailPage() {
    const { user: currentUser } = useAuth();
    const params = useParams();
    const router = useRouter();
    const userId = params.id as string;

    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        role: 'employee',
        phone: '',
    });

    useEffect(() => {
        if (userId) {
            loadUser();
        }
    }, [userId]);

    const loadUser = async () => {
        try {
            const response = await usersAPI.getById(userId);
            setUser(response.data);
            setFormData({
                name: response.data.name || '',
                email: response.data.email,
                role: response.data.role,
                phone: response.data.phone || '',
            });
        } catch (error: any) {
            setError(error.response?.data?.error || 'Erreur lors du chargement de l\'utilisateur');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await usersAPI.update(userId, formData);
            setIsEditing(false);
            loadUser();
            alert('Utilisateur mis à jour avec succès');
        } catch (error: any) {
            setError(error.response?.data?.error || 'Erreur lors de la mise à jour');
        }
    };

    const handleToggleActive = async () => {
        if (!user) return;
        
        try {
            await usersAPI.update(userId, { is_active: !user.is_active });
            loadUser();
            alert(`Utilisateur ${!user.is_active ? 'activé' : 'désactivé'} avec succès`);
        } catch (error: any) {
            setError(error.response?.data?.error || 'Erreur lors de la modification du statut');
        }
    };

    const handleDelete = async () => {
        if (!user) return;
        
        if (!confirm(`Êtes-vous sûr de vouloir supprimer l'utilisateur "${user.name || user.email}" ? Cette action est irréversible.`)) {
            return;
        }

        try {
            await usersAPI.delete(userId);
            router.push('/users');
        } catch (error: any) {
            setError(error.response?.data?.error || 'Erreur lors de la suppression');
        }
    };

    const getRoleColor = (role: string) => {
        switch (role) {
            case 'admin': return 'bg-purple-100 text-purple-800';
            case 'manager': return 'bg-blue-100 text-blue-800';
            case 'employee': return 'bg-green-100 text-green-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getRoleLabel = (role: string) => {
        switch (role) {
            case 'admin': return 'Administrateur';
            case 'manager': return 'Manager';
            case 'employee': return 'Employé';
            default: return role;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error && !user) {
        return (
            <div className="max-w-4xl mx-auto p-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-600">{error}</p>
                    <button
                        onClick={() => router.push('/users')}
                        className="mt-4 text-blue-600 hover:text-blue-800"
                    >
                        Retour à la liste
                    </button>
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="max-w-4xl mx-auto p-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-yellow-600">Utilisateur non trouvé</p>
                    <button
                        onClick={() => router.push('/users')}
                        className="mt-4 text-blue-600 hover:text-blue-800"
                    >
                        Retour à la liste
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-6">
            {/* Header */}
            <div className="mb-8">
                <BackButton className="mb-4" />
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            {user.name || 'Utilisateur sans nom'}
                        </h1>
                        <p className="text-gray-600 mt-1">{user.email}</p>
                    </div>
                    <div className="flex space-x-2">
                        {!isEditing && (
                            <>
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    Modifier
                                </button>
                                <button
                                    onClick={handleToggleActive}
                                    className={`px-4 py-2 rounded-lg ${
                                        user.is_active 
                                            ? 'bg-yellow-600 text-white hover:bg-yellow-700' 
                                            : 'bg-green-600 text-white hover:bg-green-700'
                                    }`}
                                >
                                    {user.is_active ? 'Désactiver' : 'Activer'}
                                </button>
                                <button
                                    onClick={handleDelete}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                                    disabled={user.id === currentUser?.id}
                                >
                                    Supprimer
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-600">{error}</p>
                </div>
            )}

            {/* User Details */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-6">
                    {!isEditing ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Nom
                                </label>
                                <p className="text-gray-900">{user.name || 'Non défini'}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Email
                                </label>
                                <p className="text-gray-900">{user.email}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Rôle
                                </label>
                                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleColor(user.role)}`}>
                                    {getRoleLabel(user.role)}
                                </span>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Statut
                                </label>
                                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                    user.is_active
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-red-100 text-red-800'
                                }`}>
                                    {user.is_active ? 'Actif' : 'Inactif'}
                                </span>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Téléphone
                                </label>
                                <p className="text-gray-900">{user.phone || 'Non défini'}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Date de création
                                </label>
                                <p className="text-gray-900">{new Date(user.created_at).toLocaleDateString()}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Dernière mise à jour
                                </label>
                                <p className="text-gray-900">{new Date(user.updated_at).toLocaleDateString()}</p>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleUpdate} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Nom
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Rôle
                                    </label>
                                    <select
                                        value={formData.role}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="employee">Employé</option>
                                        <option value="manager">Manager</option>
                                        <option value="admin">Administrateur</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Téléphone
                                    </label>
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsEditing(false);
                                        setFormData({
                                            name: user.name || '',
                                            email: user.email,
                                            role: user.role,
                                            phone: user.phone || '',
                                        });
                                    }}
                                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    Enregistrer
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
