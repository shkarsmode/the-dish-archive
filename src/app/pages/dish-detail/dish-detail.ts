import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import {
    CATEGORY_LABELS,
    DIFFICULTY_LABELS,
    Dish,
    DishCategory,
    DishDifficulty,
    TASTE_LABELS,
    TasteProfile,
} from '../../core/models/dish.model';
import { DishService } from '../../core/services/dish.service';
import { FavoritesButtonComponent } from '../../shared/components/favorites-button.component';
import { RatingStarsComponent } from '../../shared/components/rating-stars.component';
import { TagChipComponent } from '../../shared/components/tag-chip.component';

@Component({
    selector: 'app-dish-detail',
    imports: [RouterLink, RatingStarsComponent, FavoritesButtonComponent, TagChipComponent],
    templateUrl: './dish-detail.html',
    styleUrl: './dish-detail.scss',
})
export class DishDetailPage {
    private readonly route = inject(ActivatedRoute);
    private readonly dishService = inject(DishService);

    private readonly slug = toSignal(
        this.route.paramMap.pipe(map(params => params.get('slug') ?? ''))
    );

    readonly dish = computed(() => {
        const slugValue = this.slug();
        if (!slugValue) return undefined;
        return this.dishService.getDishBySlug(slugValue)();
    });

    readonly isLoading = this.dishService.isLoading;

    protected readonly activeImageIndex = signal(0);

    protected get currentImage(): string {
        const dishValue = this.dish();
        if (!dishValue || dishValue.images.length === 0) return '';
        return dishValue.images[this.activeImageIndex()]?.url ?? dishValue.images[0]?.url ?? '';
    }

    protected get currentImageAlt(): string {
        const dishValue = this.dish();
        if (!dishValue || dishValue.images.length === 0) return '';
        return dishValue.images[this.activeImageIndex()]?.alt ?? dishValue.title;
    }

    protected getCategoryLabel(category: DishCategory): string {
        return CATEGORY_LABELS[category] ?? category;
    }

    protected getDifficultyLabel(difficulty: DishDifficulty): string {
        return DIFFICULTY_LABELS[difficulty] ?? difficulty;
    }

    protected getTasteLabel(key: string): string {
        return TASTE_LABELS[key as keyof TasteProfile] ?? key;
    }

    protected getTasteEntries(dish: Dish): { key: string; label: string; value: number }[] {
        return Object.entries(dish.tasteProfile)
            .filter(([, value]) => value > 0)
            .map(([key, value]) => ({
                key,
                label: this.getTasteLabel(key),
                value: value as number,
            }))
            .sort((a, b) => b.value - a.value);
    }

    protected formatDate(isoString: string): string {
        return new Date(isoString).toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    }

    protected selectImage(index: number): void {
        this.activeImageIndex.set(index);
    }

    protected onImageError(event: Event): void {
        const img = event.target as HTMLImageElement;
        img.src = 'data:image/svg+xml,' + encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" fill="%23F0EDE8">` +
            `<rect width="800" height="500"/>` +
            `<text x="400" y="250" text-anchor="middle" dy=".3em" fill="%23A0A0A0" font-family="Inter,sans-serif" font-size="16">` +
            `Изображение недоступно</text></svg>`
        );
    }
}
