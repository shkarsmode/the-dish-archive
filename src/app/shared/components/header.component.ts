import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DishService } from '../../core/services/dish.service';
import { ExportImportService } from '../../core/services/export-import.service';
import { FavoritesService } from '../../core/services/favorites.service';

@Component({
    selector: 'app-header',
    imports: [RouterLink],
    template: `
        <header class="header" role="banner">
            <div class="header-container">
                <a class="logo" routerLink="/">
                    <span class="logo-text">The Dish Archive</span>
                    <span class="logo-subtitle">колекція рецептів</span>
                </a>
                <nav class="header-actions" aria-label="Main actions">
                    <button
                        class="icon-button"
                        (click)="handleExport()"
                        title="Експорт даних"
                        aria-label="Експорт даних">
                        <span class="material-symbols-outlined">download</span>
                    </button>
                    <label
                        class="icon-button"
                        title="Імпорт даних"
                        aria-label="Імпорт даних"
                        tabindex="0"
                        role="button"
                        (keydown.enter)="importInput.click()">
                        <span class="material-symbols-outlined">upload</span>
                        <input
                            #importInput
                            type="file"
                            accept=".json"
                            class="sr-only"
                            (change)="handleImport($event)" />
                    </label>
                    <button
                        class="icon-button favorites-indicator"
                        [class.active]="dishService.filters().favoritesOnly"
                        (click)="toggleFavorites()"
                        title="Обране"
                        aria-label="Обране"
                        [attr.aria-pressed]="dishService.filters().favoritesOnly">
                        <span class="material-symbols-outlined" [class.filled]="favoritesService.count() > 0">
                            favorite
                        </span>
                        @if (favoritesService.count() > 0) {
                            <span class="badge">{{ favoritesService.count() }}</span>
                        }
                    </button>
                </nav>
            </div>
        </header>
    `,
    styles: `
        @use 'mixins' as m;

        .header {
            position: sticky;
            top: 0;
            z-index: var(--z-sticky);
            height: var(--header-height);
            background: rgba(250, 250, 247, 0.88);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border-bottom: 1px solid var(--color-border-light);
        }

        .header-container {
            @include m.container;
            @include m.flex-between;
            height: 100%;
        }

        .logo {
            display: flex;
            flex-direction: column;
            gap: 0;
            text-decoration: none;
            transition: opacity var(--transition-fast);

            &:hover { opacity: 0.8; }
        }

        .logo-text {
            font-family: var(--font-display);
            font-size: var(--text-xl);
            font-weight: var(--weight-semibold);
            color: var(--color-text-primary);
            letter-spacing: -0.01em;
            line-height: 1.1;

            @include m.tablet {
                font-size: var(--text-2xl);
            }
        }

        .logo-subtitle {
            font-size: var(--text-xs);
            color: var(--color-text-tertiary);
            font-weight: var(--weight-regular);
            letter-spacing: 0.06em;
            text-transform: uppercase;
        }

        .header-actions {
            display: flex;
            align-items: center;
            gap: var(--space-1);
        }

        .icon-button {
            @include m.tap-target(40px);
            border-radius: var(--radius-sm);
            color: var(--color-text-secondary);
            transition: color var(--transition-fast),
                        background-color var(--transition-fast);
            cursor: pointer;

            &:hover {
                color: var(--color-text-primary);
                background-color: var(--color-surface-hover);
            }

            &:focus-visible {
                outline: 2px solid var(--color-accent);
                outline-offset: 2px;
            }

            .material-symbols-outlined {
                font-size: 22px;
            }
        }

        .favorites-indicator {
            position: relative;

            .filled {
                color: var(--color-favorite);
                font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24;
            }

            &.active {
                background-color: var(--color-error-light);
                color: var(--color-favorite);
            }
        }

        .badge {
            position: absolute;
            top: 4px;
            right: 4px;
            min-width: 16px;
            height: 16px;
            padding: 0 4px;
            background: var(--color-accent);
            color: var(--color-text-inverse);
            font-size: 10px;
            font-weight: var(--weight-semibold);
            line-height: 16px;
            text-align: center;
            border-radius: var(--radius-full);
        }
    `,
})
export class HeaderComponent {
    protected readonly dishService = inject(DishService);
    protected readonly favoritesService = inject(FavoritesService);
    private readonly exportImportService = inject(ExportImportService);

    protected toggleFavorites(): void {
        const current = this.dishService.filters().favoritesOnly;
        this.dishService.updateFilters({ favoritesOnly: !current });
    }

    protected handleExport(): void {
        this.exportImportService.exportToJson();
    }

    protected handleImport(event: Event): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (file) {
            this.exportImportService.importFromJson(file);
            input.value = '';
        }
    }
}
