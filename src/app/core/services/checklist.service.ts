import { computed, Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'dish-archive-checklist';

@Injectable({ providedIn: 'root' })
export class ChecklistService {
    private readonly checkedItems = signal<Record<string, Set<string>>>(this.loadFromStorage());

    isChecked(dishId: string, ingredientName: string) {
        return computed(() => this.checkedItems()[dishId]?.has(ingredientName) ?? false);
    }

    checkedCount(dishId: string, total: number) {
        return computed(() => {
            const count = this.checkedItems()[dishId]?.size ?? 0;
            return { count, total, allDone: count === total && total > 0 };
        });
    }

    toggle(dishId: string, ingredientName: string): void {
        this.checkedItems.update(current => {
            const updated = { ...current };
            const dishSet = new Set(updated[dishId] ?? []);
            if (dishSet.has(ingredientName)) {
                dishSet.delete(ingredientName);
            } else {
                dishSet.add(ingredientName);
            }
            if (dishSet.size === 0) {
                delete updated[dishId];
            } else {
                updated[dishId] = dishSet;
            }
            this.saveToStorage(updated);
            return updated;
        });
    }

    clearDish(dishId: string): void {
        this.checkedItems.update(current => {
            const updated = { ...current };
            delete updated[dishId];
            this.saveToStorage(updated);
            return updated;
        });
    }

    private loadFromStorage(): Record<string, Set<string>> {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored) as Record<string, string[]>;
                const result: Record<string, Set<string>> = {};
                for (const [key, arr] of Object.entries(parsed)) {
                    result[key] = new Set(arr);
                }
                return result;
            }
        } catch {
            /* noop */
        }
        return {};
    }

    private saveToStorage(data: Record<string, Set<string>>): void {
        try {
            const serializable: Record<string, string[]> = {};
            for (const [key, set] of Object.entries(data)) {
                serializable[key] = [...set];
            }
            localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
        } catch {
            /* noop */
        }
    }
}
