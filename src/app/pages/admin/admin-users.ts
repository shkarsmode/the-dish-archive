import { Component, inject } from '@angular/core';
import { AdminDataService } from '../../core/services/admin-data.service';

@Component({
    selector: 'app-admin-users',
    imports: [],
    template: `
        <div class="page-head">
            <h2 class="page-title">Користувачі</h2>
            <p class="page-hint">{{ data.users().length }} зареєстрованих через Google</p>
        </div>

        @if (data.users().length === 0) {
            <div class="empty-state">
                <span class="material-symbols-outlined">group</span>
                <p>Ще немає користувачів</p>
            </div>
        } @else {
            <div class="user-list">
                @for (user of data.users(); track user.id) {
                    <article class="user-card">
                        @if (user.avatarUrl) {
                            <img class="avatar" [src]="user.avatarUrl" alt="" referrerpolicy="no-referrer">
                        } @else {
                            <span class="avatar avatar-fallback material-symbols-outlined">account_circle</span>
                        }
                        <div class="user-meta">
                            <span class="user-name">{{ user.displayName || user.email }}</span>
                            <span class="user-email">{{ user.email }}</span>
                        </div>
                        @if (user.globalRole === 'super_admin') {
                            <span class="role-badge super">
                                <span class="material-symbols-outlined">shield_person</span> Super admin
                            </span>
                        } @else {
                            <span class="role-badge">Користувач</span>
                        }
                    </article>
                }
            </div>
        }
    `,
    styles: [`
        :host { display: block; }
        .page-head { margin-bottom: var(--space-5); }
        .page-title { font-family: var(--font-display); font-size: var(--text-2xl); font-weight: var(--weight-bold); margin: 0 0 var(--space-1); color: var(--color-text-primary); }
        .page-hint { color: var(--color-text-secondary); font-size: var(--text-sm); margin: 0; }
        .user-list { display: flex; flex-direction: column; gap: var(--space-2); }
        .user-card {
            display: flex; align-items: center; gap: var(--space-3);
            background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg);
            padding: var(--space-3) var(--space-4);
        }
        .avatar { width: 40px; height: 40px; border-radius: var(--radius-full); object-fit: cover; flex: none; }
        .avatar-fallback { display: grid; place-items: center; font-size: 28px; color: var(--color-text-tertiary); background: var(--color-surface-hover); }
        .user-meta { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .user-name { font-weight: var(--weight-medium); color: var(--color-text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .user-email { font-size: var(--text-xs); color: var(--color-text-tertiary); }
        .role-badge {
            margin-left: auto; flex: none; display: inline-flex; align-items: center; gap: 4px;
            font-size: var(--text-xs); font-weight: var(--weight-semibold); padding: 5px 10px; border-radius: var(--radius-full);
            background: var(--color-surface-active); color: var(--color-text-secondary);
        }
        .role-badge.super { background: var(--color-accent-light); color: var(--color-accent-dark); }
        .role-badge .material-symbols-outlined { font-size: 15px; }
        .empty-state { text-align: center; padding: var(--space-16) var(--space-4); color: var(--color-text-tertiary); }
        .empty-state .material-symbols-outlined { font-size: 48px; opacity: 0.6; }
        .empty-state p { margin: var(--space-3) 0 0; }
    `],
})
export class AdminUsersPage {
    protected readonly data = inject(AdminDataService);

    constructor() {
        void this.data.loadUsers();
    }
}
