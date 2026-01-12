import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface SwipeConfig {
    threshold?: number;
    maxVerticalOffset?: number;
    edgeOnly?: boolean;
    edgeThreshold?: number;
}

export const useSwipeNavigation = (config: SwipeConfig = {}) => {
    const navigate = useNavigate();
    const {
        threshold = 100, // Minimum distance to trigger swipe
        maxVerticalOffset = 50, // Maximum vertical deviation allowed
        edgeOnly = false, // If true, swipe must start from edge
        edgeThreshold = 50 // Distance from edge to be considered an "edge swipe"
    } = config;

    useEffect(() => {
        let touchStartX = 0;
        let touchStartY = 0;

        const handleTouchStart = (e: TouchEvent) => {
            touchStartX = e.changedTouches[0].screenX;
            touchStartY = e.changedTouches[0].screenY;
        };

        const handleTouchEnd = (e: TouchEvent) => {
            const touchEndX = e.changedTouches[0].screenX;
            const touchEndY = e.changedTouches[0].screenY;

            const deltaX = touchEndX - touchStartX;
            const deltaY = Math.abs(touchEndY - touchStartY);

            // Check if it's a valid right swipe (back navigation)
            if (deltaX > threshold && deltaY < maxVerticalOffset) {
                // If edgeOnly is enabled, check if swipe started near the left edge
                if (edgeOnly && touchStartX > edgeThreshold) {
                    return;
                }

                // Go back
                navigate(-1);
            }
        };

        window.addEventListener('touchstart', handleTouchStart);
        window.addEventListener('touchend', handleTouchEnd);

        return () => {
            window.removeEventListener('touchstart', handleTouchStart);
            window.removeEventListener('touchend', handleTouchEnd);
        };
    }, [navigate, threshold, maxVerticalOffset, edgeOnly, edgeThreshold]);
};
