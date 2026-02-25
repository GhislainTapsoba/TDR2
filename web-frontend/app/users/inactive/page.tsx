'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
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
}

export default function InactiveUsersPage() {
    const { user } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            loadInactiveUsers();
        }
    }, [user]);

    const loadInactiveUsers = async () => {
        try {
            const response = await fetch('/api/users?include_inactive=true');
            const data = await response.json();
            setUsers(data.filter((u: User) => !u.is_active));
        } catch (error) {
            console.error('Error loading inactive users:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleActive = async (id: string, isActive: boolean) => {
        try {
            await usersAPI.update(id, { is_active: !isActive });
            loadInactiveUsers();
            alert(`Utilisateur ${!isActive ? 'activé' : 'désactivé'} avec succès`);
        } catch (error) {
            console.error('Error toggling user active status:', error);
            alert('Erreur lors de la modification du statut');
        }
    };

    const handleDeleteUser = async (id: string, name: string) => {
        if (!confirm(`Êtes-vous sûr de vouloir supprimer l'utilisateur "${name}" ? Cette action est irréversible.`)) {
            return;
        }

        try {
            await usersAPI.delete(id);
            loadInactiveUsers();
            alert('Utilisateur supprimé avec succès');
        } catch (error) {
            console.error('Error deleting user:', error);
            alert('Erreur lors de la suppression de l\'utilisateur');
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

    return (
        <div>
            <div className="mb-8">
                <BackButton className="mb-4" />
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Utilisateurs Inactifs</h1>
                        <p className="text-gray-600 mt-1">Gérez les utilisateurs inactifs du système</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link
                            href="/users/active"
                            className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                        >
                            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Voir actifs
                        </Link>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Nom
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Email
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Rôle
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Téléphone
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Date de création
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {users.map((userItem) => (
                                <tr key={userItem.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">
                                            <Link
                                                href={`/users/${userItem.id}`}
                                                className="text-blue-600 hover:text-blue-800 hover:underline"
                                            >
                                                {userItem.name || 'Non défini'}
                                            </Link>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">{userItem.email}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleColor(userItem.role)}`}>
                                            {getRoleLabel(userItem.role)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {userItem.phone || 'Non défini'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(userItem.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <div className="flex space-x-2">
                                            <Link
                                                href={`/users/${userItem.id}`}
                                                className="text-blue-600 hover:text-blue-800"
                                            >
                                                Voir
                                            </Link>
                                            <button
                                                onClick={() => handleToggleActive(userItem.id, userItem.is_active)}
                                                className="text-green-600 hover:text-green-800"
                                            >
                                                Réactiver
                                            </button>
                                            <button
                                                onClick={() => handleDeleteUser(userItem.id, userItem.name || 'Cet utilisateur')}
                                                className="text-red-600 hover:text-red-800"
                                            >
                                                Supprimer
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
