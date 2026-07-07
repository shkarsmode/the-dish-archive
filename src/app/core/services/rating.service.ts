import { Injectable, computed, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { RecipeRatingWithProfile } from '../models/recipe-rating.model';
import { mapRecipeRating } from './supabase-mappers';

/** Loads and submits dish ratings + comments (the per-dish social feed). */
@Injectable({ providedIn: 'root' })
export class RatingService {
    private readonly supabase = inject(SupabaseService);
    private readonly auth = inject(AuthService);

    readonly ratings = signal<RecipeRatingWithProfile[]>([]);
    private readonly loadedDishId = signal<string | null>(null);

    readonly myRating = computed(() => {
        const userId = this.auth.user()?.id;
        return this.ratings().find(rating => rating.userId === userId) ?? null;
    });

    readonly comments = computed(() =>
        this.ratings().filter(rating => (rating.comment ?? '').trim().length > 0),
    );

    async load(dishId: string): Promise<void> {
        this.loadedDishId.set(dishId);
        const { data } = await this.supabase.client
            .from('recipe_ratings')
            .select('*, profiles:user_id(display_name,avatar_url)')
            .eq('dish_id', dishId)
            .order('created_at', { ascending: false });
        this.ratings.set((data ?? []).map((row: Record<string, any>) => ({
            ...mapRecipeRating(row),
            displayName: row['profiles']?.display_name ?? null,
            avatarUrl: row['profiles']?.avatar_url ?? null,
        })));
    }

    async rate(dishId: string, rating: number, comment: string | null) {
        const result = await this.supabase.client.rpc('rate_dish', {
            p_dish_id: dishId,
            p_rating: rating,
            p_comment: comment && comment.trim() ? comment.trim() : null,
        });
        await this.load(dishId);
        return result;
    }
}
