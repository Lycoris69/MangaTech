import React from 'react';
import './SeriesCard.css';

export interface SeriesCardProps {
    id: string;
    title: string;
    coverImageUrl: string;
    totalChapters?: number;
    lastUpdated?: Date | string;
    status?: string;
    rating?: number;
    onClick: (e: React.MouseEvent) => void;
    actions?: React.ReactNode;
    subtitle?: string; // For extra info like "Author" or "Added on..."
    badges?: string[];
    latestChapter?: string;
    customStat?: React.ReactNode;
}

export const SeriesCard: React.FC<SeriesCardProps> = ({
    title,
    coverImageUrl,
    totalChapters,
    lastUpdated,
    status,
    rating,
    onClick,
    actions,
    subtitle,
    latestChapter,
    customStat
}) => {
    const formatDate = (date: Date | string | undefined) => {
        if (!date) return 'Unknown date';
        if (typeof date === 'string') return date;
        return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    };

    return (
        <div className="series-card-component" onClick={onClick}>
            <div className="card-cover-wrapper">
                <img
                    src={coverImageUrl || '/placeholder.png'}
                    alt={title}
                    className="card-cover"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder-cover.svg'; // Fallback
                    }}
                />
                <div className="card-overlay">
                    {rating && rating > 0 && (
                        <div className="card-rating">
                            <span className="star">★</span> {rating.toFixed(1)}
                        </div>
                    )}
                    {status && (
                        <div className={`card-status status-${status.toLowerCase()}`}>
                            {status}
                        </div>
                    )}
                </div>
            </div>

            <div className="card-content">
                <h3 className="card-title" title={title || 'Unknown Title'}>{title || 'Unknown Title'}</h3>

                {/* Always show subtitle space to keep alignment, or use a min-height */}
                <p className="card-subtitle" title={subtitle || ''}>{subtitle || '\u00A0'}</p>

                <div className="card-stats">
                    <div className="stat-item" title={customStat ? "Custom Stat" : "Latest Chapter"}>
                        <span className="icon">{customStat ? '📥' : '📄'}</span>
                        <span className="value">
                            {customStat ? customStat : (latestChapter ? `Ch. ${latestChapter}` : 'Ch. N/A')}
                        </span>
                    </div>

                    <div className="stat-item" title="Last Updated">
                        <span className="icon">📅</span>
                        <span className="value">
                            {lastUpdated ? formatDate(lastUpdated) : 'Unknown'}
                        </span>
                    </div>
                </div>

                {actions && (
                    <div className="card-actions" onClick={(e) => e.stopPropagation()}>
                        {actions}
                    </div>
                )}
            </div>
        </div>
    );
};
