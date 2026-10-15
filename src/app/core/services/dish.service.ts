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
import { FamilyService } from './family.service';
import { FavoritesService } from './favorites.service';

/** Last catalog per user, shown instantly on the next visit while it revalidates. */
const DISH_CACHE_KEY = 'dish_list_v1';
/** The family picked in the switcher, kept for the next visit on this device. */
const FAMILY_FILTER_KEY = 'dish_family_filter_v1';

function readRememberedFamilies(): string[] {
    try {
        const ids = JSON.parse(localStorage.getItem(FAMILY_FILTER_KEY) || '[]');
        return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : [];
    } catch {
        return [];
    }
}

function rememberFamilies(ids: string[]): void {
    try {
        if (ids.length) localStorage.setItem(FAMILY_FILTER_KEY, JSON.stringify(ids));
        else localStorage.removeItem(FAMILY_FILTER_KEY);
    } catch {
        /* storage blocked: the choice simply isn't remembered */
    }
}

@Injectable({ providedIn: 'root' })
export class DishService {
    private readonly api = inject(ApiService);
    private readonly authService = inject(AuthService);
    private readonly familyService = inject(FamilyService);
    private readonly favoritesService = inject(FavoritesService);

    private readonly allDishesSignal = signal<Dish[]>([]);
    readonly allDishes = this.allDishesSignal.asReadonly();
    readonly isLoading = signal(true);
    readonly loadError = signal<string | null>(null);

    readonly searchQuery = signal('');
    readonly sortOption = signal<SortOption>('date-desc');
    readonly filters = signal<FilterState>({ ...DEFAULT_FILTER_STATE, selectedFamilyIds: readRememberedFamilies() });
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

    private lastUserId: string | null | undefined = undefined;

    constructor() {
        // A returning user gets the catalog from the local cache immediately (the
        // cached session is applied synchronously, so its user id is known here).
        const cached = this.readCache();
        if (cached) {
            this.allDishesSignal.set(cached);
            this.isLoading.set(false);
        }
        // Fire the dishes fetch as soon as the token is known (at once when it is in
        // localStorage), so /dishes runs in PARALLEL with /auth/session instead of
        // waiting for the session round-trip (no waterfall), and never goes out
        // anonymous while Safari's backup token is still being restored.
        void this.authService.whenTokenSettled().then(() => this.reload());
        // Then reload only when the signed-in identity actually changes, so the
        // backend returns the right set for the new user.
        effect(() => {
            if (!this.authService.isReady()) {
                return;
            }
            const uid = this.authService.user()?.id ?? null;
            if (this.lastUserId === undefined) {
                this.lastUserId = uid; // first resolved session — constructor already fetched
                return;
            }
            if (uid !== this.lastUserId) {
                this.lastUserId = uid;
                void this.reload();
            }
        });
        // A remembered family the user can no longer see (signed out, left it, or it
        // was archived) would leave an empty catalog: fall back to all families.
        effect(() => {
            if (!this.familyService.loaded()) {
                return;
            }
            const visible = new Set(this.familyService.families().map(family => family.id));
            const ids = this.filters().selectedFamilyIds;
            const kept = ids.filter(id => visible.has(id));
            if (kept.length !== ids.length) {
                this.updateFilters({ selectedFamilyIds: kept });
            }
        });
    }

    async reload(): Promise<void> {
        // Skeletons only when there is nothing to show; a cached list stays on screen.
        this.isLoading.set(this.allDishesSignal().length === 0);
        this.loadError.set(null);
        try {
            const dishes = await this.api.get<Dish[]>('/dishes');
            this.allDishesSignal.set(dishes ?? []);
            this.writeCache(dishes ?? []);
        } catch (error) {
            console.error('Failed to load dishes from API:', error);
            this.loadError.set('Не вдалося завантажити дані');
        } finally {
            this.isLoading.set(false);
        }
    }

    private readCache(): Dish[] | null {
        const userId = this.authService.user()?.id;
        if (!userId || !this.api.getToken()) return null;
        try {
            const cache = JSON.parse(localStorage.getItem(DISH_CACHE_KEY) || 'null');
            return cache?.userId === userId && Array.isArray(cache.dishes) ? (cache.dishes as Dish[]) : null;
        } catch {
            return null;
        }
    }

    private writeCache(dishes: Dish[]): void {
        const userId = this.authService.user()?.id;
        try {
            if (userId && this.api.getToken()) {
                localStorage.setItem(DISH_CACHE_KEY, JSON.stringify({ userId, savedAt: Date.now(), dishes }));
            } else {
                localStorage.removeItem(DISH_CACHE_KEY);
            }
        } catch {
            /* quota: the cache is only a speed-up */
        }
    }

    /** Fetch a single recipe by slug (backend: GET /dishes/slug/:slug) so a deep
     *  link renders immediately instead of waiting for the whole archive to load. */
    async fetchDishBySlug(slug: string): Promise<Dish | null> {
        return this.api.get<Dish>('/dishes/slug/' + encodeURIComponent(slug));
    }

    /** One recipe straight from the API (the editor must never start from a cached copy). */
    async fetchDishById(id: string): Promise<Dish | null> {
        return this.api.get<Dish>('/dishes/' + encodeURIComponent(id));
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
        if (partialFilters.selectedFamilyIds) {
            rememberFamilies(partialFilters.selectedFamilyIds);
        }
        this.visibleCount.set(this.batchSize);
    }

    resetFilters(): void {
        this.filters.set({ ...DEFAULT_FILTER_STATE });
        rememberFamilies([]);
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
        this.writeCache(this.allDishesSignal());
        return dish;
    }

    async createDish(dish: Partial<Dish>): Promise<Dish> {
        const created = await this.api.post<Dish>('/dishes', dish);
        this.allDishesSignal.update(dishes => [...dishes, created]);
        this.writeCache(this.allDishesSignal());
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
        this.writeCache(this.allDishesSignal());
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
