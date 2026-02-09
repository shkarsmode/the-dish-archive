import { Component, computed, input } from '@angular/core';
import { ALL_TASTE_KEYS, TASTE_LABELS, TasteProfile } from '../../core/models/dish.model';

@Component({
    selector: 'app-taste-radar',
    template: `
        <div class="taste-radar" role="img" aria-label="Смаковий профіль">
            <svg viewBox="0 0 260 260" class="radar-svg">
                <!-- Grid rings -->
                @for (ring of gridRings(); track $index) {
                    <polygon class="grid-ring" [attr.points]="ring" />
                }

                <!-- Axis lines -->
                @for (axis of axisData(); track axis.key) {
                    <line class="axis-line" x1="130" y1="130" [attr.x2]="axis.outerX" [attr.y2]="axis.outerY" />
                }

                <!-- Data shape -->
                <polygon class="data-shape" [attr.points]="shapePoints()" />

                <!-- Data dots (only for non-zero values) -->
                @for (dot of dotData(); track dot.key) {
                    @if (dot.value > 0) {
                        <circle class="data-dot" [attr.cx]="dot.x" [attr.cy]="dot.y" r="3.5" />
                    }
                }

                <!-- Labels -->
                @for (axis of axisData(); track axis.key) {
                    <text class="axis-label"
                        [attr.x]="axis.labelX" [attr.y]="axis.labelY"
                        [class.is-zero]="axis.value === 0">
                        {{ axis.label }}
                    </text>
                }
            </svg>
        </div>
    `,
    styles: `
        .taste-radar {
            width: 100%;
            max-width: 280px;
            margin: 0 auto;
        }

        .radar-svg {
            width: 100%;
            height: auto;
            display: block;
            overflow: visible;
        }

        .grid-ring {
            fill: none;
            stroke: var(--color-border-light, rgba(0, 0, 0, 0.07));
            stroke-width: 0.7;
        }

        .axis-line {
            stroke: var(--color-border-light, rgba(0, 0, 0, 0.07));
            stroke-width: 0.7;
        }

        .data-shape {
            fill: var(--color-accent);
            fill-opacity: 0.12;
            stroke: var(--color-accent);
            stroke-width: 1.8;
            stroke-linejoin: round;
            animation: shapeIn 600ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .data-dot {
            fill: var(--color-accent);
            animation: dotIn 500ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .axis-label {
            font-size: 11px;
            font-weight: 500;
            fill: var(--color-text-secondary);
            text-anchor: middle;
            dominant-baseline: middle;
            letter-spacing: 0.01em;
            transition: fill 0.2s;

            &.is-zero { opacity: 0.4; }
        }

        @keyframes shapeIn {
            from { opacity: 0; transform: scale(0.5); transform-origin: center; transform-box: fill-box; }
            to   { opacity: 1; transform: scale(1);   transform-origin: center; transform-box: fill-box; }
        }

        @keyframes dotIn {
            0%   { opacity: 0; r: 0; }
            100% { opacity: 1; r: 3.5; }
        }
    `,
})
export class TasteRadarComponent {
    readonly tasteProfile = input.required<TasteProfile>();

    private readonly CX = 130;
    private readonly CY = 130;
    private readonly R = 85;
    private readonly MAX = 5;
    private readonly LEVELS = 5;
    private readonly KEYS = ALL_TASTE_KEYS;

    private angle(i: number): number {
        return (2 * Math.PI * i) / this.KEYS.length - Math.PI / 2;
    }

    private point(i: number, r: number): { x: number; y: number } {
        const a = this.angle(i);
        return { x: this.CX + r * Math.cos(a), y: this.CY + r * Math.sin(a) };
    }

    private polygon(r: number): string {
        return this.KEYS.map((_, i) => {
            const p = this.point(i, r);
            return `${p.x},${p.y}`;
        }).join(' ');
    }

    readonly gridRings = computed(() =>
        Array.from({ length: this.LEVELS }, (_, i) =>
            this.polygon(((i + 1) / this.LEVELS) * this.R)
        ).map((points, i) => ({ level: i, points: points })).map(r => r.points)
    );

    private readonly BASE_R = this.R / this.LEVELS; // first ring = minimum radius

    readonly shapePoints = computed(() => {
        const tp = this.tasteProfile();
        return this.KEYS.map((key, i) => {
            const val = Math.max(0, Math.min(this.MAX, tp[key] ?? 0));
            const r = this.BASE_R + (val / this.MAX) * (this.R - this.BASE_R);
            const p = this.point(i, r);
            return `${p.x},${p.y}`;
        }).join(' ');
    });

    readonly axisData = computed(() => {
        const tp = this.tasteProfile();
        return this.KEYS.map((key, i) => {
            const outer = this.point(i, this.R);
            const labelP = this.point(i, this.R + 22);
            const valueP = this.point(i, this.R + 36);
            return {
                key,
                label: TASTE_LABELS[key],
                value: tp[key] ?? 0,
                outerX: outer.x,
                outerY: outer.y,
                labelX: labelP.x,
                labelY: labelP.y,
                valueX: valueP.x,
                valueY: valueP.y,
            };
        });
    });

    readonly dotData = computed(() => {
        const tp = this.tasteProfile();
        return this.KEYS.map((key, i) => {
            const val = Math.max(0, Math.min(this.MAX, tp[key] ?? 0));
            const r = this.BASE_R + (val / this.MAX) * (this.R - this.BASE_R);
            const p = this.point(i, r);
            return { key, value: val, x: p.x, y: p.y };
        });
    });
}
