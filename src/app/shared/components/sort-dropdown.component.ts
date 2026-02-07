import { Component, ElementRef, HostListener, inject, signal } from '@angular/core';
import { SORT_OPTIONS, SortOption } from '../../core/models/dish.model';
import { DishService } from '../../core/services/dish.service';

@Component({
    selector: 'app-sort-dropdown',
    template: `
        <div class="sort-dropdown">
            <button
                class="sort-trigger"
                (click)="toggleDropdown()"
                [attr.aria-expanded]="isOpen()"
                aria-haspopup="listbox"
                aria-label="Сортировка">
                <span class="material-symbols-outlined">sort</span>
                <span class="sort-label">{{ currentLabel() }}</span>
                <span class="material-symbols-outlined chevron" [class.rotated]="isOpen()">
                    expand_more
                </span>
            </button>
            @if (isOpen()) {
                <div class="sort-menu" role="listbox" aria-label="Варианты сортировки">
                    @for (option of sortOptions; track option.value) {
                        <button
                            class="sort-option"
                            role="option"
                            [class.active]="dishService.sortOption() === option.value"
                            [attr.aria-selected]="dishService.sortOption() === option.value"
                            (click)="selectOption(option.value)">
                            <span>{{ option.label }}</span>
                            @if (dishService.sortOption() === option.value) {
                                <span class="material-symbols-outlined check-icon">check</span>
                            }
                        </button>
                    }
                </div>
            }
        </div>
    `,
    styles: `
        .sort-dropdown {
            position: relative;
        }

        .sort-trigger {
            display: flex;
            align-items: center;
            gap: var(--space-2);
            padding: var(--space-2) var(--space-3);
            border-radius: var(--radius-sm);
            font-size: var(--text-sm);
            color: var(--color-text-secondary);
            white-space: nowrap;
            transition: color var(--transition-fast),
                        background-color var(--transition-fast);

            &:hover {
                color: var(--color-text-primary);
                background-color: var(--color-surface-hover);
            }

            .material-symbols-outlined {
                font-size: 18px;
            }
        }

        .chevron {
            transition: transform var(--transition-base);

            &.rotated {
                transform: rotate(180deg);
            }
        }

        .sort-menu {
            position: absolute;
            top: calc(100% + var(--space-1));
            right: 0;
            min-width: 200px;
            background: var(--color-surface);
            border: 1px solid var(--color-border-light);
            border-radius: var(--radius-md);
            box-shadow: var(--shadow-lg);
            padding: var(--space-1);
            z-index: var(--z-dropdown);
            animation: scaleIn 150ms var(--ease-out-expo);
        }

        .sort-option {
            display: flex;
            align-items: center;
            justify-content: space-between;
            width: 100%;
            padding: var(--space-2) var(--space-3);
            border-radius: var(--radius-sm);
            font-size: var(--text-sm);
            color: var(--color-text-secondary);
            transition: background-color var(--transition-fast),
                        color var(--transition-fast);

            &:hover {
                background-color: var(--color-surface-hover);
                color: var(--color-text-primary);
            }

            &.active {
                color: var(--color-accent-dark);
                font-weight: var(--weight-medium);
            }
        }

        .check-icon {
            font-size: 16px;
            color: var(--color-accent);
        }

        .sort-label {
            display: none;

            @media (min-width: 768px) {
                display: inline;
            }
        }
    `,
})
export class SortDropdownComponent {
    protected readonly dishService = inject(DishService);
    private readonly elementRef = inject(ElementRef);

    protected readonly isOpen = signal(false);
    protected readonly sortOptions = SORT_OPTIONS;

    protected currentLabel = () => {
        const currentValue = this.dishService.sortOption();
        return SORT_OPTIONS.find(o => o.value === currentValue)?.label ?? 'Сортировка';
    };

    @HostListener('document:click', ['$event'])
    protected onDocumentClick(event: MouseEvent): void {
        if (!this.elementRef.nativeElement.contains(event.target)) {
            this.isOpen.set(false);
        }
    }

    protected toggleDropdown(): void {
        this.isOpen.update(value => !value);
    }

    protected selectOption(value: SortOption): void {
        this.dishService.updateSort(value);
        this.isOpen.set(false);
    }
}
