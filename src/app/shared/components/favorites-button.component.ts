import { Component, inject, input } from '@angular/core';
import { FavoritesService } from '../../core/services/favorites.service';

@Component({
    selector: 'app-favorites-button',
    template: `
        <button
            class="favorites-button"
            [class.active]="favoritesService.isFavorite(dishId())()"
            (click)="handleClick($event)"
            [attr.aria-label]="favoritesService.isFavorite(dishId())() ? 'Убрать из избранного' : 'Добавить в избранное'"
            [attr.aria-pressed]="favoritesService.isFavorite(dishId())()">
            <span class="material-symbols-outlined heart-icon">
                {{ favoritesService.isFavorite(dishId())() ? 'favorite' : 'favorite_border' }}
            </span>
        </button>
    `,
    styles: `
        .favorites-button {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 36px;
            height: 36px;
            border-radius: var(--radius-full);
            background: rgba(255, 255, 255, 0.9);
            backdrop-filter: blur(8px);
            color: var(--color-text-tertiary);
            transition: color var(--transition-base),
                        transform var(--transition-spring),
                        background-color var(--transition-fast);

            &:hover {
                background: rgba(255, 255, 255, 1);
                color: var(--color-favorite);
            }

            &.active {
                color: var(--color-favorite);

                .heart-icon {
                    font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24;
                    animation: heartPulse 300ms ease;
                }
            }
        }

        .heart-icon {
            font-size: 20px;
        }
    `,
})
export class FavoritesButtonComponent {
    readonly dishId = input.required<string>();
    protected readonly favoritesService = inject(FavoritesService);

    protected handleClick(event: Event): void {
        event.stopPropagation();
        event.preventDefault();
        this.favoritesService.toggle(this.dishId());
    }
}
