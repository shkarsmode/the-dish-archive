import { Component, inject, signal } from '@angular/core';
import {
    ALL_CATEGORIES,
    ALL_TASTE_KEYS,
    CATEGORY_LABELS,
    DishCategory,
    TASTE_LABELS,
    TasteProfile,
} from '../../core/models/dish.model';
import { DishService } from '../../core/services/dish.service';
import { RangeSliderComponent } from './range-slider.component';
import { TagChipComponent } from './tag-chip.component';

@Component({
    selector: 'app-filter-drawer',
    imports: [TagChipComponent, RangeSliderComponent],
    template: `
        @if (isOpen()) {
            <div class="drawer-backdrop" [class.closing]="isClosing() || isDragClosing()" (click)="close()" aria-hidden="true"></div>
            <aside class="drawer" role="dialog" aria-label="Фільтри"
                   [class.open]="isOpen()"
                   [class.closing]="isClosing()"
                   [class.drag-closing]="isDragClosing()"
                   [class.snapping]="isSnapping()"
                   [style.transform]="dragTransform()"
                   (animationend)="onAnimationDone()"
                   (transitionend)="onTransitionDone()">
                <div class="drawer-handle"
                     (touchstart)="onDragStart($event)"
                     (touchmove)="onDragMove($event)"
                     (touchend)="onDragEnd()"
                     (click)="close()">
                    <div class="handle-bar"></div>
                </div>

                <div class="drawer-header">
                    <h2 class="drawer-title">Фільтри</h2>
                    <button class="reset-button" (click)="resetAllFilters()"
                            [disabled]="!dishService.hasActiveFilters()">
                        Скинути
                    </button>
                </div>

                <div class="drawer-body">
                    <!-- Favorites -->
                    <div class="filter-section">
                        <label class="favorites-toggle">
                            <input
                                type="checkbox"
                                [checked]="dishService.filters().favoritesOnly"
                                (change)="toggleFavoritesOnly()" />
                            <span class="toggle-track">
                                <span class="toggle-thumb"></span>
                            </span>
                            <span class="toggle-label">Тільки обране</span>
                        </label>
                    </div>

                    <!-- Categories -->
                    <div class="filter-section">
                        <h3 class="filter-heading">Категорії</h3>
                        <div class="chips-grid">
                            @for (category of allCategories; track category) {
                                <app-tag-chip
                                    [label]="getCategoryLabel(category)"
                                    [active]="isCategoryActive(category)"
                                    (tagClicked)="toggleCategory(category)" />
                            }
                        </div>
                    </div>

                    <!-- Tags -->
                    @if (dishService.allTags().length > 0) {
                        <div class="filter-section">
                            <h3 class="filter-heading">Теги</h3>
                            <div class="chips-grid">
                                @for (tag of dishService.allTags(); track tag) {
                                    <app-tag-chip
                                        [label]="tag"
                                        [active]="isTagActive(tag)"
                                        (tagClicked)="toggleTag(tag)" />
                                }
                            </div>
                        </div>
                    }

                    <!-- Taste -->
                    <div class="filter-section">
                        <h3 class="filter-heading">Смаковий профіль</h3>
                        <div class="chips-grid">
                            @for (taste of allTasteKeys; track taste) {
                                <app-tag-chip
                                    [label]="getTasteLabel(taste)"
                                    [active]="isTasteActive(taste)"
                                    (tagClicked)="toggleTaste(taste)" />
                            }
                        </div>
                    </div>

                    <!-- Price Range -->
                    <div class="filter-section">
                        <app-range-slider
                            label="Вартість"
                            [min]="dishService.priceExtent()[0]"
                            [max]="dishService.priceExtent()[1]"
                            [step]="50"
                            suffix=" грн"
                            [initialMin]="dishService.filters().priceRange?.[0] ?? null"
                            [initialMax]="dishService.filters().priceRange?.[1] ?? null"
                            (rangeChanged)="onPriceRangeChange($event)" />
                    </div>

                    <!-- Calorie Range -->
                    <div class="filter-section">
                        <app-range-slider
                            label="Калорії"
                            [min]="dishService.calorieExtent()[0]"
                            [max]="dishService.calorieExtent()[1]"
                            [step]="10"
                            suffix=" ккал"
                            [initialMin]="dishService.filters().calorieRange?.[0] ?? null"
                            [initialMax]="dishService.filters().calorieRange?.[1] ?? null"
                            (rangeChanged)="onCalorieRangeChange($event)" />
                    </div>

                    <!-- Time Range -->
                    <div class="filter-section">
                        <app-range-slider
                            label="Час приготування"
                            [min]="dishService.timeExtent()[0]"
                            [max]="dishService.timeExtent()[1]"
                            [step]="5"
                            suffix=" хв"
                            [initialMin]="dishService.filters().timeRange?.[0] ?? null"
                            [initialMax]="dishService.filters().timeRange?.[1] ?? null"
                            (rangeChanged)="onTimeRangeChange($event)" />
                    </div>
                </div>

                <div class="drawer-footer">
                    <button class="apply-button" (click)="close()">
                        Показати {{ dishService.totalFilteredCount() }} страв
                    </button>
                </div>
            </aside>
        }
    `,
    styles: `
        @use 'mixins' as m;

        .drawer-backdrop {
            position: fixed;
            inset: 0;
            background: var(--color-backdrop);
            z-index: var(--z-drawer);
            animation: fadeIn 200ms ease;

            &.closing {
                animation: fadeOut 250ms ease forwards;
            }
        }

        .drawer {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            max-height: 85dvh;
            background: var(--color-surface);
            border-radius: var(--radius-xl) var(--radius-xl) 0 0;
            z-index: var(--z-drawer);
            display: flex;
            flex-direction: column;
            animation: slideUp 250ms var(--ease-out-expo);
            padding-bottom: var(--safe-bottom);

            &.closing {
                animation: slideDown 250ms ease forwards;
            }

            &.drag-closing {
                animation: none;
                transition: transform 250ms ease, opacity 200ms ease;
                opacity: 0;
            }

            &.snapping {
                animation: none;
                transition: transform 200ms var(--ease-out-expo);
            }

            @include m.desktop {
                position: fixed;
                top: 0;
                bottom: 0;
                right: 0;
                left: auto;
                width: 400px;
                max-height: 100dvh;
                border-radius: var(--radius-xl) 0 0 var(--radius-xl);
                animation: slideInRight 250ms var(--ease-out-expo);

                &.closing {
                    animation: slideOutRight 250ms ease forwards;
                }
            }
        }

        @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
        }

        @keyframes slideDown {
            from { transform: translateY(0); opacity: 1; }
            to { transform: translateY(100%); opacity: 0; }
        }

        @keyframes slideOutRight {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }

        .drawer-handle {
            display: flex;
            justify-content: center;
            padding: var(--space-3);
            cursor: pointer;
            touch-action: none;

            @include m.desktop {
                display: none;
            }
        }

        .handle-bar {
            width: 36px;
            height: 4px;
            background: var(--color-border);
            border-radius: 2px;
        }

        .drawer-header {
            @include m.flex-between;
            padding: var(--space-2) var(--space-5) var(--space-4);
            border-bottom: 1px solid var(--color-border-light);

            @include m.desktop {
                padding: var(--space-6) var(--space-6) var(--space-4);
            }
        }

        .drawer-title {
            font-family: var(--font-display);
            font-size: var(--text-xl);
            font-weight: var(--weight-semibold);
        }

        .reset-button {
            font-size: var(--text-sm);
            color: var(--color-accent);
            font-weight: var(--weight-medium);
            transition: opacity var(--transition-fast);

            &:disabled {
                opacity: 0.4;
                cursor: default;
            }

            &:not(:disabled) {
                @include m.hover {
                    text-decoration: underline;
                }
            }
        }

        .drawer-body {
            flex: 1;
            overflow-y: auto;
            padding: var(--space-4) var(--space-5);
            display: flex;
            flex-direction: column;
            gap: var(--space-6);

            @include m.desktop {
                padding: var(--space-5) var(--space-6);
            }
        }

        .filter-section {
            display: flex;
            flex-direction: column;
            gap: var(--space-3);
        }

        .filter-heading {
            font-size: var(--text-sm);
            font-weight: var(--weight-semibold);
            color: var(--color-text-primary);
            text-transform: uppercase;
            letter-spacing: 0.04em;
        }

        .chips-grid {
            display: flex;
            flex-wrap: wrap;
            gap: var(--space-2);
        }

        .favorites-toggle {
            display: flex;
            align-items: center;
            gap: var(--space-3);
            cursor: pointer;

            input {
                position: absolute;
                opacity: 0;
                width: 0;
                height: 0;
            }
        }

        .toggle-track {
            position: relative;
            width: 44px;
            height: 24px;
            background: var(--color-border);
            border-radius: 12px;
            transition: background-color var(--transition-base);
            flex-shrink: 0;

            input:checked + & {
                background: var(--color-accent);
            }
        }

        .toggle-thumb {
            position: absolute;
            top: 2px;
            left: 2px;
            width: 20px;
            height: 20px;
            background: var(--color-surface);
            border-radius: 50%;
            box-shadow: var(--shadow-xs);
            transition: transform var(--transition-base);

            input:checked + .toggle-track > & {
                transform: translateX(20px);
            }
        }

        .toggle-label {
            font-size: var(--text-sm);
            font-weight: var(--weight-medium);
        }

        .drawer-footer {
            padding: var(--space-4) var(--space-5);
            border-top: 1px solid var(--color-border-light);

            @include m.desktop {
                padding: var(--space-4) var(--space-6);
            }
        }

        .apply-button {
            width: 100%;
            padding: var(--space-3) var(--space-6);
            background: var(--color-text-primary);
            color: var(--color-text-inverse);
            font-size: var(--text-base);
            font-weight: var(--weight-medium);
            border-radius: var(--radius-md);
            transition: opacity var(--transition-fast);

            @include m.hover {
                opacity: 0.88;
            }
        }
    `,
})
export class FilterDrawerComponent {
    protected readonly dishService = inject(DishService);
    protected readonly isOpen = signal(false);
    protected readonly isClosing = signal(false);
    protected readonly isDragClosing = signal(false);
    protected readonly isSnapping = signal(false);
    protected readonly dragTransform = signal('');

    protected readonly allCategories = ALL_CATEGORIES;
    protected readonly allTasteKeys = ALL_TASTE_KEYS;

    private dragStartY = 0;
    private dragCurrentY = 0;
    private isDragging = false;

    open(): void {
        this.isClosing.set(false);
        this.isOpen.set(true);
        document.body.style.overflow = 'hidden';
    }

    close(): void {
        this.isClosing.set(true);
    }

    protected onAnimationDone(): void {
        if (this.isClosing()) {
            this.isOpen.set(false);
            this.isClosing.set(false);
            this.dragTransform.set('');
            document.body.style.overflow = '';
        }
    }

    protected onTransitionDone(): void {
        if (this.isDragClosing()) {
            this.isOpen.set(false);
            this.isDragClosing.set(false);
            this.dragTransform.set('');
            document.body.style.overflow = '';
        }
        if (this.isSnapping()) {
            this.isSnapping.set(false);
            this.dragTransform.set('');
        }
    }

    // ── Swipe-to-dismiss ──
    protected onDragStart(e: TouchEvent): void {
        this.dragStartY = e.touches[0].clientY;
        this.dragCurrentY = this.dragStartY;
        this.isDragging = true;
    }

    protected onDragMove(e: TouchEvent): void {
        if (!this.isDragging) return;
        this.dragCurrentY = e.touches[0].clientY;
        const dy = Math.max(0, this.dragCurrentY - this.dragStartY);
        if (dy > 0) {
            e.preventDefault();
            this.dragTransform.set(`translateY(${dy}px)`);
        }
    }

    protected onDragEnd(): void {
        if (!this.isDragging) return;
        this.isDragging = false;
        const dy = this.dragCurrentY - this.dragStartY;
        if (dy > 80) {
            // Slide down from current position
            this.isDragClosing.set(true);
            this.dragTransform.set(`translateY(100vh)`);
        } else {
            // Snap back smoothly
            this.isSnapping.set(true);
            this.dragTransform.set('translateY(0)');
        }
    }

    protected getCategoryLabel(category: DishCategory): string {
        return CATEGORY_LABELS[category];
    }

    protected getTasteLabel(taste: keyof TasteProfile): string {
        return TASTE_LABELS[taste];
    }

    protected isCategoryActive(category: DishCategory): boolean {
        return this.dishService.filters().categories.includes(category);
    }

    protected isTagActive(tag: string): boolean {
        return this.dishService.filters().tags.includes(tag);
    }

    protected isTasteActive(taste: keyof TasteProfile): boolean {
        return this.dishService.filters().tasteFilters.includes(taste);
    }

    protected toggleCategory(category: DishCategory): void {
        const currentCategories = this.dishService.filters().categories;
        const updatedCategories = currentCategories.includes(category)
            ? currentCategories.filter(c => c !== category)
            : [...currentCategories, category];
        this.dishService.updateFilters({ categories: updatedCategories });
    }

    protected toggleTag(tag: string): void {
        const currentTags = this.dishService.filters().tags;
        const updatedTags = currentTags.includes(tag)
            ? currentTags.filter(t => t !== tag)
            : [...currentTags, tag];
        this.dishService.updateFilters({ tags: updatedTags });
    }

    protected toggleTaste(taste: keyof TasteProfile): void {
        const currentTastes = this.dishService.filters().tasteFilters;
        const updatedTastes = currentTastes.includes(taste)
            ? currentTastes.filter(t => t !== taste)
            : [...currentTastes, taste];
        this.dishService.updateFilters({ tasteFilters: updatedTastes });
    }

    protected toggleFavoritesOnly(): void {
        this.dishService.updateFilters({
            favoritesOnly: !this.dishService.filters().favoritesOnly,
        });
    }

    protected onPriceRangeChange(range: [number, number]): void {
        const extent = this.dishService.priceExtent();
        const isFullRange = range[0] === extent[0] && range[1] === extent[1];
        this.dishService.updateFilters({ priceRange: isFullRange ? null : range });
    }

    protected onCalorieRangeChange(range: [number, number]): void {
        const extent = this.dishService.calorieExtent();
        const isFullRange = range[0] === extent[0] && range[1] === extent[1];
        this.dishService.updateFilters({ calorieRange: isFullRange ? null : range });
    }

    protected onTimeRangeChange(range: [number, number]): void {
        const extent = this.dishService.timeExtent();
        const isFullRange = range[0] === extent[0] && range[1] === extent[1];
        this.dishService.updateFilters({ timeRange: isFullRange ? null : range });
    }

    protected resetAllFilters(): void {
        this.dishService.resetFilters();
    }
}
