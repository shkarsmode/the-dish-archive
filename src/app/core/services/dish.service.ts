import { Injectable, computed, effect, inject, signal } from '@angular/core';
import {
    DEFAULT_FILTER_STATE,
    Dish,
    DishData,
    FilterState,
    SortOption,
    TasteProfile,
} from '../models/dish.model';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { FavoritesService } from './favorites.service';

@Injectable({ providedIn: 'root' })
export class DishService {
    private readonly api = inject(ApiService);
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
        const effRating = (d: Dish) => (d.ratingCount > 0 ? d.ratingAverage : d.rating);
        dishes.sort((a, b) => {
            switch (sortOption) {
                case 'date-desc': return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                case 'date-asc': return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                case 'rating-desc': return effRating(b) - effRating(a) || b.ratingCount - a.ratingCount;
                case 'rating-asc': return effRating(a) - effRating(b);
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
        // so the backend returns the right set for the current user.
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
        try {
            const dishes = await this.api.get<Dish[]>('/dishes');
            this.allDishesSignal.set(dishes ?? []);
        } catch (error) {
            console.error('Failed to load dishes from API:', error);
            this.loadError.set('Не вдалося завантажити дані');
        } finally {
            this.isLoading.set(false);
        }
    }

    private async fetchDishById(id: string): Promise<Dish | null> {
        return this.api.get<Dish>('/dishes/' + id);
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

    async updateDish(id: string, updates: Partial<Dish>): Promise<Dish> {
        const dish = await this.api.patch<Dish>('/dishes/' + id, updates);
        this.allDishesSignal.update(dishes => dishes.map(d => (d.id === id ? dish : d)));
        return dish;
    }

    async createDish(dish: Partial<Dish>): Promise<Dish> {
        const created = await this.api.post<Dish>('/dishes', dish);
        this.allDishesSignal.update(dishes => [...dishes, created]);
        return created;
    }

    async deleteDish(id: string): Promise<void> {
        try {
            await this.api.delete('/dishes/' + id);
        } catch (e: unknown) {
            const err = e as { error?: { message?: string }; message?: string };
            throw new Error(
                err?.error?.message || err?.message || 'Недостатньо прав для видалення цього рецепта'
            );
        }
        this.allDishesSignal.update(dishes => dishes.filter(d => d.id !== id));
    }

    /**
     * Publish every recipe the current user may edit (super admin: all) publicly.
     * Returns the number of dishes updated. The backend scopes which rows are affected.
     */
    async makeAllPublic(): Promise<number> {
        const { count } = await this.api.post<{ count: number }>('/dishes/make-all-public');
        await this.reload();
        return count;
    }

    /** Optimistically adjust a dish's like counter (used by FavoritesService). */
    applyLikeDelta(id: string, delta: number): void {
        this.allDishesSignal.update(dishes =>
            dishes.map(d => (d.id === id ? { ...d, likeCount: Math.max(0, d.likeCount + delta) } : d)),
        );
    }

    /** Refresh a dish's denormalized rating aggregate in the cache (used by RatingService). */
    applyRatingAggregate(id: string, average: number, count: number): void {
        this.allDishesSignal.update(dishes =>
            dishes.map(d => (d.id === id ? { ...d, ratingAverage: average, ratingCount: count } : d)),
        );
    }
}
