import { afterNextRender, Component, computed, effect, ElementRef, inject, OnDestroy, signal, viewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CATEGORY_LABELS, Dish, DishCategory } from '../../core/models/dish.model';
import { AuthService } from '../../core/services/auth.service';
import { FamilyService } from '../../core/services/family.service';
import { DishService } from '../../core/services/dish.service';
import { FavoritesService } from '../../core/services/favorites.service';
import { ScrollRestorationService } from '../../core/services/scroll-restoration.service';
import { SettingsService } from '../../core/services/settings.service';
import { DishCardComponent } from '../../shared/components/dish-card.component';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { FilterDrawerComponent } from '../../shared/components/filter-drawer.component';
import { SearchBarComponent } from '../../shared/components/search-bar.component';
import { SkeletonCardComponent } from '../../shared/components/skeleton-card.component';
import { SlotMachineComponent } from '../../shared/components/slot-machine.component';
import { SortDropdownComponent } from '../../shared/components/sort-dropdown.component';
import { TagChipComponent } from '../../shared/components/tag-chip.component';
import { FamilySwitcherComponent } from '../../shared/components/family-switcher.component';

@Component({
    selector: 'app-catalog',
    imports: [
        SearchBarComponent,
        SortDropdownComponent,
        DishCardComponent,
        FilterDrawerComponent,
        SkeletonCardComponent,
        EmptyStateComponent,
        TagChipComponent,
        SlotMachineComponent,
        FamilySwitcherComponent,
        RouterLink,
    ],
    templateUrl: './catalog.html',
    styleUrl: './catalog.scss',
})
export class CatalogPage implements OnDestroy {
    protected readonly dishService = inject(DishService);
    private readonly favoritesService = inject(FavoritesService);
    private readonly router = inject(Router);
    protected readonly settingsService = inject(SettingsService);
    protected readonly authService = inject(AuthService);
    protected readonly familyService = inject(FamilyService);
    private readonly scrollRestoration = inject(ScrollRestorationService);
    protected readonly filterDrawer = viewChild<FilterDrawerComponent>('filterDrawer');
    protected readonly scrollSentinel = viewChild<ElementRef<HTMLElement>>('scrollSentinel');

    private observer: IntersectionObserver | null = null;

    protected readonly quickCategories: DishCategory[] = ['quick', 'healthy', 'dessert', 'everyday', 'festive', 'vegetarian'];
    protected readonly skeletonItems = Array.from({ length: 6 });
    protected loadingMore = false;

    constructor() {
        effect(() => {
            const sentinel = this.scrollSentinel();
            this.observer?.disconnect();
            if (sentinel) {
                this.observer = new IntersectionObserver(
                    (entries) => {
                        const entry = entries[0];
                        if (entry.isIntersecting && this.dishService.hasMore() && !this.loadingMore) {
                            this.loadingMore = true;
                            setTimeout(() => {
                                this.dishService.loadMore();
                                this.loadingMore = false;
                            }, 120);
                        }
                    },
                    { rootMargin: '200px' }
                );
                this.observer.observe(sentinel.nativeElement);
            }
        });

        // Scroll restoration: keep the grid hidden until we've scrolled to the card
        // the user came from, then reveal it already-positioned — no flash-to-top.
        afterNextRender(() => {
            const slug = this.scrollRestoration.consume();
            let done = false;
            const reveal = () => {
                if (done) return;
                done = true;
                this.restoring.set(false);
                this.scrollRestoration.doneRestoring();
            };
            if (!slug) { reveal(); return; }

            // Safety net: never keep the grid hidden longer than 1s.
            setTimeout(reveal, 1000);

            const scrollToCard = (card: HTMLElement) => {
                card.scrollIntoView({ block: 'center', behavior: 'instant' });
                (card.querySelector<HTMLElement>('.dish-card') ?? card).focus({ preventScroll: true });
            };

            const tryScroll = (attempts = 0) => {
                if (done) return;
                const card = document.querySelector<HTMLElement>(`app-dish-card[data-slug="${slug}"]`);
                if (card) {
                    scrollToCard(card);
                    // Re-assert over a few frames to beat Angular's own scroll restoration
                    // (which otherwise resets us to the top), then reveal the positioned grid.
                    let reasserts = 0;
                    const hold = () => {
                        if (done) return;
                        scrollToCard(card);
                        if (++reasserts < 4) requestAnimationFrame(hold);
                        else reveal();
                    };
                    requestAnimationFrame(hold);
                } else if (attempts < 40) {
                    requestAnimationFrame(() => tryScroll(attempts + 1));
                } else {
                    reveal();
                }
            };

            // Defer past Angular's in-memory scroll restoration so our card scroll wins.
            setTimeout(() => tryScroll(), 60);
        });
    }

    /** Hold the grid hidden during back-navigation scroll restore (avoids a top→card flash). */
    protected readonly restoring = signal(this.scrollRestoration.isRestoring);

    ngOnDestroy(): void {
        this.observer?.disconnect();
    }

    // ── Time-of-day greeting ──
    protected readonly greeting = computed(() => {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) return { text: 'Доброго ранку', emoji: '🌅', suggestion: 'Час для сніданку!' };
        if (hour >= 12 && hour < 17) return { text: 'Доброго дня', emoji: '☀️', suggestion: 'Час для обіду!' };
        if (hour >= 17 && hour < 22) return { text: 'Доброго вечора', emoji: '🌇', suggestion: 'Час для вечері!' };
        return { text: 'Доброї ночі', emoji: '🌙', suggestion: 'Перекус перед сном?' };
    });

    // ── Collection stats ──
    protected readonly collectionStats = computed(() => {
        const all = this.dishService.allDishes();
        if (all.length === 0) return undefined;
        const totalTime = all.reduce((sum, d) => sum + d.cookingTime.total, 0);
        const avgRating = all.reduce((sum, d) => sum + d.rating, 0) / all.length;
        const categoryCounts = all.reduce((acc, d) => {
            d.categories.forEach(c => acc[c] = (acc[c] || 0) + 1);
            return acc;
        }, {} as Record<string, number>);
        const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0];

        return {
            totalRecipes: all.length,
            totalCookingHours: Math.round(totalTime / 60),
            avgRating: avgRating.toFixed(1),
            favoritesCount: this.favoritesService.count(),
            topCategory: topCategory ? CATEGORY_LABELS[topCategory[0] as DishCategory] || topCategory[0] : '',
        };
    });

    protected getCategoryLabel(category: DishCategory): string {
        return CATEGORY_LABELS[category];
    }

    protected isCategoryActive(category: DishCategory): boolean {
        return this.dishService.filters().categories.includes(category);
    }

    protected toggleQuickCategory(category: DishCategory): void {
        const currentCategories = this.dishService.filters().categories;
        const updatedCategories = currentCategories.includes(category)
            ? currentCategories.filter(c => c !== category)
            : [...currentCategories, category];
        this.dishService.updateFilters({ categories: updatedCategories });
    }

    protected openFilters(): void {
        this.filterDrawer()?.open();
    }

    protected onSlotResult(dish: Dish): void {
        this.router.navigate(['/dish', dish.slug]);
    }
}
