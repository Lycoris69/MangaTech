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
    const [expandedSeries, setExpandedSeries] = useState<Set<string>>(new Set());

    useEffect(() => {
        const fetchTasks = async () => {
            try {
                const initialTasks = await window.electronAPI.scraper.getDownloadTasks();
                setTasks(initialTasks);
                // Default to collapsed (compact) view
                // setExpandedSeries(new Set(initialTasks.map(t => t.seriesId)));
            } catch (error) {
                console.error('Failed to fetch download tasks:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchTasks();

        const unsubscribe = window.electronAPI.on('download:tasks-updated', (updatedTasks: DownloadTask[]) => {
            setTasks(updatedTasks);
        });

        return () => {
            unsubscribe();
        };
    }, []);

    const toggleSeries = (seriesId: string) => {
        setExpandedSeries(prev => {
            const next = new Set(prev);
            if (next.has(seriesId)) {
                next.delete(seriesId);
            } else {
                next.add(seriesId);
            }
            return next;
        });
    };

    const beautifyId = (id: string) => {
        // Remove common scraper prefixes
        const cleanId = id.replace(/^(manhwaz-series-|series-|manhwaz-)/, '');
        return cleanId.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    // Helper to clean up titles that might have been saved with prefixes
    const cleanTitle = (title: string) => {
        if (!title) return '';
        // Remove "Manhwaz Series" prefix if present (case insensitive)
        return title.replace(/^Manhwaz Series\s+/i, '');
    };

    // Group tasks by seriesId
    const groups = tasks.reduce((acc, task) => {
        const seriesId = task.seriesId || 'unknown';
        if (!acc[seriesId]) {
            acc[seriesId] = {
                title: cleanTitle(task.seriesTitle || '') || beautifyId(seriesId),
                tasks: []
            };
        }
        acc[seriesId].tasks.push(task);
        return acc;
    }, {} as Record<string, { title: string, tasks: DownloadTask[] }>);

    const sortedGroups = Object.entries(groups).sort((a, b) => {
        // Sort by most recent task in group
        const aMax = Math.max(...a[1].tasks.map(t => new Date(t.createdAt).getTime()));
        const bMax = Math.max(...b[1].tasks.map(t => new Date(t.createdAt).getTime()));
        return bMax - aMax;
    });

    if (loading) {
        return <div className="downloads-page loading">Loading tasks...</div>;
    }

    return (
        <div className="downloads-page">
            <header className="downloads-header">
                <h1>Download Manager</h1>
            </header>

            <div className="series-groups">
                {sortedGroups.length === 0 ? (
                    <div className="empty-state">
                        <p>No downloads yet. Your library is waiting! 📦</p>
                    </div>
                ) : (
                    sortedGroups.map(([seriesId, group]) => {
                        const isExpanded = expandedSeries.has(seriesId);
                        const activeCount = group.tasks.filter(t => t.status === 'downloading' || t.status === 'pending').length;
                        const completeCount = group.tasks.filter(t => t.status === 'completed').length;

                        return (
                            <div key={seriesId} className={`series-block ${isExpanded ? 'expanded' : ''}`}>
                                <div className="series-header" onClick={() => toggleSeries(seriesId)}>
                                    <div className="series-meta">
                                        <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
                                        <h2 className="series-title">{group.title}</h2>
                                    </div>
                                    <div className="series-stats">
                                        {activeCount > 0 && <span className="stat-badge active">{activeCount} active</span>}
                                        <span className="stat-badge">{group.tasks.length} total</span>
                                    </div>
                                </div>
                                <div className="series-content">
                                    <div className="tasks-list">
                                        {group.tasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(task => (
                                            <div key={task.id} className={`task-card ${task.status}`}>
                                                <div className="task-header">
                                                    <span className="task-name">{task.id.split('-').pop() || 'Chapter'}</span>
                                                    <span className={`task-status ${task.status}`}>{task.status.toUpperCase()}</span>
                                                </div>
                                                {(task.status === 'downloading' || task.status === 'pending') && (
                                                    <div className="progress-container">
                                                        <div className="progress-bar" style={{ width: `${task.progress}%` }}></div>
                                                    </div>
                                                )}
                                                <div className="task-footer">
                                                    {task.status === 'downloading' ? (
                                                        <span>{task.progress}% completed</span>
                                                    ) : (
                                                        <span>{new Date(task.createdAt).toLocaleDateString()}</span>
                                                    )}
                                                    <span className="task-path" title={task.downloadPath}>{task.downloadPath}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default DownloadsPage;
