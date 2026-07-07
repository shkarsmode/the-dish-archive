import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminDataService } from '../../core/services/admin-data.service';

@Component({
    selector: 'app-admin-dashboard',
    imports: [RouterLink],
    template: `
        <section class="cards">
            @for (card of cards(); track card.label) {
                <a [routerLink]="card.link" class="stat-card" [style.--tint]="card.tint">
                    <span class="stat-icon material-symbols-outlined">{{ card.icon }}</span>
                    <span class="stat-value">{{ card.value }}</span>
                    <span class="stat-label">{{ card.label }}</span>
                </a>
            }
        </section>

        @if ((data.stats()?.pendingRequests ?? 0) > 0) {
            <a routerLink="/admin/access-requests" class="pending-banner">
                <span class="material-symbols-outlined">notifications_active</span>
                <span class="pending-text">
                    {{ data.stats()?.pendingRequests }} нових {{ pluralRequests(data.stats()!.pendingRequests) }} на розгляд
                </span>
                <span class="material-symbols-outlined chevron">chevron_right</span>
            </a>
        }

        <div class="panel">
            <div class="panel-head">
                <h2 class="panel-title">Родини</h2>
                <a routerLink="/admin/families" class="panel-action">Керувати</a>
            </div>
            @if (data.families().length === 0) {
                <p class="empty">Ще немає жодної родини. Створіть першу у розділі «Родини».</p>
            } @else {
                <ul class="family-list">
                    @for (family of data.families().slice(0, 6); track family.id) {
                        <li class="family-row">
                            <span class="family-dot" [style.background]="family.themeColor || 'var(--color-accent)'"></span>
                            <span class="family-name">{{ family.name }}</span>
                            <span class="family-slug">/{{ family.slug }}</span>
                            <span class="family-status" [class.archived]="family.status === 'archived'">
                                {{ family.status === 'archived' ? 'Архів' : 'Активна' }}
                            </span>
                        </li>
                    }
                </ul>
            }
        </div>
    `,
    styles: [`
        :host { display: block; }
        .cards {
            display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: var(--space-4); margin-bottom: var(--space-6);
        }
        .stat-card {
            display: flex; flex-direction: column; gap: var(--space-1);
            padding: var(--space-5); border-radius: var(--radius-lg);
            background: var(--color-surface); border: 1px solid var(--color-border);
            box-shadow: var(--shadow-card); transition: transform var(--transition-spring), box-shadow var(--transition-base);
        }
        .stat-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-card-hover); }
        .stat-icon {
            font-size: 26px; color: var(--tint, var(--color-accent));
            width: 44px; height: 44px; display: grid; place-items: center;
            border-radius: var(--radius-md);
            background: color-mix(in srgb, var(--tint, var(--color-accent)) 14%, transparent);
            margin-bottom: var(--space-2);
        }
        .stat-value {
            font-family: var(--font-display); font-size: var(--text-3xl);
            font-weight: var(--weight-bold); color: var(--color-text-primary); line-height: 1;
        }
        .stat-label { font-size: var(--text-sm); color: var(--color-text-secondary); }
        .pending-banner {
            display: flex; align-items: center; gap: var(--space-3);
            padding: var(--space-4) var(--space-5); border-radius: var(--radius-lg);
            background: var(--color-warning-light); border: 1px solid color-mix(in srgb, var(--color-warning) 40%, transparent);
            color: var(--color-text-primary); margin-bottom: var(--space-6); font-weight: var(--weight-medium);
        }
        .pending-banner .material-symbols-outlined { color: var(--color-warning); }
        .pending-text { flex: 1; }
        .pending-banner .chevron { color: var(--color-text-tertiary); }
        .panel {
            background: var(--color-surface); border: 1px solid var(--color-border);
            border-radius: var(--radius-lg); padding: var(--space-5); box-shadow: var(--shadow-card);
        }
        .panel-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-4); }
        .panel-title {
            font-family: var(--font-display); font-size: var(--text-lg);
            font-weight: var(--weight-semibold); margin: 0; color: var(--color-text-primary);
        }
        .panel-action { font-size: var(--text-sm); color: var(--color-accent); font-weight: var(--weight-medium); }
        .empty { color: var(--color-text-tertiary); font-size: var(--text-sm); margin: 0; padding: var(--space-4) 0; }
        .family-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
        .family-row {
            display: flex; align-items: center; gap: var(--space-3);
            padding: var(--space-3) 0; border-bottom: 1px solid var(--color-border-light);
        }
        .family-row:last-child { border-bottom: none; }
        .family-dot { width: 10px; height: 10px; border-radius: var(--radius-full); flex: none; }
        .family-name { font-weight: var(--weight-medium); color: var(--color-text-primary); }
        .family-slug { color: var(--color-text-tertiary); font-size: var(--text-sm); }
        .family-status {
            margin-left: auto; font-size: var(--text-xs); font-weight: var(--weight-semibold);
            padding: 3px 10px; border-radius: var(--radius-full);
            background: var(--color-success-light); color: var(--color-success);
        }
        .family-status.archived { background: var(--color-surface-active); color: var(--color-text-tertiary); }
    `],
})
export class AdminDashboardPage {
    protected readonly data = inject(AdminDataService);

    protected readonly cards = computed(() => {
        const stats = this.data.stats();
        return [
            { label: 'Родини', value: stats?.families ?? '—', icon: 'diversity_3', tint: '#B8926A', link: '/admin/families' },
            { label: 'Рецепти', value: stats?.dishes ?? '—', icon: 'restaurant', tint: '#7B8E6F', link: '/' },
            { label: 'Користувачі', value: stats?.users ?? '—', icon: 'group', tint: '#8a6db8', link: '/admin/users' },
            { label: 'Очікують', value: stats?.pendingRequests ?? '—', icon: 'how_to_reg', tint: '#D4A843', link: '/admin/access-requests' },
        ];
    });

    constructor() {
        void this.data.loadStats();
        void this.data.loadFamilies();
    }

    protected pluralRequests(count: number): string {
        const mod10 = count % 10;
        const mod100 = count % 100;
        if (mod10 === 1 && mod100 !== 11) return 'запит';
        if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'запити';
        return 'запитів';
    }
}
