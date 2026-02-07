import { ChangeDetectionStrategy, Component, computed, inject, output } from '@angular/core';
import { ExportImportService } from '../../core/services/export-import.service';
import { FavoritesService } from '../../core/services/favorites.service';
import { CookRank, RANKS, RankService } from '../../core/services/rank.service';
import { ThemeService } from '../../core/services/theme.service';
import { RankBadgeComponent } from './rank-badge.component';

@Component({
    selector: 'app-profile-drawer',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RankBadgeComponent],
    template: `
        <div class="backdrop" (click)="closed.emit()"></div>
        <aside class="drawer" role="dialog" aria-label="Профіль кулінара">
            <!-- Header -->
            <div class="drawer-header">
                <h2 class="drawer-title">Кулінарний профіль</h2>
                <button class="close-btn" (click)="closed.emit()" aria-label="Закрити">
                    <span class="material-symbols-outlined">close</span>
                </button>
            </div>

            <!-- Current rank -->
            <div class="current-rank" [style.--rank-color]="rankService.currentRank().color"
                 [style.--rank-glow]="rankService.currentRank().glow">
                <div class="rank-badge-wrap">
                    <app-rank-badge [rank]="rankService.currentRank()" [size]="72" />
                </div>
                <div class="rank-info">
                    <span class="rank-title">{{ rankService.currentRank().title }}</span>
                    <span class="rank-subtitle">{{ rankService.currentRank().subtitle }}</span>
                    <span class="rank-dishes-count">{{ rankService.totalDishes() }} страв у колекції</span>
                </div>
            </div>

            <!-- Progress -->
            @if (rankService.nextRank(); as next) {
                <div class="progress-section">
                    <div class="progress-header">
                        <span class="progress-label">
                            До «{{ next.title }}»
                        </span>
                        <span class="progress-count">
                            {{ rankService.totalDishes() }} / {{ next.threshold }}
                        </span>
                    </div>
                    <div class="progress-track">
                        <div class="progress-fill" [style.width.%]="rankService.progress()"
                             [style.background]="next.color"></div>
                    </div>
                    <span class="progress-pct">{{ rankService.progress() }}%</span>
                </div>
            } @else {
                <div class="progress-section maxed">
                    <span class="maxed-label">✨ Максимальне звання досягнуто! ✨</span>
                </div>
            }

            <!-- Stats -->
            <div class="stats-row">
                <div class="stat-item">
                    <span class="stat-value">{{ rankService.totalDishes() }}</span>
                    <span class="stat-label">страв</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">{{ favoritesService.count() }}</span>
                    <span class="stat-label">обраних</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">{{ rankService.currentRank().id }}</span>
                    <span class="stat-label">рівень</span>
                </div>
            </div>

            <!-- Settings -->
            <div class="settings-section">
                <h3 class="section-label">Налаштування</h3>
                <div class="settings-list">
                    <button class="setting-row" (click)="themeService.toggle()">
                        <span class="material-symbols-outlined setting-icon">
                            {{ themeService.theme() === 'light' ? 'dark_mode' : 'light_mode' }}
                        </span>
                        <span class="setting-text">
                            {{ themeService.theme() === 'light' ? 'Темна тема' : 'Світла тема' }}
                        </span>
                        <span class="setting-hint">
                            {{ themeService.theme() === 'light' ? 'Вимкнено' : 'Увімкнено' }}
                        </span>
                    </button>
                    <button class="setting-row" (click)="handleExport()">
                        <span class="material-symbols-outlined setting-icon">download</span>
                        <span class="setting-text">Експорт даних</span>
                        <span class="material-symbols-outlined setting-arrow">chevron_right</span>
                    </button>
                </div>
            </div>

            <!-- All ranks -->
            <div class="all-ranks-section">
                <h3 class="section-label">Всі звання <span class="rank-count-label">{{ unlockedCount() }} / {{ totalRanks }}</span></h3>
                <div class="ranks-grid">
                    @for (rank of allRanks; track rank.id) {
                        <div class="rank-card" [class.locked]="!isUnlocked(rank)"
                             [class.current]="rank.id === rankService.currentRank().id">
                            <app-rank-badge [rank]="rank" [size]="32" />
                            <div class="rank-card-info">
                                <span class="rank-card-title" [class.locked-text]="!isUnlocked(rank)">
                                    {{ rank.title }}
                                </span>
                                <span class="rank-card-req">
                                    @if (isUnlocked(rank)) {
                                        ✓ Відкрито
                                    } @else {
                                        {{ rank.threshold }} страв
                                    }
                                </span>
                            </div>
                        </div>
                    }
                </div>
            </div>
        </aside>
    `,
    styles: `
        @use 'mixins' as m;

        :host {
            position: fixed;
            inset: 0;
            z-index: 10000;
            display: flex;
            justify-content: flex-end;
            animation: drawerFadeIn .2s ease;
        }

        .backdrop {
            position: absolute;
            inset: 0;
            background: var(--color-backdrop);
            backdrop-filter: blur(6px);
        }

        .drawer {
            position: relative;
            width: 360px;
            max-width: 100vw;
            height: 100%;
            height: 100dvh;
            background: var(--color-bg);
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
            padding: var(--space-4);
            padding-bottom: calc(var(--space-8) + env(safe-area-inset-bottom));
            box-shadow: var(--shadow-xl);
            animation: drawerSlideIn .3s cubic-bezier(.25,.8,.25,1);

            :host-context([data-theme='dark']) & {
                background: #1a1a1a;
            }

            @media (max-width: 480px) {
                width: 100vw;
                padding: var(--space-3);
                padding-bottom: calc(var(--space-8) + env(safe-area-inset-bottom));
            }
        }

        .drawer-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: var(--space-4);
            padding-top: env(safe-area-inset-top);
        }

        .drawer-title {
            font-family: var(--font-display);
            font-size: var(--text-lg);
            font-weight: var(--weight-semibold);
            color: var(--color-text-primary);
        }

        .close-btn {
            @include m.tap-target(40px);
            border-radius: var(--radius-sm);
            color: var(--color-text-secondary);
            transition: color var(--transition-fast), background var(--transition-fast);
            cursor: pointer;
            &:hover {
                color: var(--color-text-primary);
                background: var(--color-surface-hover);
            }
        }

        // ── Current Rank ───
        .current-rank {
            display: flex;
            align-items: center;
            gap: var(--space-3);
            padding: var(--space-4);
            background: var(--color-surface);
            border-radius: var(--radius-md);
            box-shadow: 0 0 20px var(--rank-glow, transparent);
            margin-bottom: var(--space-4);
            transition: box-shadow .3s;

            :host-context([data-theme='dark']) & {
                background: #242424;
            }
        }

        .rank-badge-wrap {
            flex-shrink: 0;
            animation: badgePulse 3s ease-in-out infinite;
        }

        .rank-info {
            display: flex;
            flex-direction: column;
            gap: 2px;
            min-width: 0;
        }

        .rank-title {
            font-family: var(--font-display);
            font-size: var(--text-lg);
            font-weight: var(--weight-semibold);
            color: var(--color-text-primary);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .rank-subtitle {
            font-size: var(--text-xs);
            color: var(--color-text-secondary);
        }

        .rank-dishes-count {
            font-size: var(--text-xs);
            color: var(--color-text-tertiary);
            margin-top: 2px;
        }

        // ── Progress ───
        .progress-section {
            margin-bottom: var(--space-4);
            &.maxed {
                text-align: center;
                padding: var(--space-3);
            }
        }

        .progress-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: var(--space-1);
        }

        .progress-label {
            font-size: var(--text-sm);
            color: var(--color-text-secondary);
            font-weight: var(--weight-medium);
        }

        .progress-count {
            font-size: var(--text-xs);
            color: var(--color-text-tertiary);
            font-variant-numeric: tabular-nums;
        }

        .progress-track {
            height: 6px;
            background: var(--color-border-light);
            border-radius: var(--radius-full);
            overflow: hidden;
            margin-bottom: 3px;

            :host-context([data-theme='dark']) & {
                background: #333;
            }
        }

        .progress-fill {
            height: 100%;
            border-radius: var(--radius-full);
            transition: width .6s cubic-bezier(.25,.8,.25,1);
        }

        .progress-pct {
            font-size: var(--text-xs);
            color: var(--color-text-tertiary);
        }

        .maxed-label {
            font-family: var(--font-display);
            font-size: var(--text-md);
            color: #FFD700;
        }

        // ── Stats Row ───
        .stats-row {
            display: flex;
            gap: var(--space-2);
            margin-bottom: var(--space-5);
        }

        .stat-item {
            flex: 1;
            text-align: center;
            padding: var(--space-2) var(--space-1);
            background: var(--color-surface);
            border-radius: var(--radius-sm);

            :host-context([data-theme='dark']) & {
                background: #242424;
            }
        }

        .stat-value {
            display: block;
            font-family: var(--font-display);
            font-size: var(--text-md);
            font-weight: var(--weight-semibold);
            color: var(--color-text-primary);
        }

        .stat-label {
            font-size: var(--text-xs);
            color: var(--color-text-tertiary);
        }

        // ── Settings ───
        .settings-section {
            margin-bottom: var(--space-5);
        }

        .section-label {
            font-size: var(--text-sm);
            font-weight: var(--weight-semibold);
            color: var(--color-text-primary);
            margin-bottom: var(--space-2);
            display: flex;
            align-items: center;
            gap: var(--space-2);
        }

        .rank-count-label {
            font-size: var(--text-xs);
            color: var(--color-text-tertiary);
            font-weight: var(--weight-regular);
        }

        .settings-list {
            display: flex;
            flex-direction: column;
            gap: 1px;
            background: var(--color-border-light);
            border-radius: var(--radius-sm);
            overflow: hidden;

            :host-context([data-theme='dark']) & {
                background: #333;
            }
        }

        .setting-row {
            display: flex;
            align-items: center;
            gap: var(--space-3);
            padding: var(--space-3) var(--space-4);
            background: var(--color-surface);
            cursor: pointer;
            transition: background var(--transition-fast);
            border: none;
            width: 100%;
            text-align: left;
            font-family: var(--font-body);

            &:hover { background: var(--color-surface-hover); }

            :host-context([data-theme='dark']) & {
                background: #242424;
                &:hover { background: #2a2a2a; }
            }
        }

        .setting-icon {
            font-size: 20px;
            color: var(--color-text-secondary);
        }

        .setting-text {
            flex: 1;
            font-size: var(--text-sm);
            color: var(--color-text-primary);
            font-weight: var(--weight-medium);
        }

        .setting-hint {
            font-size: var(--text-xs);
            color: var(--color-text-tertiary);
        }

        .setting-arrow {
            font-size: 18px;
            color: var(--color-text-tertiary);
        }

        // ── All Ranks Grid ───
        .all-ranks-section {
            margin-bottom: var(--space-4);
        }

        .ranks-grid {
            display: flex;
            flex-direction: column;
            gap: 2px;
        }

        .rank-card {
            display: flex;
            align-items: center;
            gap: var(--space-2);
            padding: var(--space-2) var(--space-3);
            border-radius: var(--radius-sm);
            background: var(--color-surface);
            transition: opacity .2s;

            :host-context([data-theme='dark']) & {
                background: #242424;
            }

            &.locked {
                opacity: 0.35;
                app-rank-badge { filter: grayscale(1); }
            }

            &.current {
                outline: 2px solid var(--color-accent);
                outline-offset: -2px;
            }
        }

        .rank-card-info {
            display: flex;
            flex-direction: column;
            gap: 1px;
            min-width: 0;
        }

        .rank-card-title {
            font-size: var(--text-sm);
            font-weight: var(--weight-medium);
            color: var(--color-text-primary);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;

            &.locked-text { color: var(--color-text-tertiary); }
        }

        .rank-card-req {
            font-size: var(--text-xs);
            color: var(--color-text-tertiary);
        }

        // ── Animations ───
        @keyframes drawerFadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        @keyframes drawerSlideIn {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
        }

        @keyframes badgePulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
        }
    `,
})
export class ProfileDrawerComponent {
    protected readonly rankService = inject(RankService);
    protected readonly themeService = inject(ThemeService);
    protected readonly favoritesService = inject(FavoritesService);
    private readonly exportImportService = inject(ExportImportService);
    readonly closed = output<void>();

    readonly allRanks = RANKS;
    readonly totalRanks = RANKS.length;

    readonly unlockedCount = computed(() =>
        RANKS.filter(r => r.threshold <= this.rankService.totalDishes()).length
    );

    isUnlocked(rank: CookRank): boolean {
        return this.rankService.totalDishes() >= rank.threshold;
    }

    handleExport(): void {
        this.exportImportService.exportToJson();
    }
}
