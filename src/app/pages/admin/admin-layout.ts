import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
    selector: 'app-admin-layout',
    imports: [RouterLink, RouterLinkActive, RouterOutlet],
    template: `
        <div class="admin">
            <header class="admin-header">
                <div class="admin-header-inner">
                    <div class="admin-brand">
                        <a routerLink="/" class="back-link" title="До каталогу">
                            <span class="material-symbols-outlined">arrow_back</span>
                        </a>
                        <div>
                            <h1 class="admin-title">Панель адміністратора</h1>
                            <p class="admin-subtitle">{{ auth.displayName() }}</p>
                        </div>
                    </div>
                    <span class="admin-badge">
                        <span class="material-symbols-outlined">shield_person</span>
                        Super admin
                    </span>
                </div>
                <nav class="admin-nav" aria-label="Розділи адміністратора">
                    @for (item of navItems; track item.path) {
                        <a
                            [routerLink]="item.path"
                            routerLinkActive="active"
                            [routerLinkActiveOptions]="{ exact: item.exact }"
                            class="admin-nav-link">
                            <span class="material-symbols-outlined">{{ item.icon }}</span>
                            <span>{{ item.label }}</span>
                        </a>
                    }
                </nav>
            </header>

            <main class="admin-content">
                <router-outlet />
            </main>
        </div>
    `,
    styles: [`
        :host { display: block; min-height: 100dvh; background: var(--color-bg); }
        .admin-header {
            position: sticky; top: 0; z-index: var(--z-sticky);
            background: color-mix(in srgb, var(--color-surface) 88%, transparent);
            backdrop-filter: blur(12px);
            border-bottom: 1px solid var(--color-border);
        }
        .admin-header-inner {
            max-width: var(--container-max); margin: 0 auto;
            padding: var(--space-4) var(--space-5) 0;
            display: flex; align-items: center; justify-content: space-between; gap: var(--space-4);
        }
        .admin-brand { display: flex; align-items: center; gap: var(--space-3); min-width: 0; }
        .back-link {
            display: inline-flex; align-items: center; justify-content: center;
            width: 40px; height: 40px; border-radius: var(--radius-full);
            color: var(--color-text-secondary); background: var(--color-surface-hover);
            flex: none; transition: background var(--transition-base);
        }
        .back-link:hover { background: var(--color-surface-active); color: var(--color-text-primary); }
        .admin-title {
            font-family: var(--font-display); font-size: var(--text-xl); font-weight: var(--weight-bold);
            letter-spacing: -0.02em; margin: 0; color: var(--color-text-primary); line-height: 1.1;
        }
        .admin-subtitle {
            margin: 2px 0 0; font-size: var(--text-xs); color: var(--color-text-tertiary);
            overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .admin-badge {
            display: inline-flex; align-items: center; gap: var(--space-1);
            padding: 6px 12px; border-radius: var(--radius-full);
            background: var(--color-accent-light); color: var(--color-accent-dark);
            font-size: var(--text-xs); font-weight: var(--weight-semibold); flex: none;
        }
        .admin-badge .material-symbols-outlined { font-size: 16px; }
        .admin-nav {
            max-width: var(--container-max); margin: 0 auto;
            padding: var(--space-3) var(--space-5) 0;
            display: flex; gap: var(--space-1); overflow-x: auto; scrollbar-width: none;
        }
        .admin-nav::-webkit-scrollbar { display: none; }
        .admin-nav-link {
            display: inline-flex; align-items: center; gap: var(--space-2);
            padding: var(--space-3) var(--space-4); border-radius: var(--radius-md) var(--radius-md) 0 0;
            color: var(--color-text-secondary); font-size: var(--text-sm); font-weight: var(--weight-medium);
            white-space: nowrap; border-bottom: 2px solid transparent; transition: color var(--transition-base);
        }
        .admin-nav-link .material-symbols-outlined { font-size: 20px; }
        .admin-nav-link:hover { color: var(--color-text-primary); }
        .admin-nav-link.active { color: var(--color-accent); border-bottom-color: var(--color-accent); }
        .admin-content {
            max-width: var(--container-max); margin: 0 auto;
            padding: var(--space-6) var(--space-5) var(--space-16);
        }
    `],
})
export class AdminLayoutPage {
    protected readonly auth = inject(AuthService);

    protected readonly navItems = [
        { path: '/admin', label: 'Огляд', icon: 'dashboard', exact: true },
        { path: '/admin/access-requests', label: 'Запити', icon: 'how_to_reg', exact: false },
        { path: '/admin/families', label: 'Родини', icon: 'diversity_3', exact: false },
        { path: '/admin/users', label: 'Користувачі', icon: 'group', exact: false },
        { path: '/admin/activity', label: 'Активність', icon: 'history', exact: false },
    ];
}
