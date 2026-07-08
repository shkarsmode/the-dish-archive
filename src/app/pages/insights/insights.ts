import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
    ALL_TASTE_KEYS,
    CATEGORY_LABELS,
    DIFFICULTY_LABELS,
    Dish,
    DishCategory,
    DishDifficulty,
    TASTE_LABELS,
    TasteProfile,
} from '../../core/models/dish.model';
import { DishService } from '../../core/services/dish.service';
import { FamilyService } from '../../core/services/family.service';
import { TasteRadarComponent } from '../../shared/components/taste-radar.component';
import { RatingStarsComponent } from '../../shared/components/rating-stars.component';

interface Bar { key: string; label: string; value: number; pct: number; color?: string; }

/** "Смачна аналітика" — a beautiful insights dashboard over the visible recipe collection. */
@Component({
    selector: 'app-insights',
    imports: [RouterLink, TasteRadarComponent, RatingStarsComponent],
    template: `
        <header class="ins-header">
            <a routerLink="/" class="icon-btn" aria-label="До каталогу"><span class="material-symbols-outlined">arrow_back</span></a>
            <div>
                <h1 class="ins-title">Смачна аналітика</h1>
                <p class="ins-sub">{{ dishes().length }} {{ pluralRecipes(dishes().length) }} у вашій колекції</p>
            </div>
        </header>

        @if (dishes().length === 0) {
            <div class="ins-empty">
                <span class="material-symbols-outlined">insights</span>
                <p>Додайте рецепти — і тут зʼявиться краса в цифрах.</p>
            </div>
        } @else {
            <div class="ins-body">
                <!-- KPI tiles -->
                <section class="kpis">
                    @for (kpi of kpis(); track kpi.label) {
                        <div class="kpi" [style.--tint]="kpi.tint">
                            <span class="kpi-icon material-symbols-outlined">{{ kpi.icon }}</span>
                            <span class="kpi-value">{{ kpi.value }}</span>
                            <span class="kpi-label">{{ kpi.label }}</span>
                        </div>
                    }
                </section>

                <div class="grid-2">
                    <!-- Aggregate taste radar -->
                    <section class="card">
                        <h2 class="card-title">Смаковий профіль колекції</h2>
                        <app-taste-radar [tasteProfile]="avgTaste()" />
                    </section>

                    <!-- Category distribution -->
                    <section class="card">
                        <h2 class="card-title">Категорії</h2>
                        <div class="bars">
                            @for (bar of categoryBars(); track bar.key) {
                                <div class="bar-row">
                                    <span class="bar-label">{{ bar.label }}</span>
                                    <span class="bar-track"><span class="bar-fill" [style.width.%]="bar.pct"></span></span>
                                    <span class="bar-value">{{ bar.value }}</span>
                                </div>
                            }
                        </div>
                    </section>
                </div>

                <div class="grid-2">
                    <!-- Cook-time histogram -->
                    <section class="card">
                        <h2 class="card-title">Час приготування</h2>
                        <div class="hist">
                            @for (b of timeBuckets(); track b.key) {
                                <div class="hist-col">
                                    <span class="hist-bar-wrap">
                                        <span class="hist-bar" [style.height.%]="b.pct"></span>
                                    </span>
                                    <span class="hist-n">{{ b.value }}</span>
                                    <span class="hist-label">{{ b.label }}</span>
                                </div>
                            }
                        </div>
                    </section>

                    <!-- Difficulty -->
                    <section class="card">
                        <h2 class="card-title">Складність</h2>
                        <div class="bars">
                            @for (bar of difficultyBars(); track bar.key) {
                                <div class="bar-row">
                                    <span class="bar-label">{{ bar.label }}</span>
                                    <span class="bar-track"><span class="bar-fill" [style.width.%]="bar.pct" [style.background]="bar.color"></span></span>
                                    <span class="bar-value">{{ bar.value }}</span>
                                </div>
                            }
                        </div>
                    </section>
                </div>

                <div class="grid-2">
                    <!-- Top rated -->
                    <section class="card">
                        <h2 class="card-title">Найвищий рейтинг</h2>
                        <ol class="top-list">
                            @for (d of topRated(); track d.id) {
                                <li>
                                    <a [routerLink]="['/dish', d.slug]" class="top-row">
                                        <span class="top-thumb" [style.background-image]="thumb(d)"></span>
                                        <span class="top-name">{{ d.title }}</span>
                                        <span class="top-metric">
                                            <app-rating-stars [rating]="ratingOf(d)" [compact]="true" />
                                            <span class="top-num">{{ ratingOf(d).toFixed(1) }}</span>
                                        </span>
                                    </a>
                                </li>
                            }
                        </ol>
                    </section>

                    <!-- Most liked -->
                    <section class="card">
                        <h2 class="card-title">Найбільше вподобань</h2>
                        <ol class="top-list">
                            @for (d of mostLiked(); track d.id) {
                                <li>
                                    <a [routerLink]="['/dish', d.slug]" class="top-row">
                                        <span class="top-thumb" [style.background-image]="thumb(d)"></span>
                                        <span class="top-name">{{ d.title }}</span>
                                        <span class="top-metric like"><span class="material-symbols-outlined">favorite</span>{{ d.likeCount }}</span>
                                    </a>
                                </li>
                            }
                        </ol>
                    </section>
                </div>
            </div>
        }
    `,
    styles: [`
        :host { display: block; min-height: 100dvh; background: var(--color-bg); }
        .ins-header {
            display: flex; align-items: center; gap: var(--space-3);
            max-width: 960px; margin: 0 auto; padding: var(--space-6) var(--space-4) var(--space-4);
        }
        .icon-btn { width: 42px; height: 42px; flex: none; border: none; cursor: pointer; display: grid; place-items: center; border-radius: var(--radius-full); background: var(--color-surface-hover); color: var(--color-text-secondary); }
        .ins-title { font-family: var(--font-display); font-size: var(--text-2xl); font-weight: var(--weight-bold); margin: 0; color: var(--color-text-primary); }
        .ins-sub { margin: 2px 0 0; font-size: var(--text-sm); color: var(--color-text-tertiary); }
        .ins-empty { display: grid; place-items: center; gap: var(--space-3); min-height: 60dvh; color: var(--color-text-tertiary); text-align: center; }
        .ins-empty .material-symbols-outlined { font-size: 48px; opacity: 0.6; }

        .ins-body { max-width: 960px; margin: 0 auto; padding: 0 var(--space-4) var(--space-16); display: flex; flex-direction: column; gap: var(--space-5); }

        .kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: var(--space-3); }
        .kpi {
            display: flex; flex-direction: column; gap: 2px; padding: var(--space-4) var(--space-5);
            background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); box-shadow: var(--shadow-card);
        }
        .kpi-icon {
            font-size: 22px; color: var(--tint, var(--color-accent)); width: 40px; height: 40px; display: grid; place-items: center;
            border-radius: var(--radius-md); background: color-mix(in srgb, var(--tint, var(--color-accent)) 14%, transparent); margin-bottom: var(--space-2);
        }
        .kpi-value { font-family: var(--font-display); font-size: var(--text-3xl); font-weight: var(--weight-bold); color: var(--color-text-primary); line-height: 1; font-variant-numeric: tabular-nums; }
        .kpi-label { font-size: var(--text-sm); color: var(--color-text-secondary); }

        .grid-2 { display: grid; grid-template-columns: 1fr; gap: var(--space-5); }
        @media (min-width: 768px) { .grid-2 { grid-template-columns: 1fr 1fr; } }

        .card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--space-5); box-shadow: var(--shadow-card); }
        .card-title { font-family: var(--font-display); font-size: var(--text-md); font-weight: var(--weight-semibold); margin: 0 0 var(--space-4); color: var(--color-text-primary); }

        .bars { display: flex; flex-direction: column; gap: var(--space-3); }
        .bar-row { display: flex; align-items: center; gap: var(--space-3); }
        .bar-label { width: 96px; flex: none; font-size: var(--text-sm); color: var(--color-text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .bar-track { flex: 1; height: 10px; border-radius: var(--radius-full); background: var(--color-surface-active); overflow: hidden; }
        .bar-fill { display: block; height: 100%; border-radius: var(--radius-full); background: var(--color-accent); transition: width 0.6s var(--ease-out-expo, ease); }
        .bar-value { width: 26px; text-align: right; font-size: var(--text-sm); font-weight: var(--weight-semibold); color: var(--color-text-primary); font-variant-numeric: tabular-nums; }

        .hist { display: flex; align-items: flex-end; justify-content: space-around; gap: var(--space-2); height: 160px; }
        .hist-col { display: flex; flex-direction: column; align-items: center; gap: 6px; flex: 1; height: 100%; justify-content: flex-end; }
        .hist-bar-wrap { flex: 1; width: 100%; max-width: 46px; display: flex; align-items: flex-end; }
        .hist-bar { width: 100%; min-height: 4px; border-radius: var(--radius-sm) var(--radius-sm) 0 0; background: linear-gradient(var(--color-accent), var(--color-accent-dark)); transition: height 0.6s var(--ease-out-expo, ease); }
        .hist-n { font-size: var(--text-sm); font-weight: var(--weight-semibold); color: var(--color-text-primary); }
        .hist-label { font-size: 10px; color: var(--color-text-tertiary); text-align: center; }

        .top-list { list-style: none; margin: 0; padding: 0; counter-reset: rank; display: flex; flex-direction: column; }
        .top-list li { counter-increment: rank; border-bottom: 1px solid var(--color-border-light); }
        .top-list li:last-child { border-bottom: none; }
        .top-row { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-2) 0; color: inherit; }
        .top-row::before { content: counter(rank); width: 20px; flex: none; text-align: center; font-family: var(--font-display); font-weight: var(--weight-bold); color: var(--color-text-tertiary); }
        .top-thumb { width: 40px; height: 40px; flex: none; border-radius: var(--radius-md); background-size: cover; background-position: center; background-color: var(--color-surface-hover); }
        .top-name { flex: 1; min-width: 0; font-size: var(--text-sm); font-weight: var(--weight-medium); color: var(--color-text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .top-metric { display: inline-flex; align-items: center; gap: 4px; flex: none; font-size: var(--text-sm); color: var(--color-text-secondary); }
        .top-num { font-weight: var(--weight-semibold); color: var(--color-text-primary); font-variant-numeric: tabular-nums; }
        .top-metric.like .material-symbols-outlined { font-size: 17px; color: var(--color-favorite, #E25555); font-variation-settings: 'FILL' 1; }
    `],
})
export class InsightsPage {
    private readonly dishService = inject(DishService);
    private readonly familyService = inject(FamilyService);

    protected readonly dishes = this.dishService.allDishes;

    protected ratingOf(d: Dish): number { return d.ratingCount > 0 ? d.ratingAverage : d.rating; }
    protected thumb(d: Dish): string {
        const url = d.images.find(i => i.isPrimary)?.url ?? d.images[0]?.url;
        return url ? `url("${url}")` : 'none';
    }

    protected readonly kpis = computed(() => {
        const all = this.dishes();
        const totalLikes = all.reduce((s, d) => s + d.likeCount, 0);
        const cookHours = Math.round(all.reduce((s, d) => s + d.cookingTime.total, 0) / 60);
        const rated = all.filter(d => this.ratingOf(d) > 0);
        const avg = rated.length ? (rated.reduce((s, d) => s + this.ratingOf(d), 0) / rated.length) : 0;
        const families = new Set(all.map(d => d.familyId)).size;
        return [
            { label: 'Рецептів', value: all.length, icon: 'restaurant', tint: '#B8926A' },
            { label: 'Середній рейтинг', value: avg ? avg.toFixed(1) : '—', icon: 'star', tint: '#D4A843' },
            { label: 'Вподобань', value: totalLikes, icon: 'favorite', tint: '#E25555' },
            { label: 'Годин на кухні', value: cookHours, icon: 'schedule', tint: '#7B8E6F' },
            { label: 'Родин', value: families, icon: 'diversity_3', tint: '#8a6db8' },
        ];
    });

    protected readonly avgTaste = computed<TasteProfile>(() => {
        const all = this.dishes();
        const sums = { sweet: 0, salty: 0, sour: 0, bitter: 0, spicy: 0, umami: 0 } as TasteProfile;
        if (!all.length) return sums;
        for (const d of all) {
            for (const key of ALL_TASTE_KEYS) sums[key] += d.tasteProfile?.[key] ?? 0;
        }
        for (const key of ALL_TASTE_KEYS) sums[key] = Math.round((sums[key] / all.length) * 10) / 10;
        return sums;
    });

    protected readonly categoryBars = computed<Bar[]>(() => {
        const counts = new Map<DishCategory, number>();
        for (const d of this.dishes()) {
            for (const c of d.categories) counts.set(c, (counts.get(c) ?? 0) + 1);
        }
        const entries = [...counts.entries()].sort((a, b) => b[1] - a[1]);
        const max = entries[0]?.[1] ?? 1;
        return entries.map(([key, value]) => ({
            key, label: CATEGORY_LABELS[key] ?? key, value, pct: Math.round((value / max) * 100),
        }));
    });

    protected readonly difficultyBars = computed<Bar[]>(() => {
        const order: DishDifficulty[] = ['easy', 'medium', 'hard'];
        const colors: Record<DishDifficulty, string> = {
            easy: 'var(--color-success)', medium: 'var(--color-warning)', hard: 'var(--color-error)',
        };
        const counts = new Map<DishDifficulty, number>();
        for (const d of this.dishes()) counts.set(d.difficulty, (counts.get(d.difficulty) ?? 0) + 1);
        const max = Math.max(1, ...order.map(k => counts.get(k) ?? 0));
        return order.map(key => ({
            key, label: DIFFICULTY_LABELS[key], value: counts.get(key) ?? 0,
            pct: Math.round(((counts.get(key) ?? 0) / max) * 100), color: colors[key],
        }));
    });

    protected readonly timeBuckets = computed<Bar[]>(() => {
        const defs = [
            { key: 'q', label: '≤15 хв', test: (t: number) => t >= 0 && t <= 15 },
            { key: 'h', label: '15–30', test: (t: number) => t > 15 && t <= 30 },
            { key: 'o', label: '30–60', test: (t: number) => t > 30 && t <= 60 },
            { key: 'l', label: '60+ хв', test: (t: number) => t > 60 },
        ];
        const counts = defs.map(d => this.dishes().filter(dish => d.test(dish.cookingTime.total)).length);
        const max = Math.max(1, ...counts);
        return defs.map((d, i) => ({ key: d.key, label: d.label, value: counts[i], pct: Math.round((counts[i] / max) * 100) }));
    });

    protected readonly topRated = computed(() =>
        [...this.dishes()].filter(d => this.ratingOf(d) > 0)
            .sort((a, b) => this.ratingOf(b) - this.ratingOf(a) || b.ratingCount - a.ratingCount)
            .slice(0, 5),
    );

    protected readonly mostLiked = computed(() =>
        [...this.dishes()].filter(d => d.likeCount > 0)
            .sort((a, b) => b.likeCount - a.likeCount)
            .slice(0, 5),
    );

    protected pluralRecipes(n: number): string {
        const m10 = n % 10, m100 = n % 100;
        if (m10 === 1 && m100 !== 11) return 'рецепт';
        if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'рецепти';
        return 'рецептів';
    }
}
