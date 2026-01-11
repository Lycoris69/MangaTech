import React, { useState, useEffect } from 'react';
import './DownloadsPage.css';

interface DownloadTask {
    id: string;
    seriesId: string;
    seriesTitle?: string;
    chapterIds: string[];
    status: 'pending' | 'downloading' | 'completed' | 'failed';
    progress: number;
    downloadPath: string;
    createdAt: Date;
    completedAt?: Date;
}

const DownloadsPage: React.FC = () => {
    const [tasks, setTasks] = useState<DownloadTask[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTasks = async () => {
            try {
                const initialTasks = await window.electronAPI.scraper.getDownloadTasks();
                setTasks(initialTasks);
            } catch (error) {
                console.error('Failed to fetch download tasks:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchTasks();

        // Subscribe to real-time updates
        const unsubscribe = window.electronAPI.on('download:tasks-updated', (updatedTasks: DownloadTask[]) => {
            setTasks(updatedTasks);
        });

        return () => {
            unsubscribe();
        };
    }, []);

    const activeTasks = tasks.filter(t => t.status === 'downloading' || t.status === 'pending');
    const finishedTasks = tasks.filter(t => t.status === 'completed' || t.status === 'failed')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (loading) {
        return <div className="downloads-page loading">Loading tasks...</div>;
    }

    return (
        <div className="downloads-page">
            <header className="downloads-header">
                <h1>Download Manager</h1>
            </header>

            <section className="tasks-section">
                <h2>Active Downloads</h2>
                <div className="tasks-list">
                    {activeTasks.length === 0 ? (
                        <p className="empty-message">No active downloads</p>
                    ) : (
                        activeTasks.map(task => (
                            <div key={task.id} className="task-card active">
                                <div className="task-header">
                                    <span className="task-title">{task.seriesTitle || 'Unknown Series'} - {task.id.split('-').pop()}</span>
                                    <span className={`task-status ${task.status}`}>{task.status.toUpperCase()}</span>
                                </div>
                                <div className="progress-container">
                                    <div className="progress-bar" style={{ width: `${task.progress}%` }}></div>
                                </div>
                                <div className="task-footer">
                                    <span>{task.progress}% completed</span>
                                    <span className="task-path">{task.downloadPath}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </section>

            <section className="tasks-section">
                <h2>History</h2>
                <div className="tasks-list history">
                    {finishedTasks.length === 0 ? (
                        <p className="empty-message">No history found</p>
                    ) : (
                        finishedTasks.map(task => (
                            <div key={task.id} className={`task-card ${task.status}`}>
                                <div className="task-header">
                                    <span className="task-title">{task.seriesTitle || task.id}</span>
                                    <span className={`task-status ${task.status}`}>{task.status.toUpperCase()}</span>
                                </div>
                                <div className="task-footer">
                                    <span>{new Date(task.createdAt).toLocaleDateString()}</span>
                                    <span className="task-path">{task.downloadPath}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </section> section
        </div>
    );
};

export default DownloadsPage;
