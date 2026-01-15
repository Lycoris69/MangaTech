import { SeriesSearchResult } from '../types';

/**
 * HomeState persists the state of the HomePage to ensure 
 * scroll restoration works correctly when navigating back.
 */
class HomeState {
    private static instance: HomeState;

    public releases: SeriesSearchResult[] = [];
    public page: number = 1;
    public hasMore: boolean = true;
    public scrollPosition: number = 0;

    private constructor() { }

    public static getInstance(): HomeState {
        if (!HomeState.instance) {
            HomeState.instance = new HomeState();
        }
        return HomeState.instance;
    }

    public clear(): void {
        this.releases = [];
        this.page = 1;
        this.hasMore = true;
        this.scrollPosition = 0;
    }
}

export const homeState = HomeState.getInstance();
