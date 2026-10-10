import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { ImportIssue, RecipeImportResult } from '../../../core/services/ai.service';
import { PLATFORM_LABELS, PlatformIconComponent } from './platform-icon.component';

const SEVERITY_ICON: Record<ImportIssue['severity'], string> = {
    missing: 'error',
    unclear: 'help',
    conflict: 'warning',
    assumed: 'lightbulb',
};

const CONFIDENCE: Record<RecipeImportResult['confidence'], { label: string; tone: string }> = {
    high: { label: 'Рецепт повний', tone: 'good' },
    medium: { label: 'Є що уточнити', tone: 'mid' },
    low: { label: 'Чорновий варіант', tone: 'low' },
};

/**
 * Summary shown on top of the filled form after an AI import: where it came from,
 * what was recognised, and a checklist of gaps the cook should fix before saving.
 * Each issue jumps to (and highlights) the field it is about.
 */
@Component({
    selector: 'app-import-review',
    imports: [PlatformIconComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <section class="review" [attr.data-tone]="confidence().tone">
            <header class="head">
                <span class="badge"><span class="material-symbols-outlined">auto_awesome</span></span>
                <div class="head-copy">
                    <h2>Рецепт готовий до перевірки</h2>
                    <p>
                        <span class="source">
                            <app-platform-icon [platform]="result().source.platform" />
                            {{ sourceLabel() }}
                        </span>
                        <span class="pill" [attr.data-tone]="confidence().tone">{{ confidence().label }}</span>
                    </p>
                </div>
                <button type="button" class="icon" (click)="dismiss.emit()" aria-label="Сховати підсумок">
                    <span class="material-symbols-outlined">close</span>
                </button>
            </header>

            <ul class="stats">
                <li><span class="material-symbols-outlined">grocery</span>{{ result().ingredients.length }} {{ plural(result().ingredients.length, 'інгредієнт', 'інгредієнти', 'інгредієнтів') }}</li>
                <li><span class="material-symbols-outlined">format_list_numbered</span>{{ result().steps.length }} {{ plural(result().steps.length, 'крок', 'кроки', 'кроків') }}</li>
                @if (result().cookingTime.total) {
                    <li><span class="material-symbols-outlined">schedule</span>{{ result().cookingTime.total }} хв</li>
                }
                @if (result().servings) {
                    <li><span class="material-symbols-outlined">restaurant</span>{{ result().servings }} {{ plural(result().servings, 'порція', 'порції', 'порцій') }}</li>
                }
                @if (result().images.length) {
                    <li><span class="material-symbols-outlined">image</span>фото додано</li>
                }
            </ul>

            @if (issues().length) {
                <p class="check-title">Перевірте перед збереженням · {{ issues().length }}</p>
                <ul class="issues">
                    @for (issue of issues(); track $index) {
                        <li>
                            <button type="button" [attr.data-severity]="issue.severity" (click)="jump.emit(issue)">
                                <span class="material-symbols-outlined sev">{{ icon(issue) }}</span>
                                <span class="msg">{{ issue.message }}</span>
                                <span class="material-symbols-outlined go">chevron_right</span>
                            </button>
                        </li>
                    }
                </ul>
            } @else {
                <p class="all-good">
                    <span class="material-symbols-outlined">task_alt</span>
                    Усе на місці: кількості, кроки й час. Перегляньте і збережіть.
                </p>
            }

            <footer class="foot">
                @if (result().source.url) {
                    <a [href]="result().source.url" target="_blank" rel="noopener noreferrer">
                        <span class="material-symbols-outlined">open_in_new</span> Оригінал
                    </a>
                }
                <button type="button" (click)="restart.emit()">
                    <span class="material-symbols-outlined">restart_alt</span> Інше джерело
                </button>
            </footer>
        </section>
    `,
    styles: `
        :host { display: block; animation: rise 420ms var(--ease-out-expo) both; }
        @keyframes rise { from { transform: translateY(10px); } to { transform: none; } }
        .review {
            padding: var(--space-5);
            border-radius: var(--radius-xl);
            border: 1px solid color-mix(in srgb, var(--color-accent) 40%, var(--color-border));
            background:
                radial-gradient(100% 70% at 100% 0%, color-mix(in srgb, var(--color-accent) 14%, transparent), transparent 60%),
                var(--color-surface);
            box-shadow: var(--shadow-card);
        }
        .head { display: flex; align-items: flex-start; gap: var(--space-3); }
        .badge {
            width: 40px; height: 40px; flex: none; display: grid; place-items: center; border-radius: var(--radius-md);
            background: linear-gradient(135deg, var(--color-accent), var(--color-accent-hover)); color: var(--color-text-inverse);
        }
        .head-copy { flex: 1; min-width: 0; }
        h2 { margin: 0; font-family: var(--font-display); font-size: var(--text-lg); font-weight: var(--weight-semibold); color: var(--color-text-primary); }
        .head-copy p { margin: 4px 0 0; display: flex; flex-wrap: wrap; align-items: center; gap: 8px; font-size: var(--text-sm); color: var(--color-text-secondary); }
        .source { display: inline-flex; align-items: center; gap: 5px; min-width: 0; }
        .pill { padding: 2px 9px; border-radius: var(--radius-full); font-size: var(--text-xs); font-weight: var(--weight-semibold); }
        .pill[data-tone='good'] { background: var(--color-success-light); color: var(--color-success); }
        .pill[data-tone='mid'] { background: var(--color-warning-light); color: var(--color-warning); }
        .pill[data-tone='low'] { background: var(--color-error-light); color: var(--color-error); }
        .icon { width: 36px; height: 36px; flex: none; display: grid; place-items: center; border-radius: 50%; color: var(--color-text-tertiary); }
        .icon:hover { background: var(--color-surface-hover); color: var(--color-text-primary); }

        .stats { list-style: none; margin: var(--space-4) 0 0; padding: 0; display: flex; flex-wrap: wrap; gap: 6px; }
        .stats li {
            display: inline-flex; align-items: center; gap: 5px; padding: 6px 11px; border-radius: var(--radius-full);
            background: var(--color-bg); border: 1px solid var(--color-border-light);
            font-size: var(--text-sm); color: var(--color-text-primary); font-weight: var(--weight-medium);
            animation: chip 380ms var(--ease-out-expo) both;
        }
        .stats li:nth-child(2) { animation-delay: 60ms; }
        .stats li:nth-child(3) { animation-delay: 120ms; }
        .stats li:nth-child(4) { animation-delay: 180ms; }
        .stats li:nth-child(5) { animation-delay: 240ms; }
        @keyframes chip { from { transform: scale(0.85); } to { transform: none; } }
        .stats .material-symbols-outlined { font-size: 17px; color: var(--color-accent); }

        .check-title { margin: var(--space-5) 0 var(--space-2); font-size: var(--text-sm); font-weight: var(--weight-semibold); color: var(--color-text-primary); }
        .issues { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
        .issues button {
            width: 100%; display: flex; align-items: center; gap: var(--space-3); padding: 11px 12px; text-align: left;
            border-radius: var(--radius-md); background: var(--color-bg); border: 1px solid var(--color-border-light);
            font-size: var(--text-sm); line-height: var(--leading-snug); color: var(--color-text-primary);
            transition: border-color var(--transition-base), transform var(--transition-base);
        }
        .issues button:hover { border-color: var(--color-accent); }
        .issues button:active { transform: scale(0.99); }
        .sev { font-size: 20px; flex: none; }
        [data-severity='missing'] .sev { color: var(--color-warning); }
        [data-severity='conflict'] .sev { color: var(--color-error); }
        [data-severity='unclear'] .sev { color: var(--color-accent); }
        [data-severity='assumed'] .sev { color: var(--color-secondary); }
        .msg { flex: 1; }
        .go { font-size: 18px; color: var(--color-text-tertiary); }
        .all-good {
            margin: var(--space-4) 0 0; display: flex; align-items: center; gap: var(--space-2); padding: 11px 12px;
            border-radius: var(--radius-md); background: var(--color-success-light); color: var(--color-success); font-size: var(--text-sm);
        }
        .foot { display: flex; justify-content: flex-end; gap: var(--space-2); margin-top: var(--space-4); }
        .foot a, .foot button {
            display: inline-flex; align-items: center; gap: 5px; padding: 7px 12px; border-radius: var(--radius-full);
            font-size: var(--text-sm); color: var(--color-text-secondary);
        }
        .foot a:hover, .foot button:hover { background: var(--color-surface-hover); color: var(--color-text-primary); }
        .foot .material-symbols-outlined { font-size: 17px; }
    `,
})
export class ImportReviewComponent {
    readonly result = input.required<RecipeImportResult>();
    readonly jump = output<ImportIssue>();
    readonly dismiss = output<void>();
    readonly restart = output<void>();

    protected readonly issues = computed(() => this.result().issues ?? []);
    protected readonly confidence = computed(() => CONFIDENCE[this.result().confidence] ?? CONFIDENCE.medium);
    protected readonly sourceLabel = computed(() => {
        const source = this.result().source;
        const platform = PLATFORM_LABELS[source.platform] ?? 'Сайт';
        if (source.author && source.platform !== 'website') return `${source.author} · ${platform}`;
        if (source.platform === 'website' && source.url) {
            try {
                return new URL(source.url).hostname.replace(/^www\./, '');
            } catch {
                return platform;
            }
        }
        return platform;
    });

    protected icon(issue: ImportIssue): string {
        return SEVERITY_ICON[issue.severity] ?? 'help';
    }

    /** Ukrainian plural: 1 крок, 2 кроки, 5 кроків. */
    protected plural(n: number, one: string, few: string, many: string): string {
        const mod10 = n % 10;
        const mod100 = n % 100;
        if (mod10 === 1 && mod100 !== 11) return one;
        if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
        return many;
    }
}
