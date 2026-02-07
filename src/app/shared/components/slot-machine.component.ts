import {
    Component,
    ElementRef,
    inject,
    output,
    signal,
    viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { Dish } from '../../core/models/dish.model';
import { DishService } from '../../core/services/dish.service';

const FOOD_EMOJIS = ['🍲', '🥗', '🍰', '🍜', '🥘', '🍕', '🍳', '🥩', '🍝', '🧁', '🌮', '🍣', '🥞', '🫕', '🍛'];

@Component({
    selector: 'app-slot-machine',
    template: `
        <div class="slot-row">
            @if (phase() === 'spinning') {
                <div class="slot-frame anim-in">
                    <div class="reel">
                        <div class="reel-strip" #reel1>
                            @for (emoji of reelItems1(); track $index) {
                                <span class="reel-symbol">{{ emoji }}</span>
                            }
                        </div>
                    </div>
                    <div class="reel">
                        <div class="reel-strip" #reel2>
                            @for (emoji of reelItems2(); track $index) {
                                <span class="reel-symbol">{{ emoji }}</span>
                            }
                        </div>
                    </div>
                    <div class="reel">
                        <div class="reel-strip" #reel3>
                            @for (emoji of reelItems3(); track $index) {
                                <span class="reel-symbol">{{ emoji }}</span>
                            }
                        </div>
                    </div>
                </div>
            } @else if (phase() === 'result' && resultDish()) {
                <button class="slot-result anim-in" (click)="onResultClick()">
                    <span class="result-title">{{ resultDish()!.title }}</span>
                    <span class="result-arrow material-symbols-outlined">arrow_forward</span>
                </button>
            } @else {
                <button class="slot-lever" (click)="spin()">
                    <span class="material-symbols-outlined lever-icon">casino</span>
                    <span>Мені пощастить!</span>
                </button>
            }
        </div>
    `,
    styles: `
        .slot-row {
            display: inline-flex;
            align-items: center;
            margin-top: var(--space-4);
            min-height: 42px;
        }

        .anim-in {
            animation: slotPop 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }

        @keyframes slotPop {
            from { opacity: 0; transform: scale(0.8); }
            to   { opacity: 1; transform: scale(1); }
        }

        .slot-frame {
            display: flex;
            gap: 2px;
            padding: 3px;
            background: var(--color-surface);
            border: 1.5px solid var(--color-border-light);
            border-radius: var(--radius-lg);
            box-shadow: var(--shadow-sm);
        }

        .reel {
            width: 36px;
            height: 36px;
            overflow: hidden;
            border-radius: var(--radius-sm);
            background: var(--color-bg);
        }

        .reel-strip {
            display: flex;
            flex-direction: column;
        }

        .reel-symbol {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 36px;
            height: 36px;
            font-size: 20px;
            flex-shrink: 0;
            user-select: none;
        }

        .slot-lever {
            display: inline-flex;
            align-items: center;
            gap: var(--space-1);
            padding: var(--space-2) var(--space-4);
            background: var(--color-accent);
            color: var(--color-text-inverse);
            font-size: var(--text-sm);
            font-weight: var(--weight-semibold);
            border-radius: var(--radius-full);
            white-space: nowrap;
            animation: slotPop 0.25s ease both;
            transition: background-color var(--transition-base),
                        transform var(--transition-fast),
                        box-shadow var(--transition-base);

            &:hover {
                background: var(--color-accent-hover);
                transform: translateY(-1px);
                box-shadow: var(--shadow-md);
            }

            &:active {
                transform: translateY(0);
            }

            .lever-icon {
                font-size: 16px;
            }
        }

        .slot-result {
            display: inline-flex;
            align-items: center;
            gap: var(--space-1);
            padding: var(--space-2) var(--space-3);
            background: var(--color-accent-light);
            border-radius: var(--radius-full);
            cursor: pointer;
            white-space: nowrap;
            transition: box-shadow var(--transition-fast);

            &:hover {
                box-shadow: var(--shadow-sm);
            }
        }

        .result-title {
            font-size: var(--text-sm);
            font-weight: var(--weight-semibold);
            color: var(--color-accent-dark);
            max-width: 180px;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .result-arrow {
            font-size: 14px;
            color: var(--color-accent);
        }
    `,
})
export class SlotMachineComponent {
    private readonly dishService = inject(DishService);
    private readonly router = inject(Router);

    readonly spun = output<Dish>();

    protected readonly phase = signal<'idle' | 'spinning' | 'result'>('idle');
    protected readonly resultDish = signal<Dish | undefined>(undefined);

    protected readonly reel1 = viewChild.required<ElementRef<HTMLElement>>('reel1');
    protected readonly reel2 = viewChild.required<ElementRef<HTMLElement>>('reel2');
    protected readonly reel3 = viewChild.required<ElementRef<HTMLElement>>('reel3');

    protected readonly reelItems1 = signal(this.buildReel());
    protected readonly reelItems2 = signal(this.buildReel());
    protected readonly reelItems3 = signal(this.buildReel());

    private buildReel(): string[] {
        const shuffled = [...FOOD_EMOJIS].sort(() => Math.random() - 0.5);
        return [...shuffled, ...shuffled, ...shuffled];
    }

    protected spin(): void {
        const dishes = this.dishService.filteredDishes();
        if (dishes.length === 0 || this.phase() === 'spinning') return;

        // Show reels
        this.phase.set('spinning');
        this.resultDish.set(undefined);

        // Rebuild reels
        this.reelItems1.set(this.buildReel());
        this.reelItems2.set(this.buildReel());
        this.reelItems3.set(this.buildReel());

        const chosen = dishes[Math.floor(Math.random() * dishes.length)];

        // Wait a tick for viewChild refs to resolve after @if shows reels
        requestAnimationFrame(() => {
            const itemH = 36;
            const totalSymbols = FOOD_EMOJIS.length;
            const stop1 = totalSymbols + Math.floor(Math.random() * totalSymbols);
            const stop2 = totalSymbols + Math.floor(Math.random() * totalSymbols);
            const stop3 = totalSymbols + Math.floor(Math.random() * totalSymbols);

            const r1 = this.reel1().nativeElement;
            const r2 = this.reel2().nativeElement;
            const r3 = this.reel3().nativeElement;

            [r1, r2, r3].forEach(r => {
                r.style.transition = 'none';
                r.style.transform = 'translateY(0)';
            });
            void r1.offsetHeight;

            this.animateReel(r1, stop1 * itemH, 1000);
            this.animateReel(r2, stop2 * itemH, 1400);
            this.animateReel(r3, stop3 * itemH, 1800);

            // After last reel stops + pause → show result
            setTimeout(() => {
                this.resultDish.set(chosen);
                this.phase.set('result');

                // Auto-reset back to button after 4s
                setTimeout(() => {
                    if (this.phase() === 'result') {
                        this.phase.set('idle');
                    }
                }, 4000);
            }, 2200);
        });
    }

    private animateReel(el: HTMLElement, distance: number, duration: number): void {
        el.style.transition = `transform ${duration}ms cubic-bezier(0.15, 0.85, 0.35, 1.02)`;
        el.style.transform = `translateY(-${distance}px)`;
    }

    protected onResultClick(): void {
        const dish = this.resultDish();
        if (dish) {
            this.router.navigate(['/dish', dish.slug]);
        }
    }
}
