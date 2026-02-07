import { Component, computed, input } from '@angular/core';

@Component({
    selector: 'app-rating-stars',
    template: `
        <div class="rating-stars" [class.compact]="compact()" [attr.aria-label]="'Оценка: ' + rating() + ' из 5'">
            @for (star of stars(); track star.index) {
                <span class="material-symbols-outlined star"
                      [class.filled]="star.type === 'full'"
                      [class.half]="star.type === 'half'">
                    {{ star.type === 'full' ? 'star' : star.type === 'half' ? 'star_half' : 'star_border' }}
                </span>
            }
            @if (!compact()) {
                <span class="rating-value">{{ rating() }}</span>
            }
        </div>
    `,
    styles: `
        .rating-stars {
            display: inline-flex;
            align-items: center;
            gap: 1px;
        }

        .star {
            font-size: 18px;
            color: var(--color-border);
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 20;

            &.filled, &.half {
                color: var(--color-accent);
                font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 20;
            }
        }

        .compact .star {
            font-size: 14px;
        }

        .rating-value {
            margin-left: var(--space-1);
            font-size: var(--text-sm);
            font-weight: var(--weight-medium);
            color: var(--color-text-secondary);
        }
    `,
})
export class RatingStarsComponent {
    readonly rating = input.required<number>();
    readonly compact = input(false);

    readonly stars = computed(() => {
        const ratingValue = this.rating();
        const fullStars = Math.floor(ratingValue);
        const hasHalf = ratingValue - fullStars >= 0.25 && ratingValue - fullStars < 0.75;
        const hasFullExtra = ratingValue - fullStars >= 0.75;

        const result: { index: number; type: 'full' | 'half' | 'empty' }[] = [];

        for (let i = 0; i < 5; i++) {
            if (i < fullStars + (hasFullExtra ? 1 : 0)) {
                result.push({ index: i, type: 'full' });
            } else if (i === fullStars && hasHalf) {
                result.push({ index: i, type: 'half' });
            } else {
                result.push({ index: i, type: 'empty' });
            }
        }

        return result;
    });
}
