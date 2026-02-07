import { Component, effect, input, output, signal } from '@angular/core';

@Component({
    selector: 'app-range-slider',
    template: `
        <div class="range-slider">
            <div class="range-header">
                <span class="range-label">{{ label() }}</span>
                <span class="range-values">{{ currentMin() }}{{ suffix() }} — {{ currentMax() }}{{ suffix() }}</span>
            </div>
            <div class="range-track-container">
                <div class="range-track">
                    <div class="range-fill"
                         [style.left.%]="fillLeft()"
                         [style.width.%]="fillWidth()">
                    </div>
                </div>
                <input
                    #minInput
                    type="range"
                    class="range-input range-min"
                    [min]="min()"
                    [max]="max()"
                    [step]="step()"
                    [value]="currentMin()"
                    (input)="onMinChange($event)"
                    [attr.aria-label]="label() + ' минимум'" />
                <input
                    #maxInput
                    type="range"
                    class="range-input range-max"
                    [min]="min()"
                    [max]="max()"
                    [step]="step()"
                    [value]="currentMax()"
                    (input)="onMaxChange($event)"
                    [attr.aria-label]="label() + ' максимум'" />
            </div>
        </div>
    `,
    styles: `
        .range-slider {
            display: flex;
            flex-direction: column;
            gap: var(--space-3);
        }

        .range-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .range-label {
            font-size: var(--text-sm);
            font-weight: var(--weight-medium);
            color: var(--color-text-primary);
        }

        .range-values {
            font-size: var(--text-sm);
            color: var(--color-text-secondary);
            font-variant-numeric: tabular-nums;
        }

        .range-track-container {
            position: relative;
            height: 32px;
            display: flex;
            align-items: center;
        }

        .range-track {
            position: absolute;
            left: 0;
            right: 0;
            height: 4px;
            background: var(--color-border);
            border-radius: 2px;
        }

        .range-fill {
            position: absolute;
            height: 100%;
            background: var(--color-accent);
            border-radius: 2px;
        }

        .range-input {
            position: absolute;
            width: 100%;
            height: 32px;
            appearance: none;
            -webkit-appearance: none;
            background: transparent;
            pointer-events: none;
            margin: 0;

            &::-webkit-slider-thumb {
                -webkit-appearance: none;
                appearance: none;
                width: 20px;
                height: 20px;
                background: var(--color-surface);
                border: 2px solid var(--color-accent);
                border-radius: 50%;
                cursor: pointer;
                pointer-events: all;
                box-shadow: var(--shadow-xs);
                transition: transform var(--transition-fast),
                            box-shadow var(--transition-fast);

                &:hover {
                    transform: scale(1.15);
                    box-shadow: var(--shadow-sm);
                }

                &:active {
                    transform: scale(1.1);
                }
            }

            &::-moz-range-thumb {
                width: 20px;
                height: 20px;
                background: var(--color-surface);
                border: 2px solid var(--color-accent);
                border-radius: 50%;
                cursor: pointer;
                pointer-events: all;
                box-shadow: var(--shadow-xs);
            }
        }
    `,
})
export class RangeSliderComponent {
    readonly label = input.required<string>();
    readonly min = input(0);
    readonly max = input(1000);
    readonly step = input(1);
    readonly suffix = input('');
    readonly initialMin = input<number | null>(null);
    readonly initialMax = input<number | null>(null);

    readonly rangeChanged = output<[number, number]>();

    protected readonly currentMin = signal(0);
    protected readonly currentMax = signal(1000);

    constructor() {
        effect(() => {
            this.currentMin.set(this.initialMin() ?? this.min());
            this.currentMax.set(this.initialMax() ?? this.max());
        });
    }

    protected fillLeft(): number {
        const range = this.max() - this.min();
        if (range === 0) return 0;
        return ((this.currentMin() - this.min()) / range) * 100;
    }

    protected fillWidth(): number {
        const range = this.max() - this.min();
        if (range === 0) return 100;
        return ((this.currentMax() - this.currentMin()) / range) * 100;
    }

    protected onMinChange(event: Event): void {
        const value = Number((event.target as HTMLInputElement).value);
        const clamped = Math.min(value, this.currentMax() - this.step());
        this.currentMin.set(clamped);
        this.rangeChanged.emit([clamped, this.currentMax()]);
    }

    protected onMaxChange(event: Event): void {
        const value = Number((event.target as HTMLInputElement).value);
        const clamped = Math.max(value, this.currentMin() + this.step());
        this.currentMax.set(clamped);
        this.rangeChanged.emit([this.currentMin(), clamped]);
    }
}
