import { Injectable, inject } from '@angular/core';
import { DishCategory, DishDifficulty } from '../models/dish.model';
import { ApiService } from './api.service';

export interface AiRecipeDraft {
    title: string;
    description: string;
    servings: number;
    cookingTime: { preparation: number; cooking: number; total: number };
    calories: number;
    difficulty: DishDifficulty;
    categories: DishCategory[];
    tags: string[];
    ingredients: { name: string; amount: string; unit: string; optional: boolean }[];
    steps: { order: number; description: string; duration?: number }[];
    notes: string;
    warnings: string[];
    meta: { model: string; dailyLimit: number | null; dailyUsed: number | null; dailyRemaining: number | null };
}

/** Client for the backend's AI recipe generation + admin usage statistics. */
@Injectable({ providedIn: 'root' })
export class AiService {
    private readonly api = inject(ApiService);

    /** Turn a free-form description into an editable recipe draft. Throws on error
     *  (the caller reads err.error.{code,message,retryAfterMs}). */
    parseRecipe(text: string): Promise<AiRecipeDraft> {
        return this.api.post<AiRecipeDraft>('/ai/recipes/parse', { text });
    }

    /** Super-admin usage statistics (summary | usage | requests | limits). */
    statistics<T = any>(kind: 'summary' | 'usage' | 'requests' | 'limits', query: Record<string, unknown> = {}): Promise<T> {
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(query)) {
            if (value != null && value !== '') params.set(key, String(value));
        }
        const qs = params.toString();
        return this.api.get<T>(`/ai/statistics/${kind}${qs ? `?${qs}` : ''}`);
    }
}
