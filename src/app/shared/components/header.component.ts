import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DishService } from '../../core/services/dish.service';
import { ExportImportService } from '../../core/services/export-import.service';
import { FavoritesService } from '../../core/services/favorites.service';
import { ThemeService } from '../../core/services/theme.service';

@Component({
    selector: 'app-header',
    imports: [RouterLink],
    template: `
        <header class="header" role="banner">
            <div class="header-container">
                <a class="logo" routerLink="/" (click)="onLogoClick($event)">
                    <span class="logo-text">The Dish Archive</span>
                    <span class="logo-subtitle">колекція рецептів</span>
                </a>
                <nav class="header-actions" aria-label="Main actions">
                    <button
                        class="icon-button theme-toggle"
                        (click)="themeService.toggle()"
                        [title]="themeService.theme() === 'light' ? 'Темна тема' : 'Світла тема'"
                        [attr.aria-label]="themeService.theme() === 'light' ? 'Темна тема' : 'Світла тема'">
                        <span class="material-symbols-outlined">
                            {{ themeService.theme() === 'light' ? 'dark_mode' : 'light_mode' }}
                        </span>
                    </button>
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

        @if (showEasterEgg()) {
            <div class="easter-egg-overlay" (click)="showEasterEgg.set(false)">
                <div class="easter-egg-content" (click)="$event.stopPropagation()">
                    <div class="easter-egg-emoji">💛</div>
                    <p class="easter-egg-text">
                        Цей додаток зроблений<br>
                        спеціально для Булкіної ❤️
                    </p>
                    <p class="easter-egg-sub">
                        Найкраща кухарка у всесвіті ✨
                    </p>
                    <button class="easter-egg-close" (click)="showEasterEgg.set(false)">
                        Дякую 🥰
                    </button>
                </div>
            </div>
        }
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
            transition: background-color 0.3s ease;

            :host-context([data-theme='dark']) & {
                background: rgba(26, 26, 26, 0.88);
            }
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

        // Easter Egg Overlay
        .easter-egg-overlay {
            position: fixed;
            inset: 0;
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--color-backdrop);
            backdrop-filter: blur(12px);
            animation: fadeIn 0.3s ease;
        }

        .easter-egg-content {
            text-align: center;
            padding: var(--space-10) var(--space-8);
            background: var(--color-surface);
            border-radius: var(--radius-xl);
            box-shadow: var(--shadow-xl);
            max-width: 360px;
            margin: var(--space-5);
            animation: easterEggPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .easter-egg-emoji {
            font-size: 64px;
            margin-bottom: var(--space-4);
            animation: preloaderFloat 2s ease-in-out infinite;
        }

        .easter-egg-text {
            font-family: var(--font-display);
            font-size: var(--text-xl);
            font-weight: var(--weight-semibold);
            color: var(--color-text-primary);
            line-height: var(--leading-relaxed);
            margin-bottom: var(--space-2);
        }

        .easter-egg-sub {
            font-size: var(--text-sm);
            color: var(--color-text-secondary);
            margin-bottom: var(--space-6);
        }

        .easter-egg-close {
            display: inline-flex;
            padding: var(--space-2) var(--space-6);
            background: var(--color-accent);
            color: var(--color-text-inverse);
            font-weight: var(--weight-medium);
            font-size: var(--text-sm);
            border-radius: var(--radius-full);
            transition: background-color var(--transition-fast),
                        transform var(--transition-fast);

            &:hover {
                background: var(--color-accent-hover);
                transform: scale(1.05);
            }
        }

        @keyframes easterEggPop {
            0% {
                opacity: 0;
                transform: scale(0.8) translateY(20px);
            }
            100% {
                opacity: 1;
                transform: scale(1) translateY(0);
            }
        }

        @keyframes preloaderFloat {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-8px); }
        }
    `,
})
export class HeaderComponent {
    protected readonly dishService = inject(DishService);
    protected readonly favoritesService = inject(FavoritesService);
    protected readonly themeService = inject(ThemeService);
    private readonly exportImportService = inject(ExportImportService);

    protected readonly showEasterEgg = signal(false);
    private logoClickCount = 0;
    private logoClickTimer: ReturnType<typeof setTimeout> | null = null;

    protected onLogoClick(event: Event): void {
        event.preventDefault();
        this.logoClickCount++;

        if (this.logoClickTimer) clearTimeout(this.logoClickTimer);
        this.logoClickTimer = setTimeout(() => (this.logoClickCount = 0), 2000);

        if (this.logoClickCount >= 5) {
            this.logoClickCount = 0;
            this.showEasterEgg.set(true);
        }
    }

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
