import { createContext, useContext, useState, useCallback } from 'react';
import { searchRelevantSchemesForConditions } from '../Pages/Articles/articleSearch.ts';
import type { SchemeResult } from '../Pages/Articles/articleSearch.ts';

type ArticlesCacheEntry = {
    articles: SchemeResult[];
    error: string;
};

type ArticlesContextValue = {
    // Keyed by the joined conditions string (same idea as ArticleList's old
    // conditionsKey) so different patients/condition-sets don't collide.
    getCached: (key: string) => ArticlesCacheEntry | undefined;
    isLoading: (key: string) => boolean;
    // Triggers a search only if this key isn't already cached or in flight —
    // safe to call on every render/navigation without re-fetching.
    ensureSearched: (key: string, conditions: string[]) => void;
};

const ArticlesContext = createContext<ArticlesContextValue | null>(null);

export function ArticlesProvider({ children }: { children: React.ReactNode }) {
    const [cache, setCache] = useState<Record<string, ArticlesCacheEntry>>({});
    const [loadingKeys, setLoadingKeys] = useState<Set<string>>(new Set());

    const getCached = useCallback((key: string) => cache[key], [cache]);
    const isLoading = useCallback((key: string) => loadingKeys.has(key), [loadingKeys]);

    const ensureSearched = useCallback((key: string, conditions: string[]) => {
        if (!key) return;

        setLoadingKeys((prevLoading) => {
            if (prevLoading.has(key)) return prevLoading; // already in flight
            if (cache[key]) return prevLoading; // already cached, don't refetch

            const next = new Set(prevLoading);
            next.add(key);

            searchRelevantSchemesForConditions(conditions)
                .then((results) => {
                    setCache((prev) => ({ ...prev, [key]: { articles: results, error: '' } }));
                })
                .catch((searchError) => {
                    setCache((prev) => ({
                        ...prev,
                        [key]: {
                            articles: [],
                            error: searchError instanceof Error ? searchError.message : 'Unable to load articles right now.',
                        },
                    }));
                })
                .finally(() => {
                    setLoadingKeys((prev) => {
                        const updated = new Set(prev);
                        updated.delete(key);
                        return updated;
                    });
                });

            return next;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cache]);

    const value: ArticlesContextValue = {
        getCached,
        isLoading,
        ensureSearched,
    };

    return (
        <ArticlesContext.Provider value={value}>
            {children}
        </ArticlesContext.Provider>
    );
}

export function useArticlesInfo() {
    const context = useContext(ArticlesContext);
    if (!context) {
        throw new Error('useArticlesInfo must be used within an ArticlesProvider');
    }
    return context;
}