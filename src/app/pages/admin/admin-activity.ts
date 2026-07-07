import { Component, inject } from '@angular/core';
import { AdminDataService } from '../../core/services/admin-data.service';

const ACTION_META: Record<string, { icon: string; label: string }> = {
    created: { icon: 'add_circle', label: 'створив(ла)' },
    approved: { icon: 'how_to_reg', label: 'схвалив(ла)' },
    rejected: { icon: 'cancel', label: 'відхилив(ла)' },
    requested: { icon: 'pending', label: 'запросив(ла) доступ' },
    role_changed: { icon: 'manage_accounts', label: 'змінив(ла) роль' },
    removed: { icon: 'person_remove', label: 'видалив(ла)' },
    added: { icon: 'person_add', label: 'додав(ла)' },
};

@Component({
    selector: 'app-admin-activity',
    imports: [],
    template: `
        <div class="page-head">
            <h2 class="page-title">Активність</h2>
            <p class="page-hint">Хто що робив у системі</p>
        </div>

        @if (data.activity().length === 0) {
            <div class="empty-state">
                <span class="material-symbols-outlined">history</span>
                <p>Поки що немає подій</p>
            </div>
        } @else {
            <ol class="feed">
                @for (entry of data.activity(); track entry.id) {
                    <li class="feed-item">
                        <span class="feed-icon material-symbols-outlined">{{ meta(entry.action).icon }}</span>
                        <div class="feed-body">
                            <p class="feed-text">
                                <strong>{{ entry.actorDisplayName || entry.actorEmail || 'Хтось' }}</strong>
                                {{ meta(entry.action).label }}
                                <span class="feed-entity">{{ entry.entityType }}</span>
                                @if (entry.familyName) { <span class="feed-family">· {{ entry.familyName }}</span> }
                            </p>
                            <time class="feed-time">{{ formatTime(entry.createdAt) }}</time>
                        </div>
                    </li>
                }
            </ol>
        }
    `,
    styles: [`
        :host { display: block; }
        .page-head { margin-bottom: var(--space-5); }
        .page-title { font-family: var(--font-display); font-size: var(--text-2xl); font-weight: var(--weight-bold); margin: 0 0 var(--space-1); color: var(--color-text-primary); }
        .page-hint { color: var(--color-text-secondary); font-size: var(--text-sm); margin: 0; }
        .feed { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
        .feed-item { display: flex; gap: var(--space-3); padding: var(--space-3) 0; border-bottom: 1px solid var(--color-border-light); }
        .feed-item:last-child { border-bottom: none; }
        .feed-icon {
            width: 36px; height: 36px; flex: none; display: grid; place-items: center; font-size: 20px;
            border-radius: var(--radius-full); background: var(--color-accent-light); color: var(--color-accent-dark);
        }
        .feed-body { min-width: 0; }
        .feed-text { margin: 0; color: var(--color-text-secondary); font-size: var(--text-sm); line-height: var(--leading-normal); }
        .feed-text strong { color: var(--color-text-primary); font-weight: var(--weight-semibold); }
        .feed-entity { color: var(--color-accent); }
        .feed-family { color: var(--color-text-tertiary); }
        .feed-time { font-size: var(--text-xs); color: var(--color-text-tertiary); }
        .empty-state { text-align: center; padding: var(--space-16) var(--space-4); color: var(--color-text-tertiary); }
        .empty-state .material-symbols-outlined { font-size: 48px; opacity: 0.6; }
        .empty-state p { margin: var(--space-3) 0 0; }
    `],
})
export class AdminActivityPage {
    protected readonly data = inject(AdminDataService);

    constructor() {
        void this.data.loadActivity();
    }

    protected meta(action: string) {
        return ACTION_META[action] ?? { icon: 'bolt', label: action };
    }

    protected formatTime(iso: string): string {
        const date = new Date(iso);
        return date.toLocaleString('uk-UA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    }
}
