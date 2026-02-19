import { Component, computed, ElementRef, inject, input } from '@angular/core';
import { FavoritesService } from '../../core/services/favorites.service';

@Component({
    selector: 'app-favorites-button',
    template: `
        @let isFavorite_ = isFavorite();
        <button
            class="favorites-button"
            [class.active]="isFavorite_"
            (click)="handleClick($event)"
            [attr.aria-label]="isFavorite_ ? 'Прибрати з обраного' : 'Додати до обраного'"
            [attr.aria-pressed]="isFavorite_">
            <span class="material-symbols-outlined heart-icon">
                {{ isFavorite_ ? 'favorite' : 'favorite_border' }}
            </span>
        </button>
    `,
    styles: `
        @use 'mixins' as m;

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

            @include m.hover {
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
    private readonly elRef = inject(ElementRef);

    readonly isFavorite = computed(() => {
        return this.favoritesService.favoriteIds().has(this.dishId());
    });

    protected handleClick(event: Event): void {
        event.stopPropagation();
        event.preventDefault();
        const wasNotFavorite = !this.isFavorite();
        this.favoritesService.toggle(this.dishId());

        if (wasNotFavorite) {
            this.emitHeartBurst();
        }
    }

    private emitHeartBurst(): void {
        const btn = this.elRef.nativeElement.querySelector('.favorites-button') as HTMLElement;
        if (!btn) return;
        const rect = btn.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;

        for (let i = 0; i < 8; i++) {
            const particle = document.createElement('span');
            particle.textContent = '♥';
            const angle = (i / 8) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
            const distance = 28 + Math.random() * 24;
            const size = 10 + Math.random() * 8;
            Object.assign(particle.style, {
                position: 'fixed',
                left: `${cx}px`,
                top: `${cy}px`,
                fontSize: `${size}px`,
                color: '#E25555',
                pointerEvents: 'none',
                zIndex: '9999',
                fontStyle: 'normal',
                lineHeight: '1',
                transform: 'translate(-50%, -50%)',
                transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                opacity: '1',
            });
            document.body.appendChild(particle);

            requestAnimationFrame(() => {
                particle.style.transform = `translate(calc(-50% + ${Math.cos(angle) * distance}px), calc(-50% + ${Math.sin(angle) * distance}px)) scale(0.2)`;
                particle.style.opacity = '0';
            });

            setTimeout(() => particle.remove(), 700);
        }
    }
}
