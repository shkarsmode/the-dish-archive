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
        <section class="ratings" id="reviews">
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

            @if (count() > 0) {
                <div class="rating-dist">
                    @for (row of distributionRows(); track row.star) {
                        <div class="dist-row">
                            <span class="dist-star">{{ row.star }}<span class="material-symbols-outlined">star</span></span>
                            <span class="dist-track"><span class="dist-fill" [style.width.%]="row.pct"></span></span>
                            <span class="dist-n">{{ row.n }}</span>
                        </div>
                    }
                </div>
            }

            <!-- My review: displayed inline, edited in place -->
            @if (canRate()) {
                <div class="my-review">
                    @if (myRating() && !editing()) {
                        <div class="mr-view">
                            <div class="mr-top">
                                <span class="mr-label">Ваш відгук</span>
                                <button type="button" class="mr-edit" (click)="startEdit()">
                                    <span class="material-symbols-outlined">edit</span> Редагувати
                                </button>
                            </div>
                            <app-rating-stars [rating]="myRating()!.rating" />
                            @if (myRating()!.comment) { <p class="mr-text">{{ myRating()!.comment }}</p> }
                        </div>
                    } @else {
                        <div class="mr-form">
                            <span class="rate-label">{{ myRating() ? 'Редагувати відгук' : 'Оцініть страву' }}</span>
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
                            <div class="form-actions">
                                <button class="submit-btn" (click)="submit()" [disabled]="!selected() || saving()">
                                    {{ saving() ? 'Зберігаю…' : (myRating() ? 'Оновити' : 'Опублікувати') }}
                                </button>
                                @if (editing()) {
                                    <button class="cancel-btn" (click)="cancelEdit()" [disabled]="saving()">Скасувати</button>
                                }
                            </div>
                        </div>
                    }
                </div>
            }

            @if (otherComments().length > 0) {
                <ul class="comments">
                    @for (review of otherComments(); track review.id) {
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
            } @else if (!canRate() && count() === 0) {
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
        .rating-dist { display: flex; flex-direction: column; gap: 5px; margin: 0 0 var(--space-5); max-width: 340px; }
        .dist-row { display: flex; align-items: center; gap: var(--space-2); }
        .dist-star { display: inline-flex; align-items: center; gap: 1px; width: 28px; font-size: var(--text-xs); color: var(--color-text-secondary); font-variant-numeric: tabular-nums; }
        .dist-star .material-symbols-outlined { font-size: 13px; color: var(--color-warning); font-variation-settings: 'FILL' 1; }
        .dist-track { flex: 1; height: 7px; border-radius: var(--radius-full); background: var(--color-surface-active); overflow: hidden; }
        .dist-fill { display: block; height: 100%; border-radius: var(--radius-full); background: var(--color-warning); transition: width 0.55s var(--ease-out-expo, ease); }
        .dist-n { width: 20px; text-align: right; font-size: var(--text-xs); color: var(--color-text-tertiary); font-variant-numeric: tabular-nums; }
        .my-review {
            background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg);
            padding: var(--space-4); margin-bottom: var(--space-5);
        }
        .mr-view { display: flex; flex-direction: column; gap: var(--space-2); }
        .mr-top { display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); }
        .mr-label { font-size: var(--text-xs); font-weight: var(--weight-semibold); text-transform: uppercase; letter-spacing: 0.04em; color: var(--color-accent-dark); }
        .mr-edit {
            display: inline-flex; align-items: center; gap: 4px; border: none; background: none; cursor: pointer;
            color: var(--color-text-secondary); font-size: var(--text-sm); font-weight: var(--weight-medium); padding: 4px 6px; border-radius: var(--radius-sm);
        }
        .mr-edit:hover { color: var(--color-accent); background: var(--color-surface-hover); }
        .mr-edit .material-symbols-outlined { font-size: 16px; }
        .mr-text { margin: 0; color: var(--color-text-secondary); font-size: var(--text-sm); line-height: var(--leading-relaxed); }

        .mr-form { display: flex; flex-direction: column; gap: var(--space-3); }
        .rate-label { font-size: var(--text-sm); font-weight: var(--weight-medium); color: var(--color-text-secondary); }
        .star-input { display: flex; gap: 2px; }
        .star-btn { border: none; background: none; cursor: pointer; padding: 2px; color: var(--color-border); transition: color var(--transition-fast), transform var(--transition-spring); }
        .star-btn .material-symbols-outlined { font-size: 30px; }
        .star-btn.on { color: var(--color-warning); font-variation-settings: 'FILL' 1; }
        @media (hover: hover) and (pointer: fine) { .star-btn:hover { transform: scale(1.15); } }
        .star-btn:active { transform: scale(1.1); }
        .comment-input {
            width: 100%; padding: 10px 12px; border: 1px solid var(--color-border); border-radius: var(--radius-md);
            background: var(--color-bg); color: var(--color-text-primary); font-family: var(--font-body); font-size: var(--text-base); resize: vertical;
        }
        .comment-input:focus { outline: 2px solid var(--color-accent); border-color: transparent; }
        .form-actions { display: flex; gap: var(--space-2); }
        .submit-btn {
            padding: 10px 18px; border: none; border-radius: var(--radius-full);
            background: var(--color-accent); color: var(--color-text-inverse); font-weight: var(--weight-semibold); cursor: pointer;
        }
        .submit-btn:disabled { opacity: 0.55; cursor: not-allowed; }
        .cancel-btn {
            padding: 10px 18px; border: none; border-radius: var(--radius-full);
            background: var(--color-surface-active); color: var(--color-text-secondary); font-weight: var(--weight-semibold); cursor: pointer;
        }
        .cancel-btn:disabled { opacity: 0.55; cursor: not-allowed; }
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
    protected readonly editing = signal(false);

    protected readonly ratings = this.ratingService.ratings;
    protected readonly comments = this.ratingService.comments;
    protected readonly myRating = this.ratingService.myRating;
    protected readonly average = this.ratingService.average;
    protected readonly count = this.ratingService.count;

    /** Everyone else's comments (mine renders in the "your review" card above). */
    protected readonly otherComments = computed(() => {
        const uid = this.auth.user()?.id;
        return this.comments().filter(review => review.userId !== uid);
    });

    /** Distribution rows 5★→1★ with a percentage width for the bar. */
    protected readonly distributionRows = computed(() => {
        const dist = this.ratingService.distribution();
        const total = this.count() || 1;
        return dist.map((n, i) => ({ star: 5 - i, n, pct: Math.round((n / total) * 100) }));
    });

    protected readonly canRate = computed(() =>
        this.auth.isSuperAdmin() || this.auth.familyRole(this.familyId()) !== null,
    );

    constructor() {
        // Reset the composer + load reviews when the dish changes. The composer
        // starts empty for a new review; editing an existing one prefills via startEdit().
        effect(() => {
            const id = this.dishId();
            this.selected.set(0);
            this.hover.set(0);
            this.comment = '';
            this.editing.set(false);
            if (id) {
                void this.ratingService.load(id);
            }
        });
    }

    protected startEdit(): void {
        const mine = this.myRating();
        if (!mine) return;
        this.selected.set(mine.rating);
        this.comment = mine.comment ?? '';
        this.editing.set(true);
    }

    protected cancelEdit(): void {
        this.editing.set(false);
    }

    protected async submit(): Promise<void> {
        if (!this.selected()) return;
        this.saving.set(true);
        const { error } = await this.ratingService.rate(this.dishId(), this.selected(), this.comment);
        this.saving.set(false);
        if (!error) this.editing.set(false);
        this.toast.show(error ? `Помилка: ${error.message}` : 'Дякуємо за відгук ✨', error ? 'error' : 'success');
    }

    protected pluralReviews(count: number): string {
        const mod10 = count % 10, mod100 = count % 100;
        if (mod10 === 1 && mod100 !== 11) return 'відгук';
        if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'відгуки';
        return 'відгуків';
    }
}
