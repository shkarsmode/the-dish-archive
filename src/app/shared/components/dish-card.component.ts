import { Component, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { CATEGORY_LABELS, Dish, DishCategory } from '../../core/models/dish.model';
import { CompareService } from '../../core/services/compare.service';
import { FavoritesButtonComponent } from './favorites-button.component';
import { RatingStarsComponent } from './rating-stars.component';

@Component({
    selector: 'app-dish-card',
    imports: [RatingStarsComponent, FavoritesButtonComponent],
    template: `
        <article class="dish-card" (click)="openDish()" role="link" tabindex="0"
                 (keydown.enter)="openDish()" [attr.aria-label]="dish().title">
            <div class="card-image">
                <img
                    [src]="primaryImage()"
                    [alt]="dish().images[0]?.alt || dish().title"
                    loading="lazy"
                    (error)="onImageError($event)" />
                <div class="card-image-overlay">
                    <app-favorites-button [dishId]="dish().id" />
                    <button
                        class="compare-toggle"
                        [class.active]="compareService.isSelected(dish().id)()"
                        (click)="toggleCompare($event)"
                        [attr.aria-label]="'Порівняти ' + dish().title"
                        [attr.aria-pressed]="compareService.isSelected(dish().id)()">
                        <span class="material-symbols-outlined">compare_arrows</span>
                    </button>
                </div>
                @if (dish().difficulty === 'easy') {
                    <span class="difficulty-badge easy">Легко</span>
                }
            </div>
            <div class="card-body">
                <div class="card-categories">
                    @for (category of dish().categories.slice(0, 2); track category) {
                        <span class="category-label">{{ getCategoryLabel(category) }}</span>
                    }
                </div>
                <h3 class="card-title">{{ dish().title }}</h3>
                <p class="card-description">{{ dish().description }}</p>
                <div class="card-meta">
                    <app-rating-stars [rating]="dish().rating" [compact]="true" />
                    <div class="meta-items">
                        <span class="meta-item">
                            <span class="material-symbols-outlined">schedule</span>
                            {{ dish().cookingTime.total }} хв
                        </span>
                        <span class="meta-item">
                            <span class="material-symbols-outlined">local_fire_department</span>
                            {{ dish().calories }} ккал
                        </span>
                        <span class="meta-item">
                            <span class="material-symbols-outlined">payments</span>
                            {{ dish().price.amount }} грн
                        </span>
                    </div>
                </div>
            </div>
        </article>
    `,
    styles: `
        @use 'mixins' as m;

        .dish-card {
            display: flex;
            flex-direction: column;
            background: var(--color-surface);
            border-radius: var(--radius-lg);
            overflow: hidden;
            cursor: pointer;
            box-shadow: var(--shadow-card);
            transition: transform var(--transition-base),
                        box-shadow var(--transition-base);

            &:hover {
                transform: translateY(-3px);
                box-shadow: var(--shadow-card-hover);

                .card-image img {
                    transform: scale(1.03);
                }
            }

            &:focus-visible {
                @include m.focus-ring;
            }
        }

        .card-image {
            position: relative;
            aspect-ratio: var(--card-aspect);
            overflow: hidden;
            background: var(--color-skeleton);

            img {
                width: 100%;
                height: 100%;
                object-fit: cover;
                transition: transform 400ms var(--ease-out-expo);
            }
        }

        .card-image-overlay {
            position: absolute;
            top: var(--space-3);
            right: var(--space-3);
            display: flex;
            flex-direction: column;
            gap: var(--space-2);
            opacity: 0;
            transition: opacity var(--transition-base);

            .dish-card:hover & {
                opacity: 1;
            }

            // Always visible on touch devices
            @media (hover: none) {
                opacity: 1;
            }
        }

        .compare-toggle {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 36px;
            height: 36px;
            border-radius: var(--radius-full);
            background: rgba(255, 255, 255, 0.9);
            backdrop-filter: blur(8px);
            color: var(--color-text-tertiary);
            transition: color var(--transition-fast),
                        background-color var(--transition-fast);

            &:hover {
                background: rgba(255, 255, 255, 1);
                color: var(--color-accent);
            }

            &.active {
                background: var(--color-accent);
                color: var(--color-text-inverse);
            }

            .material-symbols-outlined {
                font-size: 20px;
            }
        }

        .difficulty-badge {
            position: absolute;
            bottom: var(--space-3);
            left: var(--space-3);
            padding: var(--space-1) var(--space-3);
            font-size: var(--text-xs);
            font-weight: var(--weight-medium);
            border-radius: var(--radius-full);
            backdrop-filter: blur(8px);

            &.easy {
                background: rgba(238, 242, 235, 0.92);
                color: var(--color-secondary-dark);
            }
        }

        .card-body {
            display: flex;
            flex-direction: column;
            gap: var(--space-2);
            padding: var(--space-3);

            @media (min-width: 768px) {
                padding: var(--space-4);
            }
        }

        .card-categories {
            display: flex;
            gap: var(--space-2);
        }

        .category-label {
            font-size: var(--text-xs);
            font-weight: var(--weight-medium);
            color: var(--color-accent);
            text-transform: uppercase;
            letter-spacing: 0.04em;
        }

        .card-title {
            font-family: var(--font-display);
            font-size: var(--text-lg);
            font-weight: var(--weight-semibold);
            line-height: var(--leading-snug);
            color: var(--color-text-primary);
        }

        .card-description {
            @include m.line-clamp(2);
            font-size: var(--text-sm);
            color: var(--color-text-secondary);
            line-height: var(--leading-relaxed);
        }

        .card-meta {
            display: flex;
            flex-direction: column;
            gap: var(--space-2);
            margin-top: var(--space-1);
            padding-top: var(--space-3);
            border-top: 1px solid var(--color-border-light);
        }

        .meta-items {
            display: flex;
            gap: var(--space-4);
            flex-wrap: wrap;
        }

        .meta-item {
            display: inline-flex;
            align-items: center;
            gap: var(--space-1);
            font-size: var(--text-xs);
            color: var(--color-text-tertiary);
            white-space: nowrap;

            .material-symbols-outlined {
                font-size: 15px;
            }
        }
    `,
})
export class DishCardComponent {
    readonly dish = input.required<Dish>();

    protected readonly compareService = inject(CompareService);
    private readonly router = inject(Router);

    protected readonly primaryImage = () => {
        const images = this.dish().images;
        const primary = images.find(img => img.isPrimary);
        return primary?.url ?? images[0]?.url ?? '';
    };

    protected getCategoryLabel(category: DishCategory): string {
        return CATEGORY_LABELS[category] ?? category;
    }

    protected openDish(): void {
        this.router.navigate(['/dish', this.dish().slug]);
    }

    protected toggleCompare(event: Event): void {
        event.stopPropagation();
        this.compareService.toggle(this.dish());
    }

    protected onImageError(event: Event): void {
        const img = event.target as HTMLImageElement;
        img.src = 'data:image/svg+xml,' + encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" fill="%23F0EDE8">` +
            `<rect width="400" height="300"/>` +
            `<text x="200" y="150" text-anchor="middle" dy=".3em" fill="%23A0A0A0" font-family="Inter,sans-serif" font-size="14">` +
            `Зображення недоступне</text></svg>`
        );
    }
}
