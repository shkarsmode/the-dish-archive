import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import {
    DEFAULT_FILTER_STATE,
    Dish,
    DishData,
    FilterState,
    SortOption,
    TasteProfile,
} from '../models/dish.model';
import { FavoritesService } from './favorites.service';

@Injectable({ providedIn: 'root' })
export class DishService {
    private readonly httpClient = inject(HttpClient);
    private readonly favoritesService = inject(FavoritesService);

    private readonly allDishes = signal<Dish[]>([]);
    readonly isLoading = signal(true);
    readonly loadError = signal<string | null>(null);

    readonly searchQuery = signal('');
    readonly sortOption = signal<SortOption>('date-desc');
    readonly filters = signal<FilterState>({ ...DEFAULT_FILTER_STATE });
    readonly currentPage = signal(1);
    readonly pageSize = signal(12);

    readonly allTags = computed(() => {
        const tagSet = new Set<string>();
        for (const dish of this.allDishes()) {
            for (const tag of dish.tags) {
                tagSet.add(tag);
            }
        }
        return [...tagSet].sort();
    });

    readonly priceExtent = computed(() => {
        const dishes = this.allDishes();
        if (dishes.length === 0) return [0, 1000] as [number, number];
        const prices = dishes.map(d => d.price.amount);
        return [Math.min(...prices), Math.max(...prices)] as [number, number];
    });

    readonly calorieExtent = computed(() => {
        const dishes = this.allDishes();
        if (dishes.length === 0) return [0, 1000] as [number, number];
        const calories = dishes.map(d => d.calories);
        return [Math.min(...calories), Math.max(...calories)] as [number, number];
    });

    readonly timeExtent = computed(() => {
        const dishes = this.allDishes();
        if (dishes.length === 0) return [0, 180] as [number, number];
        const times = dishes.map(d => d.cookingTime.total);
        return [Math.min(...times), Math.max(...times)] as [number, number];
    });

    readonly filteredDishes = computed(() => {
        let dishes = [...this.allDishes()];
        const filterState = this.filters();
        const query = this.searchQuery().toLowerCase().trim();

        // Search
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

        // Category filter
        if (filterState.categories.length > 0) {
            dishes = dishes.filter(dish =>
                filterState.categories.some(category =>
                    dish.categories.includes(category)
                )
            );
        }

        // Tag filter
        if (filterState.tags.length > 0) {
            dishes = dishes.filter(dish =>
                filterState.tags.some(tag => dish.tags.includes(tag))
            );
        }

        // Price range
        if (filterState.priceRange) {
            const [minPrice, maxPrice] = filterState.priceRange;
            dishes = dishes.filter(dish =>
                dish.price.amount >= minPrice && dish.price.amount <= maxPrice
            );
        }

        // Calorie range
        if (filterState.calorieRange) {
            const [minCalories, maxCalories] = filterState.calorieRange;
            dishes = dishes.filter(dish =>
                dish.calories >= minCalories && dish.calories <= maxCalories
            );
        }

        // Time range
        if (filterState.timeRange) {
            const [minTime, maxTime] = filterState.timeRange;
            dishes = dishes.filter(dish =>
                dish.cookingTime.total >= minTime && dish.cookingTime.total <= maxTime
            );
        }

        // Taste filters
        if (filterState.tasteFilters.length > 0) {
            dishes = dishes.filter(dish =>
                filterState.tasteFilters.every(
                    (taste: keyof TasteProfile) => dish.tasteProfile[taste] >= 3
                )
            );
        }

        // Favorites only
        if (filterState.favoritesOnly) {
            dishes = dishes.filter(dish =>
                this.favoritesService.isFavorite(dish.id)()
            );
        }

        // Sorting
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

    readonly totalPages = computed(() =>
        Math.max(1, Math.ceil(this.filteredDishes().length / this.pageSize()))
    );

    readonly paginatedDishes = computed(() => {
        const page = this.currentPage();
        const size = this.pageSize();
        const startIndex = (page - 1) * size;
        return this.filteredDishes().slice(startIndex, startIndex + size);
    });

    readonly hasActiveFilters = computed(() => {
        const filterState = this.filters();
        return (
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
        this.loadDishes();
    }

    private loadDishes(): void {
        this.httpClient.get<DishData>('data/dishes.json').subscribe({
            next: (data) => {
                this.allDishes.set(data.dishes);
                this.isLoading.set(false);
            },
            error: (error) => {
                console.error('Failed to load dishes:', error);
                this.loadError.set('Не удалось загрузить данные');
                this.isLoading.set(false);
            },
        });
    }

    getDishBySlug(slug: string) {
        return computed(() => this.allDishes().find(dish => dish.slug === slug));
    }

    updateSearch(query: string): void {
        this.searchQuery.set(query);
        this.currentPage.set(1);
    }

    updateSort(option: SortOption): void {
        this.sortOption.set(option);
    }

    updateFilters(partialFilters: Partial<FilterState>): void {
        this.filters.update(current => ({ ...current, ...partialFilters }));
        this.currentPage.set(1);
    }

    resetFilters(): void {
        this.filters.set({ ...DEFAULT_FILTER_STATE });
        this.searchQuery.set('');
        this.currentPage.set(1);
    }

    goToPage(page: number): void {
        const clamped = Math.max(1, Math.min(page, this.totalPages()));
        this.currentPage.set(clamped);
    }

    importDishes(data: DishData): void {
        this.allDishes.set(data.dishes);
    }

    exportData(): DishData {
        return {
            version: '1.0.0',
            lastUpdated: new Date().toISOString(),
            dishes: this.allDishes(),
        };
    }
}
