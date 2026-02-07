import { Component, inject, signal } from '@angular/core';
import { DishService } from '../../core/services/dish.service';

@Component({
    selector: 'app-search-bar',
    template: `
        <div class="search-bar" [class.focused]="isFocused()">
            <span class="material-symbols-outlined search-icon">search</span>
            <input
                type="text"
                class="search-input"
                placeholder="Пошук за назвою, тегами, інгредієнтами..."
                [value]="dishService.searchQuery()"
                (input)="onInput($event)"
                (focus)="isFocused.set(true)"
                (blur)="isFocused.set(false)"
                aria-label="Пошук страв" />
            @if (dishService.searchQuery()) {
                <button
                    class="clear-button"
                    (click)="clearSearch()"
                    aria-label="Очистити пошук">
                    <span class="material-symbols-outlined">close</span>
                </button>
            }
        </div>
    `,
    styles: `
        .search-bar {
            display: flex;
            align-items: center;
            gap: var(--space-2);
            padding: var(--space-2) var(--space-3);
            background: var(--color-bg);
            border: 1.5px solid var(--color-border);
            border-radius: var(--radius-full);
            transition: border-color var(--transition-base),
                        box-shadow var(--transition-base),
                        background-color var(--transition-base);

            &.focused {
                background: var(--color-surface);
                border-color: var(--color-accent);
                box-shadow: 0 0 0 3px var(--color-accent-light);
            }
        }

        .search-icon {
            color: var(--color-text-tertiary);
            font-size: 18px;
            flex-shrink: 0;

            .focused & {
                color: var(--color-accent);
            }
        }

        .search-input {
            flex: 1;
            font-size: 16px;
            line-height: 1.4;
            min-width: 0;
            padding: 2px 0;

            @media (min-width: 768px) {
                font-size: var(--text-sm);
            }

            &::placeholder {
                color: var(--color-text-tertiary);
                font-size: var(--text-sm);
            }
        }

        .clear-button {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 24px;
            height: 24px;
            border-radius: var(--radius-full);
            background: var(--color-surface-hover);
            color: var(--color-text-tertiary);
            flex-shrink: 0;
            transition: background-color var(--transition-fast),
                        color var(--transition-fast);

            &:hover {
                background-color: var(--color-border);
                color: var(--color-text-primary);
            }

            .material-symbols-outlined {
                font-size: 14px;
            }
        }
    `,
})
export class SearchBarComponent {
    protected readonly dishService = inject(DishService);
    protected readonly isFocused = signal(false);

    protected onInput(event: Event): void {
        const value = (event.target as HTMLInputElement).value;
        this.dishService.updateSearch(value);
    }

    protected clearSearch(): void {
        this.dishService.updateSearch('');
    }
}
