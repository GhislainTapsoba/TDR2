'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { stagesAPI, projectsAPI } from '@/lib/api';
import BackButton from '@/components/BackButton';

interface Project {
    id: string;
    title: string;
}

export default function CreateStagePage() {
    const router = useRouter();
    const { user, isLoading } = useAuth();
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        position: 0,
        duration: 0,
        project_id: ''
    });

    useEffect(() => {
        if (!isLoading && !user) {
            router.push('/login');
        }
    }, [user, isLoading, router]);

    useEffect(() => {
        if (user) {
            loadProjects();
        }
    }, [user]);

    const loadProjects = async () => {
        try {
            const response = await projectsAPI.getAll();
            setProjects(response.data || []);
        } catch (error) {
            console.error('Error loading projects:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.name || !formData.project_id) {
            alert('Le nom et le projet sont requis');
            return;
        }

        setSubmitting(true);
        
        try {
            await stagesAPI.create(formData);
            router.push('/stages');
        } catch (error: any) {
            console.error('Error creating stage:', error);
            alert(error.response?.data?.error || 'Erreur lors de la création de l\'étape');
        } finally {
            setSubmitting(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'position' || name === 'duration' ? parseInt(value) || 0 : value
        }));
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
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Créer une étape</h1>
                    <p className="text-gray-600 mt-1">Ajoutez une nouvelle étape à un projet</p>
                </div>
            </div>

            {/* Form */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Project Selection */}
                    <div>
                        <label htmlFor="project_id" className="block text-sm font-medium text-gray-700 mb-2">
                            Projet *
                        </label>
                        <select
                            id="project_id"
                            name="project_id"
                            value={formData.project_id}
                            onChange={handleChange}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Sélectionnez un projet</option>
                            {projects.map((project) => (
                                <option key={project.id} value={project.id}>
                                    {project.title}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Name */}
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                            Nom de l'étape *
                        </label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Ex: Conception, Développement, Tests..."
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                            Description
                        </label>
                        <textarea
                            id="description"
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Description détaillée de l'étape..."
                        />
                    </div>

                    {/* Position and Duration */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="position" className="block text-sm font-medium text-gray-700 mb-2">
                                Position
                            </label>
                            <input
                                type="number"
                                id="position"
                                name="position"
                                value={formData.position}
                                onChange={handleChange}
                                min="0"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Ordre d'affichage"
                            />
                        </div>

                        <div>
                            <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-2">
                                Durée (jours)
                            </label>
                            <input
                                type="number"
                                id="duration"
                                name="duration"
                                value={formData.duration}
                                onChange={handleChange}
                                min="0"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Durée estimée"
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={() => router.push('/stages')}
                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {submitting && (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            )}
                            Créer l'étape
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
