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
                placeholder="Поиск по названию, тегам, ингредиентам..."
                [value]="dishService.searchQuery()"
                (input)="onInput($event)"
                (focus)="isFocused.set(true)"
                (blur)="isFocused.set(false)"
                aria-label="Поиск блюд" />
            @if (dishService.searchQuery()) {
                <button
                    class="clear-button"
                    (click)="clearSearch()"
                    aria-label="Очистить поиск">
                    <span class="material-symbols-outlined">close</span>
                </button>
            }
        </div>
    `,
    styles: `
        .search-bar {
            display: flex;
            align-items: center;
            gap: var(--space-3);
            padding: var(--space-3) var(--space-4);
            background: var(--color-surface);
            border: 1px solid var(--color-border);
            border-radius: var(--radius-md);
            transition: border-color var(--transition-base),
                        box-shadow var(--transition-base);

            &.focused {
                border-color: var(--color-accent);
                box-shadow: 0 0 0 3px var(--color-accent-light);
            }
        }

        .search-icon {
            color: var(--color-text-tertiary);
            font-size: 20px;
            flex-shrink: 0;
        }

        .search-input {
            flex: 1;
            font-size: var(--text-base);
            line-height: 1.4;
            min-width: 0;

            &::placeholder {
                color: var(--color-text-tertiary);
            }
        }

        .clear-button {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 28px;
            height: 28px;
            border-radius: var(--radius-full);
            color: var(--color-text-tertiary);
            flex-shrink: 0;
            transition: background-color var(--transition-fast),
                        color var(--transition-fast);

            &:hover {
                background-color: var(--color-surface-hover);
                color: var(--color-text-primary);
            }

            .material-symbols-outlined {
                font-size: 18px;
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
