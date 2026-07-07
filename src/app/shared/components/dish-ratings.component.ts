import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RatingService } from '../../core/services/rating.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { RatingStarsComponent } from './rating-stars.component';

@Component({
    selector: 'app-dish-ratings',
    imports: [FormsModule, RatingStarsComponent],
    template: `
        <section class="ratings">
            <div class="ratings-head">
                <h2 class="ratings-title">Оцінки та відгуки</h2>
                @if (average() > 0) {
                    <div class="agg">
                        <app-rating-stars [rating]="average()" />
                        <span class="agg-value">{{ average().toFixed(1) }}</span>
                        <span class="agg-count">· {{ count() }} {{ pluralReviews(count()) }}</span>
                    </div>
                }
            </div>

            @if (canRate()) {
                <div class="rate-box">
                    <span class="rate-label">{{ myRating() ? 'Ваша оцінка' : 'Оцініть страву' }}</span>
                    <div class="star-input" (mouseleave)="hover.set(0)">
                        @for (star of [1,2,3,4,5]; track star) {
                            <button type="button" class="star-btn"
                                [class.on]="star <= (hover() || selected())"
                                (mouseenter)="hover.set(star)" (click)="selected.set(star)"
                                [attr.aria-label]="star + ' з 5'">
                                <span class="material-symbols-outlined">star</span>
                            </button>
                        }
                    </div>
                    <textarea class="comment-input" [(ngModel)]="comment" rows="2" placeholder="Додати коментар (необовʼязково)"></textarea>
                    <button class="submit-btn" (click)="submit()" [disabled]="!selected() || saving()">
                        {{ saving() ? 'Зберігаю…' : (myRating() ? 'Оновити відгук' : 'Опублікувати відгук') }}
                    </button>
                </div>
            }

            @if (comments().length > 0) {
                <ul class="comments">
                    @for (review of comments(); track review.id) {
                        <li class="comment">
                            @if (review.avatarUrl) {
                                <img class="c-avatar" [src]="review.avatarUrl" alt="" referrerpolicy="no-referrer">
                            } @else {
                                <span class="c-avatar c-fallback material-symbols-outlined">account_circle</span>
                            }
                            <div class="c-body">
                                <div class="c-head">
                                    <span class="c-name">{{ review.displayName || 'Учасник' }}</span>
                                    <app-rating-stars [rating]="review.rating" [compact]="true" />
                                </div>
                                <p class="c-text">{{ review.comment }}</p>
                            </div>
                        </li>
                    }
                </ul>
            } @else if (!canRate()) {
                <p class="no-reviews">Ще немає відгуків.</p>
            }
        </section>
    `,
    styles: [`
        :host { display: block; }
        .ratings { border-top: 1px solid var(--color-border-light); padding-top: var(--space-5); margin-top: var(--space-4); }
        .ratings-head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--space-3); margin-bottom: var(--space-4); }
        .ratings-title { font-family: var(--font-display); font-size: var(--text-lg); font-weight: var(--weight-semibold); margin: 0; color: var(--color-text-primary); }
        .agg { display: inline-flex; align-items: center; gap: var(--space-2); }
        .agg-value { font-weight: var(--weight-bold); color: var(--color-text-primary); }
        .agg-count { font-size: var(--text-sm); color: var(--color-text-tertiary); }
        .rate-box {
            background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg);
            padding: var(--space-4); margin-bottom: var(--space-5); display: flex; flex-direction: column; gap: var(--space-3);
        }
        .rate-label { font-size: var(--text-sm); font-weight: var(--weight-medium); color: var(--color-text-secondary); }
        .star-input { display: flex; gap: 2px; }
        .star-btn { border: none; background: none; cursor: pointer; padding: 2px; color: var(--color-border); transition: color var(--transition-fast), transform var(--transition-spring); }
        .star-btn .material-symbols-outlined { font-size: 30px; }
        .star-btn.on { color: var(--color-warning); font-variation-settings: 'FILL' 1; }
        .star-btn:hover { transform: scale(1.15); }
        .comment-input {
            width: 100%; padding: 10px 12px; border: 1px solid var(--color-border); border-radius: var(--radius-md);
            background: var(--color-bg); color: var(--color-text-primary); font-family: var(--font-body); font-size: var(--text-base); resize: vertical;
        }
        .comment-input:focus { outline: 2px solid var(--color-accent); border-color: transparent; }
        .submit-btn {
            align-self: flex-start; padding: 10px 18px; border: none; border-radius: var(--radius-full);
            background: var(--color-accent); color: var(--color-text-inverse); font-weight: var(--weight-semibold); cursor: pointer;
        }
        .submit-btn:disabled { opacity: 0.55; cursor: not-allowed; }
        .comments { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--space-4); }
        .comment { display: flex; gap: var(--space-3); }
        .c-avatar { width: 40px; height: 40px; border-radius: var(--radius-full); object-fit: cover; flex: none; }
        .c-fallback { display: grid; place-items: center; font-size: 28px; color: var(--color-text-tertiary); background: var(--color-surface-hover); }
        .c-body { min-width: 0; }
        .c-head { display: flex; align-items: center; gap: var(--space-2); }
        .c-name { font-weight: var(--weight-semibold); color: var(--color-text-primary); font-size: var(--text-sm); }
        .c-text { margin: 2px 0 0; color: var(--color-text-secondary); font-size: var(--text-sm); line-height: var(--leading-relaxed); }
        .no-reviews { color: var(--color-text-tertiary); font-size: var(--text-sm); }
    `],
})
export class DishRatingsComponent {
    readonly dishId = input.required<string>();
    readonly familyId = input.required<string>();

    private readonly ratingService = inject(RatingService);
    private readonly auth = inject(AuthService);
    private readonly toast = inject(ToastService);

    protected readonly hover = signal(0);
    protected readonly selected = signal(0);
    protected comment = '';
    protected readonly saving = signal(false);

    protected readonly ratings = this.ratingService.ratings;
    protected readonly comments = this.ratingService.comments;
    protected readonly myRating = this.ratingService.myRating;

    protected readonly average = computed(() => {
        const list = this.ratings();
        if (!list.length) return 0;
        return list.reduce((sum, r) => sum + r.rating, 0) / list.length;
    });
    protected readonly count = computed(() => this.ratings().length);

    protected readonly canRate = computed(() =>
        this.auth.isSuperAdmin() || this.auth.familyRole(this.familyId()) !== null,
    );

    constructor() {
        effect(() => {
            const id = this.dishId();
            // Reset the input when switching dishes; prefill effect refills from myRating.
            this.selected.set(0);
            this.hover.set(0);
            this.comment = '';
            if (id) {
                void this.ratingService.load(id);
            }
        });
        // Prefill the input from an existing rating.
        effect(() => {
            const mine = this.myRating();
            if (mine && this.selected() === 0) {
                this.selected.set(mine.rating);
                this.comment = mine.comment ?? '';
            }
        });
    }

    protected async submit(): Promise<void> {
        if (!this.selected()) return;
        this.saving.set(true);
        const { error } = await this.ratingService.rate(this.dishId(), this.selected(), this.comment);
        this.saving.set(false);
        this.toast.show(error ? `Помилка: ${error.message}` : 'Дякуємо за відгук ✨', error ? 'error' : 'success');
    }

    protected pluralReviews(count: number): string {
        const mod10 = count % 10, mod100 = count % 100;
        if (mod10 === 1 && mod100 !== 11) return 'відгук';
        if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'відгуки';
        return 'відгуків';
    }
}
