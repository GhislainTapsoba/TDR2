'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { projectsAPI, tasksAPI, stagesAPI } from '@/lib/api';
import BackButton from '@/components/BackButton';

export default function ExportPage() {
    const router = useRouter();
    const { user, isLoading } = useAuth();
    const [projects, setProjects] = useState<any[]>([]);
    const [tasks, setTasks] = useState<any[]>([]);
    const [stages, setStages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [exportType, setExportType] = useState('projects');
    const [dateRange, setDateRange] = useState({
        start: '',
        end: ''
    });

    useEffect(() => {
        if (!isLoading && !user) {
            router.push('/login');
        }
    }, [user, isLoading, router]);

    useEffect(() => {
        if (user && (user.role === 'admin' || user.role === 'manager')) {
            loadData();
        }
    }, [user]);

    const loadData = async () => {
        try {
            const params: any = {};
            if (dateRange.start && dateRange.end) {
                params.start_date = dateRange.start;
                params.end_date = dateRange.end;
            }

            const [projectsRes, tasksRes, stagesRes] = await Promise.all([
                projectsAPI.getAll(params),
                tasksAPI.getAll(params),
                stagesAPI.getAll(params)
            ]);

            setProjects(projectsRes.data);
            setTasks(tasksRes.data);
            setStages(stagesRes.data);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        try {
            let data: any[] = [];
            let filename = '';
            let headers: string[] = [];

            switch (exportType) {
                case 'projects':
                    data = projects.map(p => ({
                        ID: p.id,
                        Titre: p.title,
                        Description: p.description || '',
                        Statut: p.status,
                        'Date de début': p.start_date || '',
                        'Date de fin': p.end_date || '',
                        'Date d\'échéance': p.due_date || '',
                        Manager: p.manager_name || '',
                        'Créé le': new Date(p.created_at).toLocaleString()
                    }));
                    filename = `projets_${new Date().toISOString().split('T')[0]}.csv`;
                    headers = ['ID', 'Titre', 'Description', 'Statut', 'Date de début', 'Date de fin', 'Date d\'échéance', 'Manager', 'Créé le'];
                    break;

                case 'tasks':
                    data = tasks.map(t => ({
                        ID: t.id,
                        Titre: t.title,
                        Description: t.description || '',
                        Statut: t.status,
                        Priorité: t.priority,
                        Projet: t.project_title || '',
                        Étape: t.stage_name || '',
                        'Date d\'échéance': t.due_date || '',
                        'Assigné à': t.assignees?.map((a: any) => a.name).join(', ') || '',
                        'Créé le': new Date(t.created_at).toLocaleString()
                    }));
                    filename = `taches_${new Date().toISOString().split('T')[0]}.csv`;
                    headers = ['ID', 'Titre', 'Description', 'Statut', 'Priorité', 'Projet', 'Étape', 'Date d\'échéance', 'Assigné à', 'Créé le'];
                    break;

                case 'stages':
                    data = stages.map(s => ({
                        ID: s.id,
                        Titre: s.name,
                        Description: s.description || '',
                        Statut: s.status,
                        Projet: s.project_title || '',
                        'Créé le': new Date(s.created_at).toLocaleString()
                    }));
                    filename = `etapes_${new Date().toISOString().split('T')[0]}.csv`;
                    headers = ['ID', 'Titre', 'Description', 'Statut', 'Projet', 'Créé le'];
                    break;

                case 'all':
                    const allData = [
                        ...projects.map(p => ({
                            Type: 'Projet',
                            ID: p.id,
                            Titre: p.title,
                            Description: p.description || '',
                            Statut: p.status,
                            'Date de début': p.start_date || '',
                            'Date de fin': p.end_date || '',
                            'Date d\'échéance': p.due_date || '',
                            Manager: p.manager_name || '',
                            'Créé le': new Date(p.created_at).toLocaleString()
                        })),
                        ...tasks.map(t => ({
                            Type: 'Tâche',
                            ID: t.id,
                            Titre: t.title,
                            Description: t.description || '',
                            Statut: t.status,
                            Priorité: t.priority,
                            Projet: t.project_title || '',
                            Étape: t.stage_name || '',
                            'Date d\'échéance': t.due_date || '',
                            'Assigné à': t.assignees?.map((a: any) => a.name).join(', ') || '',
                            'Créé le': new Date(t.created_at).toLocaleString()
                        })),
                        ...stages.map(s => ({
                            Type: 'Étape',
                            ID: s.id,
                            Titre: s.name,
                            Description: s.description || '',
                            Statut: s.status,
                            Projet: s.project_title || '',
                            'Créé le': new Date(s.created_at).toLocaleString()
                        }))
                    ];
                    filename = `export_complet_${new Date().toISOString().split('T')[0]}.csv`;
                    headers = ['Type', 'ID', 'Titre', 'Description', 'Statut', 'Priorité', 'Projet', 'Étape', 'Date de début', 'Date de fin', 'Date d\'échéance', 'Manager', 'Assigné à', 'Créé le'];
                    break;

                default:
                    data = [];
                    filename = `export_${new Date().toISOString().split('T')[0]}.csv`;
                    headers = [];
                    break;
            }

            // Créer le contenu CSV
            const csvContent = [
                headers.join(','),
                ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
            ].join('\n');

            // Créer et télécharger le fichier
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

        } catch (error) {
            console.error('Error exporting data:', error);
            alert('Erreur lors de l\'exportation des données');
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
            {/* Header with back button */}
            <div className="mb-8">
                <BackButton className="mb-4" />
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Export des données</h1>
                        <p className="text-gray-600 mt-1">Exportez les données du système</p>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Type d'export
                            </label>
                            <select
                                value={exportType}
                                onChange={(e) => setExportType(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="projects">Projets</option>
                                <option value="tasks">Tâches</option>
                                <option value="stages">Étapes</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Date de début
                            </label>
                            <input
                                type="date"
                                value={dateRange.start}
                                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Date de fin
                            </label>
                            <input
                                type="date"
                                value={dateRange.end}
                                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <div className="flex justify-between items-center mb-6">
                        <div className="text-sm text-gray-600">
                            {exportType === 'projects' && `${projects.length} projet(s)`}
                            {exportType === 'tasks' && `${tasks.length} tâche(s)`}
                            {exportType === 'stages' && `${stages.length} étape(s)`}
                        </div>
                        <button
                            onClick={handleExport}
                            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                        >
                            📥 Exporter en CSV
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
