import React, { useState, useEffect } from 'react';
import './DownloadsPage.css';

interface DownloadTask {
    id: string;
    seriesId: string;
    seriesTitle?: string;
    chapterIds: string[];
    status: 'pending' | 'downloading' | 'completed' | 'failed' | 'paused';
    progress: number;
    downloadPath: string;
    createdAt: Date;
    completedAt?: Date;
}

const DownloadsPage: React.FC = () => {
    const [tasks, setTasks] = useState<DownloadTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedSeries, setExpandedSeries] = useState<Set<string>>(new Set());
    const [expandedFailedGroups, setExpandedFailedGroups] = useState<Set<string>>(new Set());

    useEffect(() => {
        const fetchTasks = async () => {
            try {
                // @ts-ignore - electronAPI might not be recognized by TS in renderer but it exists via preload
                const initialTasks = await window.electronAPI.scraper.getDownloadTasks();
                setTasks(initialTasks);
            } catch (error) {
                console.error('Failed to fetch download tasks:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchTasks();

        // @ts-ignore
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

    const toggleFailedGroup = (seriesId: string) => {
        setExpandedFailedGroups(prev => {
            const next = new Set(prev);
            if (next.has(seriesId)) {
                next.delete(seriesId);
            } else {
                next.add(seriesId);
            }
            return next;
        });
    };

    const pauseTask = async (taskId: string) => {
        try {
            // @ts-ignore
            await window.electronAPI.scraper.pauseDownload(taskId);
        } catch (error) {
            console.error('Failed to pause download:', error);
        }
    };

    const resumeTask = async (taskId: string) => {
        try {
            // @ts-ignore
            await window.electronAPI.scraper.resumeDownload(taskId);
        } catch (error) {
            console.error('Failed to resume download:', error);
        }
    };

    const cancelTask = async (taskId: string) => {
        try {
            if (confirm('Are you sure you want to cancel and remove this download task?')) {
                // @ts-ignore
                await window.electronAPI.scraper.cancelDownload(taskId);
            }
        } catch (error) {
            console.error('Failed to cancel download:', error);
        }
    };

    const retryTask = async (taskId: string) => {
        try {
            // @ts-ignore
            await window.electronAPI.scraper.retryDownload(taskId);
        } catch (error) {
            console.error('Failed to retry download:', error);
        }
    };

    const retryAllFailed = async (seriesId: string, groupTasks: DownloadTask[]) => {
        const failedTasks = groupTasks.filter(t => t.status === 'failed');
        for (const task of failedTasks) {
            await retryTask(task.id);
        }
    };

    const beautifyId = (id: string) => {
        const cleanId = id.replace(/^(manhwaz-series-|series-|manhwaz-)/, '');
        return cleanId.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    const cleanTitle = (title: string) => {
        if (!title) return '';
        return title.replace(/^Manhwaz Series\s+/i, '');
    };

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
                                <div className="series-total-progress">
                                    <div className="total-progress-bar">
                                        <div
                                            className="total-progress-fill"
                                            style={{
                                                width: `${(group.tasks.reduce((acc, t) => {
                                                    // Count 'completed' as 100, 'pending' as 0
                                                    // For 'downloading' or 'paused', use the actual progress
                                                    const p = t.status === 'completed' ? 100 :
                                                        (t.status === 'pending' || t.status === 'failed') ? 0 :
                                                            t.progress;
                                                    return acc + p;
                                                }, 0) / (group.tasks.length * 100 || 1)) * 100}%`
                                            }}
                                        ></div>
                                    </div>
                                </div>
                                <div className="series-content">
                                    {group.tasks.some(t => t.status === 'failed') && (
                                        <div className={`failed-subgroup ${expandedFailedGroups.has(seriesId) ? 'expanded' : ''}`}>
                                            <div className="subgroup-header">
                                                <div className="subgroup-info" onClick={(e) => { e.stopPropagation(); toggleFailedGroup(seriesId); }}>
                                                    <span>⚠️ Failed Downloads ({group.tasks.filter(t => t.status === 'failed').length})</span>
                                                    <span className="expand-icon">{expandedFailedGroups.has(seriesId) ? '▼' : '▶'}</span>
                                                </div>
                                                <button
                                                    className="retry-all-btn"
                                                    onClick={(e) => { e.stopPropagation(); retryAllFailed(seriesId, group.tasks); }}
                                                    title="Retry All Failed"
                                                >
                                                    Retry All Failed 🔄
                                                </button>
                                            </div>
                                            {expandedFailedGroups.has(seriesId) && (
                                                <div className="tasks-list">
                                                    {group.tasks
                                                        .filter(t => t.status === 'failed')
                                                        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                                                        .map(task => (
                                                            <div key={task.id} className={`task-card ${task.status}`}>
                                                                <div className="task-header">
                                                                    <span className="task-name">{task.id.split('-').pop() || 'Chapter'}</span>
                                                                    <div className="task-actions">
                                                                        <button
                                                                            className="action-btn retry"
                                                                            onClick={(e) => { e.stopPropagation(); retryTask(task.id); }}
                                                                            title="Retry"
                                                                        >
                                                                            🔄
                                                                        </button>
                                                                        <button
                                                                            className="action-btn cancel"
                                                                            onClick={(e) => { e.stopPropagation(); cancelTask(task.id); }}
                                                                            title="Cancel/Remove"
                                                                        >
                                                                            ❌
                                                                        </button>
                                                                        <span className={`task-status ${task.status}`}>{task.status.toUpperCase()}</span>
                                                                    </div>
                                                                </div>
                                                                <div className="task-footer">
                                                                    <span>{new Date(task.createdAt).toLocaleDateString()}</span>
                                                                    <span className="task-path" title={task.downloadPath}>{task.downloadPath}</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    <div className="tasks-list">
                                        {group.tasks
                                            .filter(t => t.status !== 'failed')
                                            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                                            .map(task => (
                                                <div key={task.id} className={`task-card ${task.status}`}>
                                                    <div className="task-header">
                                                        <span className="task-name">{task.id.split('-').pop() || 'Chapter'}</span>
                                                        <div className="task-actions">
                                                            {task.status === 'downloading' || task.status === 'pending' ? (
                                                                <button
                                                                    className="action-btn pause"
                                                                    onClick={(e) => { e.stopPropagation(); pauseTask(task.id); }}
                                                                    title="Pause"
                                                                >
                                                                    ⏸️
                                                                </button>
                                                            ) : task.status === 'paused' ? (
                                                                <button
                                                                    className="action-btn resume"
                                                                    onClick={(e) => { e.stopPropagation(); resumeTask(task.id); }}
                                                                    title="Resume"
                                                                >
                                                                    ▶️
                                                                </button>
                                                            ) : null}
                                                            {(task.status === 'downloading' || task.status === 'pending' || task.status === 'paused') && (
                                                                <button
                                                                    className="action-btn cancel"
                                                                    onClick={(e) => { e.stopPropagation(); cancelTask(task.id); }}
                                                                    title="Cancel/Remove"
                                                                >
                                                                    ❌
                                                                </button>
                                                            )}
                                                            <span className={`task-status ${task.status}`}>{task.status.toUpperCase()}</span>
                                                        </div>
                                                    </div>
                                                    {(task.status === 'downloading' || task.status === 'pending' || task.status === 'paused') && (
                                                        <div className="progress-container">
                                                            <div className={`progress-bar ${task.status}`} style={{ width: `${task.progress}%` }}></div>
                                                        </div>
                                                    )}
                                                    <div className="task-footer">
                                                        {task.status === 'downloading' || task.status === 'paused' ? (
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
