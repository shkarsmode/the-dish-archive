import { Component, inject } from '@angular/core';
import { CompareService } from '../../core/services/compare.service';

@Component({
    selector: 'app-compare-bar',
    template: `
        @if (compareService.isVisible()) {
            <div class="compare-bar" role="status">
                <div class="compare-bar-inner">
                    <div class="compare-dishes">
                        @for (dish of compareService.selectedDishes(); track dish.id) {
                            <div class="compare-item">
                                <img
                                    [src]="dish.images[0]?.url"
                                    [alt]="dish.title"
                                    class="compare-thumb"
                                    (error)="onImageError($event)" />
                                <button
                                    class="compare-remove"
                                    (click)="compareService.remove(dish.id)"
                                    [attr.aria-label]="'Прибрати ' + dish.title + ' з порівняння'">
                                    <span class="material-symbols-outlined">close</span>
                                </button>
                            </div>
                        }
                    </div>
                    <div class="compare-actions">
                        <span class="compare-count">{{ compareService.count() }} з 4</span>
                        <button
                            class="compare-button"
                            [disabled]="!compareService.canCompare()"
                            (click)="showModal = true">
                            Порівняти
                        </button>
                        <button class="compare-clear" (click)="compareService.clear()">
                            <span class="material-symbols-outlined">close</span>
                        </button>
                    </div>
                </div>
            </div>
        }

        @if (showModal && compareService.canCompare()) {
            <div class="modal-backdrop" (click)="showModal = false">
                <div class="modal" (click)="$event.stopPropagation()" role="dialog" aria-label="Порівняння страв">
                    <div class="modal-header">
                        <h2 class="modal-title">Порівняння страв</h2>
                        <button class="modal-close" (click)="showModal = false" aria-label="Закрити">
                            <span class="material-symbols-outlined">close</span>
                        </button>
                    </div>
                    <div class="modal-body">
                        <table class="compare-table">
                            <thead>
                                <tr>
                                    <th class="compare-label-col"></th>
                                    @for (dish of compareService.selectedDishes(); track dish.id) {
                                        <th class="compare-dish-col">
                                            <img
                                                [src]="dish.images[0]?.url"
                                                [alt]="dish.title"
                                                class="compare-dish-img"
                                                (error)="onImageError($event)" />
                                            <span class="compare-dish-name">{{ dish.title }}</span>
                                        </th>
                                    }
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td class="row-label">Оцінка</td>
                                    @for (dish of compareService.selectedDishes(); track dish.id) {
                                        <td class="row-value">{{ dish.rating }} <span class="unit">/ 5</span></td>
                                    }
                                </tr>
                                <tr>
                                    <td class="row-label">Вартість</td>
                                    @for (dish of compareService.selectedDishes(); track dish.id) {
                                        <td class="row-value">{{ dish.price.amount }} <span class="unit">грн</span></td>
                                    }
                                </tr>
                                <tr>
                                    <td class="row-label">Час</td>
                                    @for (dish of compareService.selectedDishes(); track dish.id) {
                                        <td class="row-value">{{ dish.cookingTime.total }} <span class="unit">хв</span></td>
                                    }
                                </tr>
                                <tr>
                                    <td class="row-label">Калорії</td>
                                    @for (dish of compareService.selectedDishes(); track dish.id) {
                                        <td class="row-value">{{ dish.calories }} <span class="unit">ккал</span></td>
                                    }
                                </tr>
                                <tr>
                                    <td class="row-label">Порції</td>
                                    @for (dish of compareService.selectedDishes(); track dish.id) {
                                        <td class="row-value">{{ dish.servings }}</td>
                                    }
                                </tr>
                                <tr>
                                    <td class="row-label">Складність</td>
                                    @for (dish of compareService.selectedDishes(); track dish.id) {
                                        <td class="row-value">{{ difficultyLabel(dish.difficulty) }}</td>
                                    }
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        }
    `,
    styles: `
        @use 'mixins' as m;

        .compare-bar {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            z-index: var(--z-drawer);
            padding: var(--space-3) var(--space-5);
            padding-bottom: calc(var(--space-3) + var(--safe-bottom));
            background: rgba(255, 255, 255, 0.92);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border-top: 1px solid var(--color-border-light);
            box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.06);
            animation: slideUp 200ms var(--ease-out-expo);
        }

        .compare-bar-inner {
            @include m.container;
            @include m.flex-between;
            gap: var(--space-4);
        }

        .compare-dishes {
            display: flex;
            gap: var(--space-2);
        }

        .compare-item {
            position: relative;
            width: 48px;
            height: 48px;
            border-radius: var(--radius-sm);
            overflow: hidden;
        }

        .compare-thumb {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .compare-remove {
            position: absolute;
            top: -4px;
            right: -4px;
            width: 20px;
            height: 20px;
            background: var(--color-text-primary);
            color: var(--color-text-inverse);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;

            .material-symbols-outlined { font-size: 14px; }
        }

        .compare-actions {
            display: flex;
            align-items: center;
            gap: var(--space-3);
        }

        .compare-count {
            font-size: var(--text-sm);
            color: var(--color-text-tertiary);
            white-space: nowrap;
        }

        .compare-button {
            padding: var(--space-2) var(--space-5);
            background: var(--color-text-primary);
            color: var(--color-text-inverse);
            font-size: var(--text-sm);
            font-weight: var(--weight-medium);
            border-radius: var(--radius-sm);
            white-space: nowrap;
            transition: opacity var(--transition-fast);

            &:disabled {
                opacity: 0.4;
                cursor: default;
            }

            &:not(:disabled):hover {
                opacity: 0.88;
            }
        }

        .compare-clear {
            @include m.tap-target(36px);
            color: var(--color-text-tertiary);
            border-radius: var(--radius-sm);

            &:hover {
                color: var(--color-text-primary);
                background: var(--color-surface-hover);
            }

            .material-symbols-outlined { font-size: 20px; }
        }

        // Modal
        .modal-backdrop {
            position: fixed;
            inset: 0;
            z-index: var(--z-modal);
            background: var(--color-backdrop);
            @include m.flex-center;
            padding: var(--space-5);
            animation: fadeIn 200ms ease;
        }

        .modal {
            background: var(--color-surface);
            border-radius: var(--radius-xl);
            width: 100%;
            max-width: 800px;
            max-height: 85dvh;
            display: flex;
            flex-direction: column;
            box-shadow: var(--shadow-xl);
            animation: scaleIn 200ms var(--ease-out-expo);
        }

        .modal-header {
            @include m.flex-between;
            padding: var(--space-5) var(--space-6);
            border-bottom: 1px solid var(--color-border-light);
        }

        .modal-title {
            font-family: var(--font-display);
            font-size: var(--text-xl);
            font-weight: var(--weight-semibold);
        }

        .modal-close {
            @include m.tap-target(36px);
            color: var(--color-text-tertiary);
            border-radius: var(--radius-sm);

            &:hover {
                color: var(--color-text-primary);
                background: var(--color-surface-hover);
            }
        }

        .modal-body {
            flex: 1;
            overflow: auto;
            padding: var(--space-5) var(--space-6);
        }

        .compare-table {
            width: 100%;
            border-collapse: collapse;
        }

        .compare-label-col {
            width: 120px;
            text-align: left;
        }

        .compare-dish-col {
            text-align: center;
            padding: var(--space-3);
        }

        .compare-dish-img {
            width: 80px;
            height: 60px;
            object-fit: cover;
            border-radius: var(--radius-sm);
            margin-bottom: var(--space-2);
        }

        .compare-dish-name {
            display: block;
            font-family: var(--font-display);
            font-size: var(--text-sm);
            font-weight: var(--weight-medium);
        }

        .row-label {
            padding: var(--space-3) var(--space-3) var(--space-3) 0;
            font-size: var(--text-sm);
            color: var(--color-text-secondary);
            border-bottom: 1px solid var(--color-border-light);
        }

        .row-value {
            padding: var(--space-3);
            text-align: center;
            font-size: var(--text-md);
            font-weight: var(--weight-medium);
            font-variant-numeric: tabular-nums;
            border-bottom: 1px solid var(--color-border-light);
        }

        .unit {
            font-size: var(--text-sm);
            color: var(--color-text-tertiary);
            font-weight: var(--weight-regular);
        }
    `,
})
export class CompareBarComponent {
    protected readonly compareService = inject(CompareService);
    protected showModal = false;

    protected difficultyLabel(difficulty: string): string {
        const map: Record<string, string> = {
            easy: 'Легко',
            medium: 'Середнє',
            hard: 'Складно',
        };
        return map[difficulty] ?? difficulty;
    }

    protected onImageError(event: Event): void {
        const img = event.target as HTMLImageElement;
        img.style.display = 'none';
    }
}
