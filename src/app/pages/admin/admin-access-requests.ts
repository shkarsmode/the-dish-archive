import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminDataService } from '../../core/services/admin-data.service';
import { ToastService } from '../../core/services/toast.service';
import { FAMILY_ROLE_LABELS, FamilyRole } from '../../core/models/family-member.model';

@Component({
    selector: 'app-admin-access-requests',
    imports: [FormsModule],
    template: `
        <div class="page-head">
            <h2 class="page-title">Запити на доступ</h2>
            <p class="page-hint">Підтвердьте користувачів і призначте їх до родини з відповідною роллю.</p>
        </div>

        @if (pending().length > 0) {
            <h3 class="group-label">Очікують ({{ pending().length }})</h3>
            <div class="request-list">
                @for (request of pending(); track request.id) {
                    <article class="request-card">
                        <div class="request-user">
                            @if (request.avatarUrl) {
                                <img class="avatar" [src]="request.avatarUrl" alt="" referrerpolicy="no-referrer">
                            } @else {
                                <span class="avatar avatar-fallback material-symbols-outlined">account_circle</span>
                            }
                            <div class="user-meta">
                                <span class="user-name">{{ request.displayName || request.email }}</span>
                                <span class="user-email">{{ request.email }}</span>
                                @if (request.familyName) {
                                    <span class="requested-family">Просить до: {{ request.familyName }}</span>
                                }
                            </div>
                        </div>

                        <div class="request-controls">
                            <select class="control" [ngModel]="familyFor(request.id)" (ngModelChange)="setFamily(request.id, $event)">
                                <option value="">— Оберіть родину —</option>
                                @for (family of data.families(); track family.id) {
                                    <option [value]="family.id">{{ family.name }}</option>
                                }
                            </select>
                            <select class="control" [ngModel]="roleFor(request.id)" (ngModelChange)="setRole(request.id, $event)">
                                @for (role of roles; track role) {
                                    <option [value]="role">{{ roleLabels[role] }}</option>
                                }
                            </select>
                            <div class="request-actions">
                                <button class="btn approve" (click)="approve(request.id)" [disabled]="busy() === request.id || !familyFor(request.id)">
                                    <span class="material-symbols-outlined">check</span> Схвалити
                                </button>
                                <button class="btn reject" (click)="reject(request.id)" [disabled]="busy() === request.id">
                                    <span class="material-symbols-outlined">close</span> Відхилити
                                </button>
                            </div>
                        </div>
                    </article>
                }
            </div>
        } @else {
            <div class="empty-state">
                <span class="material-symbols-outlined">inbox</span>
                <p>Немає запитів на розгляд</p>
            </div>
        }

        @if (reviewed().length > 0) {
            <h3 class="group-label muted">Опрацьовані</h3>
            <div class="reviewed-list">
                @for (request of reviewed(); track request.id) {
                    <div class="reviewed-row">
                        <span class="user-name">{{ request.displayName || request.email }}</span>
                        <span class="status-pill" [class.rejected]="request.status === 'rejected'">
                            {{ request.status === 'approved' ? 'Схвалено' : 'Відхилено' }}
                        </span>
                    </div>
                }
            </div>
        }
    `,
    styles: [`
        :host { display: block; }
        .page-head { margin-bottom: var(--space-5); }
        .page-title { font-family: var(--font-display); font-size: var(--text-2xl); font-weight: var(--weight-bold); margin: 0 0 var(--space-1); color: var(--color-text-primary); }
        .page-hint { color: var(--color-text-secondary); font-size: var(--text-sm); margin: 0; }
        .group-label { font-size: var(--text-sm); font-weight: var(--weight-semibold); color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.04em; margin: var(--space-6) 0 var(--space-3); }
        .group-label.muted { color: var(--color-text-tertiary); }
        .request-list { display: flex; flex-direction: column; gap: var(--space-4); }
        .request-card {
            background: var(--color-surface); border: 1px solid var(--color-border);
            border-radius: var(--radius-lg); padding: var(--space-5); box-shadow: var(--shadow-card);
            display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--space-4);
        }
        .request-user { display: flex; align-items: center; gap: var(--space-3); min-width: 220px; }
        .avatar { width: 44px; height: 44px; border-radius: var(--radius-full); object-fit: cover; flex: none; }
        .avatar-fallback { display: grid; place-items: center; font-size: 30px; color: var(--color-text-tertiary); background: var(--color-surface-hover); }
        .user-meta { display: flex; flex-direction: column; gap: 2px; }
        .user-name { font-weight: var(--weight-semibold); color: var(--color-text-primary); }
        .user-email { font-size: var(--text-xs); color: var(--color-text-tertiary); }
        .requested-family { font-size: var(--text-xs); color: var(--color-accent); margin-top: 2px; }
        .request-controls { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); }
        .control {
            padding: 10px 12px; border-radius: var(--radius-md); border: 1px solid var(--color-border);
            background: var(--color-surface); color: var(--color-text-primary); font-size: var(--text-sm);
            font-family: var(--font-body); min-height: 42px;
        }
        .request-actions { display: flex; gap: var(--space-2); }
        .btn {
            display: inline-flex; align-items: center; gap: 4px; padding: 10px 14px;
            border: none; border-radius: var(--radius-md); font-size: var(--text-sm); font-weight: var(--weight-semibold);
            cursor: pointer; min-height: 42px; transition: filter var(--transition-base), opacity var(--transition-base);
        }
        .btn .material-symbols-outlined { font-size: 18px; }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn.approve { background: var(--color-success); color: #fff; }
        .btn.reject { background: var(--color-surface-active); color: var(--color-error); }
        .btn.approve:hover:not(:disabled) { filter: brightness(0.95); }
        .empty-state { text-align: center; padding: var(--space-16) var(--space-4); color: var(--color-text-tertiary); }
        .empty-state .material-symbols-outlined { font-size: 48px; opacity: 0.6; }
        .empty-state p { margin: var(--space-3) 0 0; }
        .reviewed-list { display: flex; flex-direction: column; }
        .reviewed-row { display: flex; align-items: center; justify-content: space-between; padding: var(--space-3) 0; border-bottom: 1px solid var(--color-border-light); }
        .status-pill { font-size: var(--text-xs); font-weight: var(--weight-semibold); padding: 3px 10px; border-radius: var(--radius-full); background: var(--color-success-light); color: var(--color-success); }
        .status-pill.rejected { background: var(--color-error-light); color: var(--color-error); }
    `],
})
export class AdminAccessRequestsPage {
    protected readonly data = inject(AdminDataService);
    private readonly toast = inject(ToastService);

    protected readonly roles: FamilyRole[] = ['viewer', 'editor', 'admin', 'owner'];
    protected readonly roleLabels = FAMILY_ROLE_LABELS;
    protected readonly busy = signal<string | null>(null);

    private readonly familySelection = signal<Record<string, string>>({});
    private readonly roleSelection = signal<Record<string, FamilyRole>>({});

    protected readonly pending = computed(() => this.data.accessRequests().filter(r => r.status === 'pending'));
    protected readonly reviewed = computed(() => this.data.accessRequests().filter(r => r.status !== 'pending'));

    constructor() {
        void this.data.loadAccessRequests();
        void this.data.loadFamilies();
    }

    protected familyFor(id: string): string {
        return this.familySelection()[id] ?? this.defaultFamily(id);
    }

    protected roleFor(id: string): FamilyRole {
        return this.roleSelection()[id] ?? 'viewer';
    }

    private defaultFamily(id: string): string {
        const request = this.data.accessRequests().find(r => r.id === id);
        return request?.familyId ?? '';
    }

    protected setFamily(id: string, familyId: string): void {
        this.familySelection.update(current => ({ ...current, [id]: familyId }));
    }

    protected setRole(id: string, role: FamilyRole): void {
        this.roleSelection.update(current => ({ ...current, [id]: role }));
    }

    protected async approve(id: string): Promise<void> {
        const familyId = this.familyFor(id);
        if (!familyId) {
            return;
        }
        this.busy.set(id);
        const { error } = await this.data.approveRequest(id, familyId, this.roleFor(id));
        this.busy.set(null);
        this.toast.show(error ? `Помилка: ${error.message}` : 'Користувача схвалено ✨', error ? 'error' : 'success');
    }

    protected async reject(id: string): Promise<void> {
        this.busy.set(id);
        const { error } = await this.data.rejectRequest(id);
        this.busy.set(null);
        this.toast.show(error ? `Помилка: ${error.message}` : 'Запит відхилено', error ? 'error' : 'info');
    }
}
