import { Injectable, computed, effect, inject, signal } from '@angular/core';
import {
    DEFAULT_FILTER_STATE,
    Dish,
    DishData,
    FilterState,
    SortOption,
    TasteProfile,
} from '../models/dish.model';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { FavoritesService } from './favorites.service';
import { DISH_SELECT, dishScalarsToRow, mapDish } from './supabase-mappers';

@Injectable({ providedIn: 'root' })
export class DishService {
    private readonly supabase = inject(SupabaseService);
    private readonly authService = inject(AuthService);
    private readonly favoritesService = inject(FavoritesService);

    private readonly allDishesSignal = signal<Dish[]>([]);
    readonly allDishes = this.allDishesSignal.asReadonly();
    readonly isLoading = signal(true);
    readonly loadError = signal<string | null>(null);

    readonly searchQuery = signal('');
    readonly sortOption = signal<SortOption>('date-desc');
    readonly filters = signal<FilterState>({ ...DEFAULT_FILTER_STATE });
    readonly visibleCount = signal(12);
    private readonly batchSize = 12;

    readonly allTags = computed(() => {
        const tagSet = new Set<string>();
        for (const dish of this.allDishesSignal()) {
            for (const tag of dish.tags) {
                tagSet.add(tag);
            }
        }
        return [...tagSet].sort();
    });

    readonly priceExtent = computed(() => {
        const dishes = this.allDishesSignal();
        if (dishes.length === 0) return [0, 1000] as [number, number];
        const prices = dishes.map(d => d.price.amount);
        return [Math.min(...prices), Math.max(...prices)] as [number, number];
    });

    readonly calorieExtent = computed(() => {
        const dishes = this.allDishesSignal();
        if (dishes.length === 0) return [0, 1000] as [number, number];
        const calories = dishes.map(d => d.calories);
        return [Math.min(...calories), Math.max(...calories)] as [number, number];
    });

    readonly timeExtent = computed(() => {
        const dishes = this.allDishesSignal();
        if (dishes.length === 0) return [0, 180] as [number, number];
        const times = dishes.map(d => d.cookingTime.total);
        return [Math.min(...times), Math.max(...times)] as [number, number];
    });

    readonly filteredDishes = computed(() => {
        let dishes = [...this.allDishesSignal()];
        const filterState = this.filters();
        const query = this.searchQuery().toLowerCase().trim();

        if (query) {
            dishes = dishes.filter(dish =>
                dish.title.toLowerCase().includes(query) ||
                dish.description.toLowerCase().includes(query) ||
                dish.tags.some(tag => tag.toLowerCase().includes(query)) ||
                dish.ingredients.some(ingredient =>
                    ingredient.name.toLowerCase().includes(query)
                )
            );
        }

        // Family filter (all-families vs a selected subset)
        if (filterState.selectedFamilyIds.length > 0) {
            dishes = dishes.filter(dish =>
                filterState.selectedFamilyIds.includes(dish.familyId)
            );
        }

        if (filterState.categories.length > 0) {
            dishes = dishes.filter(dish =>
                filterState.categories.some(category =>
                    dish.categories.includes(category)
                )
            );
        }

        if (filterState.tags.length > 0) {
            dishes = dishes.filter(dish =>
                filterState.tags.some(tag => dish.tags.includes(tag))
            );
        }

        if (filterState.priceRange) {
            const [minPrice, maxPrice] = filterState.priceRange;
            dishes = dishes.filter(dish =>
                dish.price.amount >= minPrice && dish.price.amount <= maxPrice
            );
        }

        if (filterState.calorieRange) {
            const [minCalories, maxCalories] = filterState.calorieRange;
            dishes = dishes.filter(dish =>
                dish.calories >= minCalories && dish.calories <= maxCalories
            );
        }

        if (filterState.timeRange) {
            const [minTime, maxTime] = filterState.timeRange;
            dishes = dishes.filter(dish =>
                dish.cookingTime.total >= minTime && dish.cookingTime.total <= maxTime
            );
        }

        if (filterState.tasteFilters.length > 0) {
            dishes = dishes.filter(dish =>
                filterState.tasteFilters.every(
                    (taste: keyof TasteProfile) => dish.tasteProfile[taste] >= 3
                )
            );
        }

        if (filterState.favoritesOnly) {
            dishes = dishes.filter(dish =>
                this.favoritesService.favoriteIds().has(dish.id)
            );
        }

        const sortOption = this.sortOption();
        dishes.sort((a, b) => {
            switch (sortOption) {
                case 'date-desc': return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                case 'date-asc': return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                case 'rating-desc': return b.rating - a.rating;
                case 'rating-asc': return a.rating - b.rating;
                case 'price-asc': return a.price.amount - b.price.amount;
                case 'price-desc': return b.price.amount - a.price.amount;
                case 'time-asc': return a.cookingTime.total - b.cookingTime.total;
                case 'time-desc': return b.cookingTime.total - a.cookingTime.total;
                case 'calories-asc': return a.calories - b.calories;
                case 'calories-desc': return b.calories - a.calories;
                default: return 0;
            }
        });

        return dishes;
    });

    readonly totalFilteredCount = computed(() => this.filteredDishes().length);

    readonly visibleDishes = computed(() => {
        return this.filteredDishes().slice(0, this.visibleCount());
    });

    readonly hasMore = computed(() => {
        return this.visibleCount() < this.filteredDishes().length;
    });

    readonly hasActiveFilters = computed(() => {
        const filterState = this.filters();
        return (
            filterState.selectedFamilyIds.length > 0 ||
            filterState.categories.length > 0 ||
            filterState.tags.length > 0 ||
            filterState.priceRange !== null ||
            filterState.calorieRange !== null ||
            filterState.timeRange !== null ||
            filterState.tasteFilters.length > 0 ||
            filterState.favoritesOnly
        );
    });

    constructor() {
        // Load (and reload) dishes whenever the auth session resolves or changes,
        // so RLS returns the right set for the current user.
        effect(() => {
            if (!this.authService.isReady()) {
                return;
            }
            this.authService.user();
            void this.reload();
        });
    }

    async reload(): Promise<void> {
        this.isLoading.set(true);
        this.loadError.set(null);
        const { data, error } = await this.supabase.client
            .from('dishes')
            .select(DISH_SELECT)
            .order('created_at', { ascending: false });
        if (error) {
            console.error('Failed to load dishes from Supabase:', error);
            this.loadError.set('Не вдалося завантажити дані');
            this.isLoading.set(false);
            return;
        }
        this.allDishesSignal.set((data ?? []).map(mapDish));
        this.isLoading.set(false);
    }

    private async fetchDishById(id: string): Promise<Dish | null> {
        const { data } = await this.supabase.client
            .from('dishes')
            .select(DISH_SELECT)
            .eq('id', id)
            .maybeSingle();
        return data ? mapDish(data) : null;
    }

    getDishBySlug(slug: string) {
        return computed(() => this.allDishesSignal().find(dish => dish.slug === slug));
    }

    loadMore(): void {
        if (this.hasMore()) {
            this.visibleCount.update(c => c + this.batchSize);
        }
    }

    updateSearch(query: string): void {
        this.searchQuery.set(query);
        this.visibleCount.set(this.batchSize);
    }

    updateSort(option: SortOption): void {
        this.sortOption.set(option);
    }

    updateFilters(partialFilters: Partial<FilterState>): void {
        this.filters.update(current => ({ ...current, ...partialFilters }));
        this.visibleCount.set(this.batchSize);
    }

    resetFilters(): void {
        this.filters.set({ ...DEFAULT_FILTER_STATE });
        this.searchQuery.set('');
        this.visibleCount.set(this.batchSize);
    }

    importDishes(data: DishData): void {
        this.allDishesSignal.set(data.dishes);
    }

    exportData(): DishData {
        return {
            version: '1.0.0',
            lastUpdated: new Date().toISOString(),
            dishes: this.allDishesSignal(),
        };
    }

    private async replaceChildren(dishId: string, dish: Partial<Dish>): Promise<void> {
        const client = this.supabase.client;
        if (dish.images !== undefined) {
            await client.from('dish_images').delete().eq('dish_id', dishId);
            if (dish.images.length) {
                await client.from('dish_images').insert(
                    dish.images.map((image, index) => ({
                        dish_id: dishId,
                        url: image.url,
                        alt: image.alt,
                        is_primary: image.isPrimary,
                        sort_order: index,
                    }))
                );
            }
        }
        if (dish.ingredients !== undefined) {
            await client.from('ingredients').delete().eq('dish_id', dishId);
            if (dish.ingredients.length) {
                await client.from('ingredients').insert(
                    dish.ingredients.map((ingredient, index) => ({
                        dish_id: dishId,
                        name: ingredient.name,
                        amount: ingredient.amount,
                        unit: ingredient.unit,
                        optional: ingredient.optional,
                        sort_order: index,
                    }))
                );
            }
        }
        if (dish.steps !== undefined) {
            await client.from('cooking_steps').delete().eq('dish_id', dishId);
            if (dish.steps.length) {
                await client.from('cooking_steps').insert(
                    dish.steps.map((step, index) => ({
                        dish_id: dishId,
                        step_order: step.order ?? index + 1,
                        description: step.description,
                        duration: step.duration ?? null,
                        image_url: step.imageUrl ?? null,
                    }))
                );
            }
        }
    }

    async updateDish(id: string, updates: Partial<Dish>): Promise<Dish> {
        const row = dishScalarsToRow(updates);
        if (Object.keys(row).length > 0) {
            const { error } = await this.supabase.client.from('dishes').update(row).eq('id', id);
            if (error) throw error;
        }
        await this.replaceChildren(id, updates);
        const dish = await this.fetchDishById(id);
        if (dish) {
            this.allDishesSignal.update(dishes => dishes.map(d => (d.id === id ? dish : d)));
        }
        return dish as Dish;
    }

    async createDish(dish: Partial<Dish>): Promise<Dish> {
        const row = {
            ...dishScalarsToRow(dish),
            family_id: dish.familyId,
            created_by_user_id: this.authService.user()?.id ?? null,
            ...(dish.id ? { id: dish.id } : {}),
        };
        const { data, error } = await this.supabase.client
            .from('dishes')
            .insert(row)
            .select('id')
            .single();
        if (error) throw error;
        const newId = data.id as string;
        await this.replaceChildren(newId, dish);
        const created = await this.fetchDishById(newId);
        if (created) {
            this.allDishesSignal.update(dishes => [...dishes, created]);
        }
        return created as Dish;
    }

    async deleteDish(id: string): Promise<void> {
        // RLS filters out rows the user may not delete WITHOUT raising an error,
        // so a denied delete returns error:null and count:0. Treat 0 rows as a failure.
        const { error, count } = await this.supabase.client
            .from('dishes')
            .delete({ count: 'exact' })
            .eq('id', id);
        if (error) throw error;
        if (!count) throw new Error('Недостатньо прав для видалення цього рецепта');
        this.allDishesSignal.update(dishes => dishes.filter(d => d.id !== id));
    }

    /**
     * Publish every recipe the current user may edit (super admin: all) publicly.
     * Returns the number of dishes updated. RLS scopes which rows are affected.
     */
    async makeAllPublic(): Promise<number> {
        const { data, error } = await this.supabase.client
            .from('dishes')
            .update({ visibility: 'public', status: 'published' })
            .not('id', 'is', null)
            .select('id');
        if (error) throw error;
        await this.reload();
        return data?.length ?? 0;
    }

    /** Optimistically adjust a dish's like counter (used by FavoritesService). */
    applyLikeDelta(id: string, delta: number): void {
        this.allDishesSignal.update(dishes =>
            dishes.map(d => (d.id === id ? { ...d, likeCount: Math.max(0, d.likeCount + delta) } : d)),
        );
    }
}

