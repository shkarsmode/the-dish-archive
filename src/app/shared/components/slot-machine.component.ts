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
        <div class="slot-row" [class.active]="isSpinning()">
            <div class="slot-frame">
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

            @if (showResult() && resultDish()) {
                <button class="slot-result" (click)="onResultClick()">
                    <span class="result-title">{{ resultDish()!.title }}</span>
                    <span class="result-arrow material-symbols-outlined">arrow_forward</span>
                </button>
            } @else {
                <button class="slot-lever" (click)="spin()" [disabled]="isSpinning()">
                    <span class="material-symbols-outlined lever-icon">casino</span>
                    <span class="lever-text">{{ isSpinning() ? '...' : 'Мені пощастить!' }}</span>
                </button>
            }
        </div>
    `,
    styles: `
        @use 'mixins' as m;

        .slot-row {
            display: inline-flex;
            align-items: center;
            gap: var(--space-2);
            margin-top: var(--space-4);
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
            transition: background-color var(--transition-base),
                        transform var(--transition-fast),
                        box-shadow var(--transition-base);

            &:hover:not(:disabled) {
                background: var(--color-accent-hover);
                transform: translateY(-1px);
                box-shadow: var(--shadow-md);
            }

            &:active:not(:disabled) {
                transform: translateY(0);
            }

            &:disabled {
                opacity: 0.7;
                cursor: not-allowed;
            }

            .lever-icon {
                font-size: 16px;
            }

            .active & .lever-icon {
                animation: leverSpin 0.5s linear infinite;
            }
        }

        @keyframes leverSpin {
            to { transform: rotate(360deg); }
        }

        .slot-result {
            display: inline-flex;
            align-items: center;
            gap: var(--space-1);
            padding: var(--space-2) var(--space-3);
            background: var(--color-accent-light);
            border-radius: var(--radius-full);
            cursor: pointer;
            animation: fadeSlotIn 0.3s ease both;
            white-space: nowrap;

            &:hover {
                box-shadow: var(--shadow-sm);
            }
        }

        @keyframes fadeSlotIn {
            from {
                opacity: 0;
                transform: scale(0.9);
            }
            to {
                opacity: 1;
                transform: scale(1);
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

    protected readonly isSpinning = signal(false);
    protected readonly showResult = signal(false);
    protected readonly resultDish = signal<Dish | undefined>(undefined);

    protected readonly reel1 = viewChild.required<ElementRef<HTMLElement>>('reel1');
    protected readonly reel2 = viewChild.required<ElementRef<HTMLElement>>('reel2');
    protected readonly reel3 = viewChild.required<ElementRef<HTMLElement>>('reel3');

    // Each reel has FOOD_EMOJIS shuffled
    protected readonly reelItems1 = signal(this.buildReel());
    protected readonly reelItems2 = signal(this.buildReel());
    protected readonly reelItems3 = signal(this.buildReel());

    private buildReel(): string[] {
        // 3 loops of shuffled emojis for smooth continuous scroll
        const shuffled = [...FOOD_EMOJIS].sort(() => Math.random() - 0.5);
        return [...shuffled, ...shuffled, ...shuffled];
    }

    protected spin(): void {
        const dishes = this.dishService.filteredDishes();
        if (dishes.length === 0 || this.isSpinning()) return;

        this.isSpinning.set(true);
        this.showResult.set(false);
        this.resultDish.set(undefined);

        // Rebuild reels for fresh randomness
        this.reelItems1.set(this.buildReel());
        this.reelItems2.set(this.buildReel());
        this.reelItems3.set(this.buildReel());

        const chosen = dishes[Math.floor(Math.random() * dishes.length)];
        const itemH = 36;
        const totalSymbols = FOOD_EMOJIS.length;

        // Each reel lands on a random symbol in the 2nd loop
        const stop1 = totalSymbols + Math.floor(Math.random() * totalSymbols);
        const stop2 = totalSymbols + Math.floor(Math.random() * totalSymbols);
        const stop3 = totalSymbols + Math.floor(Math.random() * totalSymbols);

        const r1 = this.reel1().nativeElement;
        const r2 = this.reel2().nativeElement;
        const r3 = this.reel3().nativeElement;

        // Reset positions
        [r1, r2, r3].forEach(r => {
            r.style.transition = 'none';
            r.style.transform = 'translateY(0)';
        });

        // Force reflow
        void r1.offsetHeight;

        // Stagger the reels stopping
        this.animateReel(r1, stop1 * itemH, 1000);
        this.animateReel(r2, stop2 * itemH, 1400);
        this.animateReel(r3, stop3 * itemH, 1800);

        setTimeout(() => {
            this.isSpinning.set(false);
            this.resultDish.set(chosen);

            setTimeout(() => this.showResult.set(true), 50);
        }, 2000);
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
