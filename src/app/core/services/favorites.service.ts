import { computed, effect, inject, Injectable, Injector, signal } from '@angular/core';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { DishService } from './dish.service';

/**
 * Real, DB-backed likes (❤). `favoriteIds` is the set of dishes the current
 * user has liked; `count` is their like count. Toggling is optimistic and
 * also bumps the dish's total like_count for instant feedback.
 */
@Injectable({ providedIn: 'root' })
export class FavoritesService {
    private readonly api = inject(ApiService);
    private readonly auth = inject(AuthService);
    private readonly injector = inject(Injector);

    public readonly favoriteIds = signal<Set<string>>(new Set());
    readonly count = computed(() => this.favoriteIds().size);

    constructor() {
        effect(() => {
            if (this.auth.isReady()) {
                void this.load(this.auth.user()?.id ?? null);
            }
        });
    }

    private async load(userId: string | null): Promise<void> {
        if (!userId) {
            this.favoriteIds.set(new Set());
            return;
        }
        const data = await this.api.get<string[]>('/me/likes');
        this.favoriteIds.set(new Set(data ?? []));
    }

    isFavorite(dishId: string): boolean {
        return this.favoriteIds().has(dishId);
    }

    async toggle(dishId: string): Promise<void> {
        const userId = this.auth.user()?.id;
        if (!userId) {
            return;
        }
        const wasLiked = this.favoriteIds().has(dishId);
        this.setLiked(dishId, !wasLiked);
        // Lazy lookup avoids the FavoritesService <-> DishService construction cycle.
        this.injector.get(DishService).applyLikeDelta(dishId, wasLiked ? -1 : 1);

        try {
            if (wasLiked) {
                await this.api.delete('/dishes/' + dishId + '/like');
            } else {
                await this.api.put('/dishes/' + dishId + '/like');
            }
        } catch {
            this.setLiked(dishId, wasLiked);
            this.injector.get(DishService).applyLikeDelta(dishId, wasLiked ? 1 : -1);
        }
    }

    private setLiked(dishId: string, liked: boolean): void {
        this.favoriteIds.update(current => {
            const next = new Set(current);
            if (liked) {
                next.add(dishId);
            } else {
                next.delete(dishId);
            }
            return next;
        });
    }

    getAllFavoriteIds(): string[] {
        return [...this.favoriteIds()];
    }
}
