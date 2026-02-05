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
        } catch (error) {
            console.error('Error loading task:', error);
        } finally {
            setLoading(false);
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
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">{task.title}</h1>
                            <p className="text-gray-600">{task.description}</p>
                        </div>
                        <div className="flex gap-2">
                            <span className={`px-3 py-1 text-sm rounded-full ${task.priority === 'URGENT' ? 'bg-red-100 text-red-800' :
                                    task.priority === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                                        task.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-gray-100 text-gray-800'
                                }`}>
                                {task.priority}
                            </span>
                            <span className={`px-3 py-1 text-sm rounded-full ${task.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                                    task.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                                        'bg-gray-100 text-gray-800'
                                }`}>
                                {task.status}
                            </span>
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
