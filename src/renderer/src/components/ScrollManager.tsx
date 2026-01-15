import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/**
 * ScrollManager handles scroll position behavior during navigation.
 * - On 'PUSH' or 'REPLACE' (forward navigation), it resets scroll to the top.
 * - On 'POP' (backward/forward browser navigation), it allows for browser scroll restoration.
 */
const ScrollManager: React.FC = () => {
    const { pathname } = useLocation();
    const navType = useNavigationType();

    useEffect(() => {
        // If not navigating back (e.g., clicking a link), scroll to top
        if (navType !== 'POP') {
            window.scrollTo(0, 0);
        }
    }, [pathname, navType]);

    return null;
};

export default ScrollManager;
