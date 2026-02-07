import { computed, Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'dish-archive-favorites';

@Injectable({ providedIn: 'root' })
export class FavoritesService {
    private readonly favoriteIds = signal<Set<string>>(this.loadFromStorage());

    readonly count = computed(() => this.favoriteIds().size);

    toggle(dishId: string): void {
        this.favoriteIds.update(currentSet => {
            const updatedSet = new Set(currentSet);
            if (updatedSet.has(dishId)) {
                updatedSet.delete(dishId);
            } else {
                updatedSet.add(dishId);
            }
            this.saveToStorage(updatedSet);
            return updatedSet;
        });
    }

    isFavorite(dishId: string) {
        return computed(() => this.favoriteIds().has(dishId));
    }

    getAllFavoriteIds(): string[] {
        return [...this.favoriteIds()];
    }

    private loadFromStorage(): Set<string> {
        try {
            const storedValue = localStorage.getItem(STORAGE_KEY);
            if (storedValue) {
                return new Set(JSON.parse(storedValue));
            }
        } catch (error) {
            console.error('Failed to load favorites:', error);
        }
        return new Set();
    }

    private saveToStorage(favoriteSet: Set<string>): void {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify([...favoriteSet]));
        } catch (error) {
            console.error('Failed to save favorites:', error);
        }
    }
}
