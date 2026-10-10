import { Component, input } from '@angular/core';

@Component({
    selector: 'app-empty-state',
    template: `
        <div class="empty-state" role="status">
            <span class="material-symbols-outlined empty-icon">{{ icon() }}</span>
            <h3 class="empty-title">{{ title() }}</h3>
            <p class="empty-description">{{ description() }}</p>
            <ng-content />
        </div>
    `,
    styles: `
        .empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: var(--space-16) var(--space-6);
            text-align: center;
        }

        .empty-icon {
            font-size: 56px;
            color: var(--color-border);
            margin-bottom: var(--space-4);
            font-variation-settings: 'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 48;
        }

        .empty-title {
            font-family: var(--font-display);
            font-size: var(--text-xl);
            font-weight: var(--weight-medium);
            color: var(--color-text-primary);
            margin-bottom: var(--space-2);
        }

        .empty-description {
            font-size: var(--text-sm);
            color: var(--color-text-tertiary);
            max-width: 320px;
            line-height: var(--leading-relaxed);
        }

        :host ::ng-deep .empty-action {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            margin-top: var(--space-5);
            padding: 11px 20px;
            border-radius: var(--radius-full);
            background: var(--color-accent);
            color: var(--color-text-inverse);
            font-size: var(--text-sm);
            font-weight: var(--weight-semibold);
            cursor: pointer;
        }

        :host ::ng-deep .empty-action .material-symbols-outlined {
            font-size: 18px;
        }
    `,
})
export class EmptyStateComponent {
    readonly icon = input('search_off');
    readonly title = input('Нічого не знайдено');
    readonly description = input('Спробуйте змінити параметри пошуку або фільтрів');
}
