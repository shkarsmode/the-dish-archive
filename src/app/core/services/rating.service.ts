import { Injectable, computed, inject, signal } from '@angular/core';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { DishService } from './dish.service';
import { RecipeRatingWithProfile } from '../models/recipe-rating.model';

/** Loads and submits dish ratings + comments (the per-dish social feed). */
@Injectable({ providedIn: 'root' })
export class RatingService {
    private readonly api = inject(ApiService);
    private readonly auth = inject(AuthService);
    private readonly dishService = inject(DishService);

    readonly ratings = signal<RecipeRatingWithProfile[]>([]);
    private readonly loadedDishId = signal<string | null>(null);

    readonly myRating = computed(() => {
        const userId = this.auth.user()?.id;
        return this.ratings().find(rating => rating.userId === userId) ?? null;
    });

    readonly comments = computed(() =>
        this.ratings().filter(rating => (rating.comment ?? '').trim().length > 0),
    );

    /** Aggregate (average + count) of the currently-loaded dish's ratings. */
    readonly average = computed(() => {
        const list = this.ratings();
        return list.length ? list.reduce((sum, r) => sum + r.rating, 0) / list.length : 0;
    });
    readonly count = computed(() => this.ratings().length);

    /** Rating distribution 5★→1★ (index 0 = 5 stars) for the loaded dish. */
    readonly distribution = computed(() => {
        const buckets = [0, 0, 0, 0, 0];
        for (const r of this.ratings()) {
            const star = Math.min(5, Math.max(1, Math.round(r.rating)));
            buckets[5 - star]++;
        }
        return buckets;
    });

    async load(dishId: string): Promise<void> {
        // Clear stale ratings immediately so myRating()/comments() don't briefly
        // reflect the previously-loaded dish (which leaked into the composer input).
        if (this.loadedDishId() !== dishId) {
            this.ratings.set([]);
        }
        this.loadedDishId.set(dishId);
        const data = await this.api.get<RecipeRatingWithProfile[]>('/dishes/' + dishId + '/ratings');
        // Drop out-of-order responses if a newer dish load has since started.
        if (this.loadedDishId() !== dishId) return;
        this.ratings.set(data ?? []);
    }

    async rate(dishId: string, rating: number, comment: string | null) {
        const result = await this.api.call(() =>
            this.api.put<RecipeRatingWithProfile>('/dishes/' + dishId + '/ratings/me', {
                rating,
                comment: comment && comment.trim() ? comment.trim() : null,
            }),
        );
        // If the user has since navigated to another dish, don't reload/apply for
        // this one — that would move the shared state back to the old dish.
        if (!result.error && this.loadedDishId() === dishId) {
            await this.load(dishId);
            // Keep the denormalized aggregate on the dish cache fresh so cards/hero
            // update immediately (the backend updates it too, but we don't refetch).
            this.dishService.applyRatingAggregate(dishId, this.average(), this.count());
        }
        return result;
    }
}
