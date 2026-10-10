import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, output, signal } from '@angular/core';
import { ImportPlatform, ImportPreview } from '../../../core/services/ai.service';
import { PLATFORM_LABELS, PlatformIconComponent } from './platform-icon.component';

export type ImportKind = 'link' | 'photo' | 'text';

interface Stage {
    label: string;
    /** Seconds after start when this stage becomes the current one. */
    at: number;
}

/**
 * What the user watches while the AI works: the source they gave (cover, title,
 * author or their photos), a checklist that advances through the stages, and a
 * progress bar that eases towards the end and completes when the answer lands.
 */
@Component({
    selector: 'app-import-progress',
    imports: [PlatformIconComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <section class="card" aria-live="polite" [attr.aria-busy]="!done()">
            <div class="source" [class.has-image]="!!coverImage()">
                @if (coverImage(); as image) {
                    <div class="source-backdrop" [style.background-image]="'url(' + image + ')'"></div>
                }
                <div class="source-body">
                    @if (kind() === 'photo') {
                        <div class="thumbs">
                            @for (photo of photos(); track $index) {
                                <img [src]="photo" alt="" [style.animation-delay.ms]="$index * 90" />
                            }
                        </div>
                    } @else if (kind() === 'text') {
                        <blockquote class="quote">{{ textSnippet() }}</blockquote>
                    } @else {
                        @if (coverImage(); as image) {
                            <img class="cover" [src]="image" alt="" />
                        } @else {
                            <div class="cover skeleton"></div>
                        }
                        <div class="meta">
                            <span class="platform">
                                <app-platform-icon [platform]="platform()" />
                                {{ platformLabel() }}
                            </span>
                            @if (preview()?.title; as title) {
                                <strong class="title">{{ title }}</strong>
                            } @else {
                                <span class="skeleton line"></span>
                            }
                            @if (preview()?.author; as author) {
                                <span class="author">{{ author }}</span>
                            } @else if (!preview()) {
                                <span class="skeleton line short"></span>
                            }
                        </div>
                    }
                </div>
                <div class="scan" aria-hidden="true"></div>
            </div>

            <ol class="stages">
                @for (stage of stages(); track stage.label; let i = $index) {
                    <li [class.done]="i < current()" [class.active]="i === current()">
                        <span class="dot">
                            @if (i < current()) {
                                <span class="material-symbols-outlined">check</span>
                            } @else if (i === current()) {
                                <span class="spinner"></span>
                            }
                        </span>
                        <span class="label">{{ stage.label }}</span>
                    </li>
                }
            </ol>

            <div class="bar" role="progressbar" [attr.aria-valuenow]="percent()" aria-valuemin="0" aria-valuemax="100">
                <span [style.width.%]="percent()"></span>
            </div>
            <p class="foot">
                {{ footnote() }}
            </p>
            <button type="button" class="cancel" (click)="cancel.emit()">Скасувати</button>
        </section>
    `,
    styles: `
        :host { display: block; }
        .card {
            position: relative;
            padding: var(--space-5);
            border-radius: var(--radius-xl);
            border: 1px solid color-mix(in srgb, var(--color-accent) 35%, var(--color-border));
            background: var(--color-surface);
            box-shadow: var(--shadow-card);
        }
        .source {
            position: relative;
            overflow: hidden;
            isolation: isolate;
            border-radius: var(--radius-lg);
            background: var(--color-bg);
            min-height: 112px;
        }
        .source-backdrop {
            position: absolute;
            inset: -20px;
            z-index: -1;
            background-size: cover;
            background-position: center;
            filter: blur(28px) saturate(1.2);
            opacity: 0.45;
            transform: scale(1.1);
        }
        .source-body {
            display: flex;
            align-items: center;
            gap: var(--space-4);
            padding: var(--space-4);
        }
        .cover {
            flex: none;
            width: 88px;
            height: 88px;
            border-radius: var(--radius-md);
            object-fit: cover;
            box-shadow: var(--shadow-md);
            animation: ken-burns 6s ease-in-out infinite alternate;
        }
        @keyframes ken-burns { from { transform: scale(1); } to { transform: scale(1.06); } }
        .meta { min-width: 0; display: flex; flex-direction: column; gap: 4px; flex: 1; }
        .platform {
            display: inline-flex; align-items: center; gap: 6px;
            font-size: var(--text-xs); font-weight: var(--weight-semibold);
            color: var(--color-accent-dark); text-transform: uppercase; letter-spacing: 0.05em;
        }
        .title {
            font-family: var(--font-display); font-size: var(--text-lg); line-height: var(--leading-snug);
            color: var(--color-text-primary);
            display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
        }
        .author { font-size: var(--text-sm); color: var(--color-text-secondary); }
        .thumbs { display: flex; gap: var(--space-2); flex-wrap: wrap; }
        .thumbs img {
            width: 72px; height: 96px; object-fit: cover; border-radius: var(--radius-md);
            box-shadow: var(--shadow-md); animation: pop 400ms var(--ease-out-expo) both;
        }
        @keyframes pop { from { transform: translateY(8px) scale(0.94); } to { transform: none; } }
        .quote {
            margin: 0; padding-left: var(--space-3); border-left: 3px solid var(--color-accent);
            font-size: var(--text-base); line-height: var(--leading-relaxed); color: var(--color-text-secondary);
            font-style: italic;
        }
        .scan {
            position: absolute; inset: 0; pointer-events: none;
            background: linear-gradient(100deg, transparent 35%, color-mix(in srgb, var(--color-accent) 22%, transparent) 50%, transparent 65%);
            animation: scan 2.2s ease-in-out infinite;
        }
        @keyframes scan { from { transform: translateX(-100%); } to { transform: translateX(100%); } }
        .skeleton {
            background: linear-gradient(90deg, var(--color-skeleton), var(--color-skeleton-shine), var(--color-skeleton));
            background-size: 200% 100%;
            animation: shimmer 1.4s linear infinite;
        }
        @keyframes shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }
        .line { display: block; height: 14px; width: 80%; border-radius: 6px; }
        .line.short { width: 40%; }

        .stages { list-style: none; margin: var(--space-5) 0 var(--space-4); padding: 0; display: flex; flex-direction: column; gap: 12px; }
        .stages li {
            display: flex; align-items: center; gap: var(--space-3);
            font-size: var(--text-base); color: var(--color-text-tertiary);
            transition: color var(--transition-slow);
        }
        .stages li.active { color: var(--color-text-primary); font-weight: var(--weight-medium); }
        .stages li.done { color: var(--color-text-secondary); }
        .dot {
            width: 24px; height: 24px; flex: none; display: grid; place-items: center; border-radius: 50%;
            border: 1.5px solid var(--color-border); transition: all var(--transition-slow);
        }
        .done .dot { background: var(--color-success); border-color: var(--color-success); color: #fff; animation: tick 300ms var(--ease-out-expo); }
        .done .dot .material-symbols-outlined { font-size: 16px; font-weight: 700; }
        .active .dot { border-color: var(--color-accent); }
        @keyframes tick { from { transform: scale(0.6); } to { transform: scale(1); } }
        .spinner {
            width: 14px; height: 14px; border-radius: 50%;
            border: 2px solid color-mix(in srgb, var(--color-accent) 30%, transparent);
            border-top-color: var(--color-accent);
            animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .bar { height: 6px; border-radius: 3px; background: var(--color-bg); overflow: hidden; }
        .bar span {
            display: block; height: 100%; border-radius: 3px;
            background: linear-gradient(90deg, var(--color-accent), var(--color-accent-hover));
            transition: width 600ms var(--ease-out-expo);
        }
        .foot { margin: var(--space-3) 0 0; font-size: var(--text-sm); color: var(--color-text-tertiary); text-align: center; min-height: 1.5em; }
        .cancel {
            display: block; margin: var(--space-2) auto 0; padding: 8px 16px; border-radius: var(--radius-full);
            font-size: var(--text-sm); color: var(--color-text-secondary);
        }
        .cancel:hover { background: var(--color-surface-hover); color: var(--color-text-primary); }
        @media (prefers-reduced-motion: reduce) {
            .scan, .cover, .skeleton { animation: none; }
        }
    `,
})
export class ImportProgressComponent {
    readonly kind = input<ImportKind>('link');
    readonly platform = input<ImportPlatform | null>(null);
    readonly preview = input<ImportPreview | null>(null);
    readonly photos = input<string[]>([]);
    readonly text = input('');
    /** Set when the answer arrived: the checklist completes before the form opens. */
    readonly done = input(false);
    readonly cancel = output<void>();

    private readonly startedAt = Date.now();
    private readonly elapsed = signal(0);

    protected readonly video = computed(() => !!this.preview()?.watchesVideo);

    protected readonly stages = computed<Stage[]>(() => {
        const kind = this.kind();
        if (kind === 'photo') {
            return [
                { label: 'Завантажуємо фото', at: 0 },
                { label: 'Розпізнаємо текст і страву', at: 1.5 },
                { label: 'Виписуємо інгредієнти', at: 4.5 },
                { label: 'Складаємо кроки', at: 7.5 },
                { label: 'Перевіряємо, чи нічого не бракує', at: 10 },
            ];
        }
        if (kind === 'text') {
            return [
                { label: 'Читаємо ваш опис', at: 0 },
                { label: 'Виписуємо інгредієнти', at: 1.8 },
                { label: 'Складаємо кроки', at: 4 },
                { label: 'Перевіряємо, чи нічого не бракує', at: 6.5 },
            ];
        }
        const label = PLATFORM_LABELS[this.platform() ?? 'website'];
        if (this.video()) {
            return [
                { label: `Відкриваємо ${this.platform() === 'youtube' ? 'відео' : 'допис'} ${label}`, at: 0 },
                { label: 'Дивимось відео і слухаємо автора', at: 2 },
                { label: 'Виписуємо інгредієнти', at: 12 },
                { label: 'Складаємо кроки', at: 20 },
                { label: 'Перевіряємо, чи нічого не бракує', at: 28 },
            ];
        }
        const opening = this.platform() === 'website' || !this.platform() ? 'Відкриваємо сторінку' : `Відкриваємо допис ${label}`;
        return [
            { label: opening, at: 0 },
            { label: 'Читаємо опис і фото', at: 1.6 },
            { label: 'Виписуємо інгредієнти', at: 3.8 },
            { label: 'Складаємо кроки', at: 6.2 },
            { label: 'Перевіряємо, чи нічого не бракує', at: 8.6 },
        ];
    });

    protected readonly current = computed(() => {
        const stages = this.stages();
        if (this.done()) return stages.length;
        const t = this.elapsed();
        let index = 0;
        stages.forEach((stage, i) => {
            if (t >= stage.at) index = i;
        });
        // Do not claim we "read the post" before the preview proved the link opens.
        if (this.kind() === 'link' && !this.preview() && index > 1 && t < 6) index = 1;
        return index;
    });

    protected readonly percent = computed(() => {
        if (this.done()) return 100;
        const expected = this.video() ? 35 : this.kind() === 'photo' ? 12 : 9;
        const t = this.elapsed();
        return Math.min(94, Math.round(100 * (1 - Math.exp(-t / (expected * 0.55)))));
    });

    protected readonly coverImage = computed(() => this.preview()?.image || '');
    protected readonly platformLabel = computed(() => PLATFORM_LABELS[this.preview()?.platform ?? this.platform() ?? 'website']);
    protected readonly textSnippet = computed(() => {
        const text = this.text().trim();
        return text.length > 160 ? `${text.slice(0, 160)}...` : text;
    });

    protected readonly footnote = computed(() => {
        const t = this.elapsed();
        if (this.done()) return 'Готово!';
        if (this.video() && t > 6) return 'Відео переглядаємо повністю, це може зайняти до хвилини.';
        if (t > 18) return 'Ще трохи... Довгі рецепти читаються довше.';
        if (t > 9) return 'Майже готово, звіряємо кількості й час.';
        return 'Зазвичай це займає 5-10 секунд.';
    });

    constructor() {
        const timer = setInterval(() => this.elapsed.set((Date.now() - this.startedAt) / 1000), 250);
        inject(DestroyRef).onDestroy(() => clearInterval(timer));
    }
}
