import { Component, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { CATEGORY_LABELS, DishCategory } from '../../core/models/dish.model';
import { DishService } from '../../core/services/dish.service';
import { DishCardComponent } from '../../shared/components/dish-card.component';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { FilterDrawerComponent } from '../../shared/components/filter-drawer.component';
import { SearchBarComponent } from '../../shared/components/search-bar.component';
import { SkeletonCardComponent } from '../../shared/components/skeleton-card.component';
import { SortDropdownComponent } from '../../shared/components/sort-dropdown.component';
import { TagChipComponent } from '../../shared/components/tag-chip.component';

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
    ],
    templateUrl: './catalog.html',
    styleUrl: './catalog.scss',
})
export class CatalogPage {
    protected readonly dishService = inject(DishService);
    private readonly router = inject(Router);
    protected readonly filterDrawer = viewChild<FilterDrawerComponent>('filterDrawer');
    protected readonly isSpinning = signal(false);

    protected readonly quickCategories: DishCategory[] = ['quick', 'healthy', 'dessert', 'everyday', 'festive', 'vegetarian'];
    protected readonly skeletonItems = Array.from({ length: 6 });

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

    protected goToRandomDish(): void {
        const dishes = this.dishService.filteredDishes();
        if (dishes.length === 0) return;
        this.isSpinning.set(true);
        setTimeout(() => {
            const random = dishes[Math.floor(Math.random() * dishes.length)];
            this.isSpinning.set(false);
            this.router.navigate(['/dish', random.slug]);
        }, 600);
    }

    protected goToPage(page: number): void {
        this.dishService.goToPage(page);
        document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    protected getPageNumbers(): number[] {
        const total = this.dishService.totalPages();
        const current = this.dishService.currentPage();
        const pages: number[] = [];

        if (total <= 7) {
            for (let i = 1; i <= total; i++) pages.push(i);
        } else {
            pages.push(1);
            if (current > 3) pages.push(-1);
            for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
                pages.push(i);
            }
            if (current < total - 2) pages.push(-1);
            pages.push(total);
        }

        return pages;
    }
}
