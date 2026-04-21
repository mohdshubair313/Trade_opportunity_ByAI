"use client";

import { useState, useCallback, useEffect } from "react";
import {
    getFavorites,
    addFavorite as apiAddFavorite,
    removeFavorite as apiRemoveFavorite,
    isAuthenticated,
} from "@/lib/api";
import { useStore } from "@/store/useStore";
import toast from "react-hot-toast";

export function useFavorites() {
    const [isLoading, setIsLoading] = useState(false);
    const [isSynced, setIsSynced] = useState(false);
    const {
        favoriteSectors,
        addFavorite: addLocalFavorite,
        removeFavorite: removeLocalFavorite,
        setFavorites: setLocalFavorites,
    } = useStore();

    // Sync favorites from API when authenticated. REPLACES local state — do
    // NOT merge, otherwise stale favourites left over from a previous user on
    // this browser would persist into the new user's session.
    const syncFavorites = useCallback(async () => {
        if (!isAuthenticated()) {
            setLocalFavorites([]);
            return;
        }

        setIsLoading(true);
        try {
            const response = await getFavorites();
            setLocalFavorites(response.favorites);
            setIsSynced(true);
        } catch {
            // API down → don't touch local state here; user will see whatever
            // they optimistically added this session. This is a non-leaking
            // choice because the local state starts empty (not persisted).
        } finally {
            setIsLoading(false);
        }
    }, [setLocalFavorites]);

    // Sync on mount if authenticated
    useEffect(() => {
        if (!isSynced && isAuthenticated()) {
            syncFavorites();
        }
    }, [isSynced, syncFavorites]);

    const addFavorite = useCallback(
        async (sector: string) => {
            // Add locally first for instant feedback
            addLocalFavorite(sector);

            // Sync to API if authenticated
            if (isAuthenticated()) {
                try {
                    await apiAddFavorite(sector);
                } catch {
                    // Keep local addition even if API fails
                }
            }

            toast.success(`Added ${sector} to favorites`);
        },
        [addLocalFavorite]
    );

    const removeFavorite = useCallback(
        async (sector: string) => {
            // Remove locally first
            removeLocalFavorite(sector);

            // Sync to API if authenticated
            if (isAuthenticated()) {
                try {
                    await apiRemoveFavorite(sector);
                } catch {
                    // Keep local removal even if API fails
                }
            }

            toast.success(`Removed ${sector} from favorites`);
        },
        [removeLocalFavorite]
    );

    const toggleFavorite = useCallback(
        async (sector: string) => {
            if (favoriteSectors.includes(sector)) {
                await removeFavorite(sector);
            } else {
                await addFavorite(sector);
            }
        },
        [favoriteSectors, addFavorite, removeFavorite]
    );

    const isFavorite = useCallback(
        (sector: string): boolean => {
            return favoriteSectors.includes(sector);
        },
        [favoriteSectors]
    );

    return {
        favorites: favoriteSectors,
        isLoading,
        addFavorite,
        removeFavorite,
        toggleFavorite,
        isFavorite,
        syncFavorites,
    };
}
