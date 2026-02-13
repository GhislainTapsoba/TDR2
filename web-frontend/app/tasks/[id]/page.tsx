'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { tasksAPI, commentsAPI } from '@/lib/api';

export default function TaskDetailPage() {
    const router = useRouter();
    const params = useParams();
    const { user, isLoading } = useAuth();
    const [task, setTask] = useState<any>(null);
    const [comments, setComments] = useState<any[]>([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        status: '',
        priority: '',
        due_date: '',
    });

    useEffect(() => {
        if (!isLoading && !user) {
            router.push('/login');
        }
    }, [user, isLoading, router]);

    useEffect(() => {
        if (user && params.id) {
            loadTaskData();
        }
    }, [user, params.id]);

    const loadTaskData = async () => {
        try {
            const [taskRes, commentsRes] = await Promise.all([
                tasksAPI.getById(params.id as string),
                commentsAPI.getAll({ task_id: params.id }),
            ]);
            setTask(taskRes.data);
            setComments(commentsRes.data);
            setFormData({
                title: taskRes.data.title || '',
                description: taskRes.data.description || '',
                status: taskRes.data.status || '',
                priority: taskRes.data.priority || '',
                due_date: taskRes.data.due_date || '',
            });
        } catch (error) {
            console.error('Error loading task:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await tasksAPI.update(params.id as string, formData);
            setEditing(false);
            loadTaskData();
        } catch (error) {
            console.error('Error updating task:', error);
        }
    };

    const handleStatusChange = async (newStatus: string) => {
        try {
            await tasksAPI.update(params.id as string, { status: newStatus });
            loadTaskData();
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    const handleAddComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        try {
            await commentsAPI.create({
                content: newComment,
                task_id: params.id,
            });
            setNewComment('');
            loadTaskData();
        } catch (error) {
            console.error('Error adding comment:', error);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'TODO': return 'bg-gray-100 text-gray-800';
            case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800';
            case 'IN_REVIEW': return 'bg-purple-100 text-purple-800';
            case 'COMPLETED': return 'bg-green-100 text-green-800';
            case 'BLOCKED': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'TODO': return 'À faire';
            case 'IN_PROGRESS': return 'En cours';
            case 'IN_REVIEW': return 'En révision';
            case 'COMPLETED': return 'Terminé';
            case 'BLOCKED': return 'Bloqué';
            default: return status;
        }
    };

    if (isLoading || loading || !task) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-6">
                    <Link href="/tasks" className="text-primary hover:underline">
                        ← Retour aux tâches
                    </Link>
                </div>

                {/* Task Header */}
                <div className="mb-8">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">{task.title}</h1>
                            <p className="text-gray-600">{task.description}</p>
                        </div>
                        <div className="flex gap-2">
                            <span className={`px-3 py-1 text-sm rounded-full ${getStatusColor(task.status)}`}>
                                {getStatusLabel(task.status)}
                            </span>
                            <button
                                onClick={() => setEditing(!editing)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                {editing ? 'Annuler' : 'Modifier'}
                            </button>
                            <button
                                onClick={() => handleStatusChange('IN_PROGRESS')}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                En cours
                            </button>
                            <button
                                onClick={() => handleStatusChange('COMPLETED')}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                            >
                                Complété
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="text-gray-500">Projet:</span>
                            <Link href={`/projects/${task.project_id}`} className="ml-2 font-medium text-primary hover:underline">
                                {task.project_title}
                            </Link>
                        </div>
                        <div>
                            <span className="text-gray-500">Étape:</span>
                            <span className="ml-2 font-medium">{task.stage_name || 'Aucune'}</span>
                        </div>
                        <div>
                            <span className="text-gray-500">Échéance:</span>
                            <span className="ml-2 font-medium">{task.due_date ? new Date(task.due_date).toLocaleDateString() : 'N/A'}</span>
                        </div>
                        <div>
                            <span className="text-gray-500">Assignés:</span>
                            <span className="ml-2 font-medium">
                                {task.assignees && task.assignees.length > 0
                                    ? task.assignees.map((a: any) => a.name).join(', ')
                                    : 'Non assigné'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Edit Form */}
                {editing && (
                    <div className="bg-white rounded-lg shadow p-6 mb-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Modifier la tâche</h2>
                        <form onSubmit={handleUpdateTask}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Titre *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Description
                                    </label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        rows={3}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Priorité
                                    </label>
                                    <select
                                        value={formData.priority}
                                        onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="LOW">Basse</option>
                                        <option value="MEDIUM">Moyenne</option>
                                        <option value="HIGH">Haute</option>
                                        <option value="URGENT">Urgente</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Date d'échéance
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.due_date}
                                        onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end space-x-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setEditing(false)}
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
                    </div>
                )}

                {/* Quick Status Change */}
                {!editing && (
                    <div className="bg-white rounded-lg shadow p-6 mb-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Changer le statut</h2>
                        <div className="flex space-x-3">
                            <button
                                onClick={() => handleStatusChange('TODO')}
                                className={`px-4 py-2 rounded-lg ${task.status === 'TODO' ? 'bg-gray-600 text-white' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}
                                disabled={task.status === 'TODO'}
                            >
                                À faire
                            </button>
                            <button
                                onClick={() => handleStatusChange('IN_PROGRESS')}
                                className={`px-4 py-2 rounded-lg ${task.status === 'IN_PROGRESS' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-800 hover:bg-blue-200'}`}
                                disabled={task.status === 'IN_PROGRESS'}
                            >
                                En cours
                            </button>
                            <button
                                onClick={() => handleStatusChange('IN_REVIEW')}
                                className={`px-4 py-2 rounded-lg ${task.status === 'IN_REVIEW' ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-800 hover:bg-purple-200'}`}
                                disabled={task.status === 'IN_REVIEW'}
                            >
                                En révision
                            </button>
                            <button
                                onClick={() => handleStatusChange('COMPLETED')}
                                className={`px-4 py-2 rounded-lg ${task.status === 'COMPLETED' ? 'bg-green-600 text-white' : 'bg-green-100 text-green-800 hover:bg-green-200'}`}
                                disabled={task.status === 'COMPLETED'}
                            >
                                Terminé
                            </button>
                        </div>
                    </div>
                )}

                {/* Comments */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Commentaires ({comments.length})</h2>

                    {/* Add Comment Form */}
                    <form onSubmit={handleAddComment} className="mb-6">
                        <textarea
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Ajouter un commentaire..."
                            className="w-full border border-gray-300 rounded-md px-3 py-2 mb-2"
                            rows={3}
                        />
                        <button
                            type="submit"
                            className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90"
                        >
                            Ajouter
                        </button>
                    </form>

                    {/* Comments List */}
                    {comments.length === 0 ? (
                        <p className="text-gray-500">Aucun commentaire</p>
                    ) : (
                        <div className="space-y-4">
                            {comments.map((comment) => (
                                <div key={comment.id} className="border-l-4 border-primary pl-4 py-2">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="font-semibold text-sm">{comment.author_name}</span>
                                        <span className="text-xs text-gray-500">
                                            {new Date(comment.created_at).toLocaleString()}
                                        </span>
                                    </div>
                                    <p className="text-gray-700">{comment.content}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
