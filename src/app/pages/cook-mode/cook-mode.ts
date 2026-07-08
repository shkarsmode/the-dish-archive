import { Component, DestroyRef, HostListener, OnDestroy, OnInit, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { DishService } from '../../core/services/dish.service';
import { ChecklistService } from '../../core/services/checklist.service';

/**
 * Immersive full-screen step-by-step cooking mode: big step cards with per-step
 * timers, an ingredient checklist, swipe/keyboard navigation, screen wake-lock,
 * and a celebratory finish. Reuses dish.steps + the persisted ChecklistService.
 */
@Component({
    selector: 'app-cook-mode',
    imports: [RouterLink],
    template: `
        @if (dish(); as d) {
            <div class="cook" [style.--accent]="d.familyThemeColor || 'var(--color-accent)'">
                <!-- Top bar -->
                <header class="cook-top">
                    <a [routerLink]="['/dish', d.slug]" class="cook-icon" aria-label="Вийти"><span class="material-symbols-outlined">close</span></a>
                    <div class="cook-progress">
                        @for (s of steps(); track $index) {
                            <span class="prog-seg" [class.done]="$index < stepIndex() || finished()" [class.current]="$index === stepIndex() && !finished()"></span>
                        }
                    </div>
                    <button type="button" class="cook-icon" (click)="showIngredients.set(true)" aria-label="Інгредієнти">
                        <span class="material-symbols-outlined">list_alt</span>
                    </button>
                </header>

                @if (steps().length === 0) {
                    <div class="cook-stage">
                        <div class="step-card">
                            <p class="step-text">У цього рецепта ще немає кроків приготування.</p>
                            <a [routerLink]="['/dish', d.slug]" class="nav-btn ghost">До рецепта</a>
                        </div>
                    </div>
                } @else if (!finished()) {
                    <!-- Step card -->
                    <section class="cook-stage" (touchstart)="onTouchStart($event)" (touchend)="onTouchEnd($event)">
                        <div class="step-card" [class.slide]="sliding()">
                            <span class="step-eyebrow">Крок {{ stepIndex() + 1 }} з {{ steps().length }}</span>
                            @if (currentStep(); as step) {
                                <p class="step-text">{{ step.description }}</p>
                            }

                            @if (timerTotal() > 0) {
                                <div class="timer" [class.done]="timerSeconds() === 0">
                                    <div class="timer-ring" [style.--p]="timerPct()">
                                        <span class="timer-time">{{ mmss(timerSeconds()) }}</span>
                                    </div>
                                    <div class="timer-actions">
                                        <button type="button" (click)="toggleTimer()">
                                            <span class="material-symbols-outlined">{{ timerRunning() ? 'pause' : 'play_arrow' }}</span>
                                            {{ timerRunning() ? 'Пауза' : (timerSeconds() === timerTotal() ? 'Таймер' : 'Далі') }}
                                        </button>
                                        <button type="button" class="ghost" (click)="resetTimer()"><span class="material-symbols-outlined">replay</span></button>
                                    </div>
                                </div>
                            }
                        </div>
                    </section>

                    <!-- Nav -->
                    <footer class="cook-nav">
                        <button type="button" class="nav-btn ghost" (click)="prev()" [disabled]="stepIndex() === 0">
                            <span class="material-symbols-outlined">arrow_back</span> Назад
                        </button>
                        <button type="button" class="nav-btn primary" (click)="next()">
                            {{ isLastStep() ? 'Завершити' : 'Далі' }}
                            <span class="material-symbols-outlined">{{ isLastStep() ? 'check' : 'arrow_forward' }}</span>
                        </button>
                    </footer>
                } @else {
                    <!-- Finish -->
                    <section class="cook-finish">
                        @for (c of confetti; track $index) {
                            <span class="confetti" [style.left.%]="c.x" [style.animation-delay.ms]="c.d" [style.--rot.deg]="c.r">{{ c.e }}</span>
                        }
                        <span class="finish-emoji">🎉</span>
                        <h1 class="finish-title">Смачного!</h1>
                        <p class="finish-sub">Ви приготували «{{ d.title }}»</p>
                        <div class="finish-actions">
                            <a [routerLink]="['/dish', d.slug]" class="nav-btn primary">До рецепта</a>
                            <button type="button" class="nav-btn ghost" (click)="restart()">Спочатку</button>
                        </div>
                    </section>
                }

                <!-- Ingredients sheet -->
                @if (showIngredients()) {
                    <div class="sheet-backdrop" (click)="showIngredients.set(false)"></div>
                    <div class="sheet" role="dialog" aria-label="Інгредієнти">
                        <div class="sheet-grip"></div>
                        <h2 class="sheet-title">Інгредієнти</h2>
                        <ul class="ing-list">
                            @for (ing of d.ingredients; track ing.name) {
                                <li class="ing" [class.checked]="checklist.isChecked(d.id, ing.name)()" (click)="checklist.toggle(d.id, ing.name)">
                                    <span class="ing-box"><span class="material-symbols-outlined">{{ checklist.isChecked(d.id, ing.name)() ? 'check_box' : 'check_box_outline_blank' }}</span></span>
                                    <span class="ing-name">{{ ing.name }}</span>
                                    <span class="ing-amt">{{ ing.amount }} {{ ing.unit }}</span>
                                </li>
                            }
                        </ul>
                        <button type="button" class="nav-btn primary sheet-close" (click)="showIngredients.set(false)">Готово</button>
                    </div>
                }
            </div>
        } @else if (!dishService.isLoading()) {
            <div class="cook-missing">
                <p>Рецепт не знайдено</p>
                <a routerLink="/" class="nav-btn ghost">До каталогу</a>
            </div>
        } @else {
            <div class="cook-missing"><p>Завантаження…</p></div>
        }
    `,
    styleUrl: './cook-mode.scss',
})
export class CookModePage implements OnInit, OnDestroy {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    protected readonly dishService = inject(DishService);
    protected readonly checklist = inject(ChecklistService);
    private readonly destroyRef = inject(DestroyRef);

    private readonly slug = toSignal(this.route.paramMap.pipe(map(p => p.get('slug') ?? '')));
    protected readonly dish = computed(() => this.dishService.allDishes().find(d => d.slug === this.slug()));
    protected readonly steps = computed(() => this.dish()?.steps ?? []);

    protected readonly stepIndex = signal(0);
    protected readonly finished = signal(false);
    protected readonly sliding = signal(false);
    protected readonly showIngredients = signal(false);

    protected readonly currentStep = computed(() => this.steps()[this.stepIndex()]);
    protected readonly isLastStep = computed(() => this.stepIndex() >= this.steps().length - 1);
    /** Current step's duration in minutes — a primitive, so a background reload()
     *  that rebuilds equal step objects doesn't retrigger the timer reset effect. */
    private readonly currentDurationMin = computed(() => this.currentStep()?.duration ?? 0);

    // ── Timer ──
    protected readonly timerTotal = signal(0);   // seconds for current step
    protected readonly timerSeconds = signal(0);
    protected readonly timerRunning = signal(false);
    protected readonly timerPct = computed(() =>
        this.timerTotal() > 0 ? Math.round((1 - this.timerSeconds() / this.timerTotal()) * 100) : 0,
    );
    private intervalId: ReturnType<typeof setInterval> | null = null;
    private wakeLock: any = null;
    private destroyed = false;

    protected readonly confetti = Array.from({ length: 14 }, (_, i) => ({
        x: (i * 37) % 100,
        d: (i * 90) % 1200,
        r: ((i * 53) % 90) - 45,
        e: ['🎉', '✨', '🥳', '🍅', '🧄', '🌿', '⭐'][i % 7],
    }));

    constructor() {
        // Keep stepIndex in range if the loaded steps change (e.g. a live reload
        // of allDishes returns fewer steps than the current index).
        effect(() => {
            const len = this.steps().length;
            if (len > 0 && this.stepIndex() > len - 1) {
                this.stepIndex.set(len - 1);
                this.finished.set(false);
            }
        });
        // Reset the timer whenever the active step changes — keyed on stepIndex +
        // the duration value (primitives), not the step object reference.
        effect(() => {
            this.stepIndex();
            const seconds = this.currentDurationMin() * 60;
            this.stopTimer();
            this.timerTotal.set(seconds);
            this.timerSeconds.set(seconds);
        });
    }

    ngOnInit(): void { void this.requestWakeLock(); }
    ngOnDestroy(): void { this.destroyed = true; this.stopTimer(); this.releaseWakeLock(); }

    // ── Navigation ──
    protected next(): void {
        if (this.isLastStep()) { this.finished.set(true); this.stopTimer(); return; }
        this.animateThen(() => this.stepIndex.update(i => i + 1));
    }
    protected prev(): void {
        if (this.stepIndex() === 0) return;
        this.animateThen(() => this.stepIndex.update(i => i - 1));
    }
    protected restart(): void {
        this.finished.set(false);
        this.stepIndex.set(0);
    }
    private animateThen(fn: () => void): void {
        this.sliding.set(true);
        setTimeout(() => { fn(); this.sliding.set(false); }, 120);
    }

    // ── Timer control ──
    protected toggleTimer(): void {
        if (this.timerSeconds() === 0) { this.resetTimer(); return; }
        this.timerRunning() ? this.pauseTimer() : this.startTimer();
    }
    private startTimer(): void {
        if (this.intervalId) return;
        this.timerRunning.set(true);
        this.intervalId = setInterval(() => {
            const left = this.timerSeconds() - 1;
            if (left <= 0) {
                this.timerSeconds.set(0);
                this.stopTimer();
                if ('vibrate' in navigator) navigator.vibrate?.([120, 60, 120]);
            } else {
                this.timerSeconds.set(left);
            }
        }, 1000);
    }
    private pauseTimer(): void { this.stopTimer(); }
    protected resetTimer(): void { this.stopTimer(); this.timerSeconds.set(this.timerTotal()); }
    private stopTimer(): void {
        if (this.intervalId) { clearInterval(this.intervalId); this.intervalId = null; }
        this.timerRunning.set(false);
    }
    protected mmss(total: number): string {
        const m = Math.floor(total / 60), s = total % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    }

    // ── Swipe + keyboard ──
    private touchX = 0;
    protected onTouchStart(e: TouchEvent): void { this.touchX = e.changedTouches[0].clientX; }
    protected onTouchEnd(e: TouchEvent): void {
        const dx = e.changedTouches[0].clientX - this.touchX;
        if (dx < -50) this.next();
        else if (dx > 50) this.prev();
    }

    @HostListener('document:keydown', ['$event'])
    protected onKey(e: KeyboardEvent): void {
        if (this.showIngredients()) { if (e.key === 'Escape') this.showIngredients.set(false); return; }
        if (e.key === 'ArrowRight') this.next();
        else if (e.key === 'ArrowLeft') this.prev();
        else if (e.key === 'Escape') void this.router.navigate(['/dish', this.dish()?.slug ?? '']);
    }

    // ── Wake lock ──
    // The Screen Wake Lock is auto-released whenever the page is hidden (tab
    // switch / phone lock), so re-acquire it when the page becomes visible again.
    @HostListener('document:visibilitychange')
    protected onVisibility(): void {
        if (document.visibilityState === 'visible' && !this.wakeLock) void this.requestWakeLock();
    }

    private async requestWakeLock(): Promise<void> {
        try {
            if ('wakeLock' in navigator) {
                const sentinel = await (navigator as any).wakeLock.request('screen');
                if (this.destroyed) { sentinel?.release?.(); return; }
                this.wakeLock = sentinel;
                this.wakeLock?.addEventListener?.('release', () => { this.wakeLock = null; });
            }
        } catch { /* unsupported or denied */ }
    }
    private releaseWakeLock(): void {
        try { this.wakeLock?.release?.(); this.wakeLock = null; } catch { /* noop */ }
    }
}
