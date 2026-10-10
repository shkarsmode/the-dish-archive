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
    taste: { sweet: number; salty: number; sour: number; bitter: number; spicy: number; umami: number };
    notes: string;
    warnings: string[];
    meta: { model: string; dailyLimit: number | null; dailyUsed: number | null; dailyRemaining: number | null };
}

export type ImportPlatform =
    | 'instagram' | 'tiktok' | 'youtube' | 'facebook' | 'telegram'
    | 'pinterest' | 'threads' | 'x' | 'website' | 'photo' | 'text';

export type ImportIssueField = 'title' | 'ingredients' | 'steps' | 'time' | 'servings' | 'temperature' | 'equipment' | 'other';

export interface ImportIssue {
    field: ImportIssueField;
    severity: 'missing' | 'unclear' | 'assumed' | 'conflict';
    message: string;
    itemIndex?: number;
}

export interface ImportPreview {
    platform: ImportPlatform;
    url: string;
    title: string;
    author: string;
    snippet: string;
    /** data: URL of the cover (may be empty). */
    image: string;
    hasStructuredRecipe: boolean;
    videoSeconds: number | null;
    /** The import will watch the video because the caption lacks the recipe. */
    watchesVideo?: boolean;
}

export interface RecipeImportResult extends AiRecipeDraft {
    isRecipe: boolean;
    notRecipeReason: string;
    confidence: 'high' | 'medium' | 'low';
    sourceKind: 'recipe_page' | 'social_post' | 'video' | 'recipe_photo' | 'dish_photo' | 'text';
    sourceLanguage: string;
    issues: ImportIssue[];
    images: { url: string; alt: string; isPrimary: boolean }[];
    sourceUrl: string;
    source: { platform: ImportPlatform; url: string; title: string; author: string; imageUrl: string; via: string[] };
    cost: { model: string; inputTokens: number; outputTokens: number; usd: number; durationMs: number };
}

export interface RecipeImportInput {
    url?: string;
    text?: string;
    /** data: URLs, already downsized on the client. */
    images?: string[];
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

    /** Link / photos / text -> a reviewed recipe draft (one paid AI call). */
    importRecipe(input: RecipeImportInput): Promise<RecipeImportResult> {
        return this.api.post<RecipeImportResult>('/ai/recipes/import', input);
    }

    /** Free, AI-less look at a link (platform, title, cover) for the progress screen. */
    previewImport(url: string): Promise<ImportPreview> {
        return this.api.post<ImportPreview>('/ai/recipes/import/preview', { url });
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
