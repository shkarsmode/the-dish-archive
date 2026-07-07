import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { AdminDataService } from '../../core/services/admin-data.service';
import { ToastService } from '../../core/services/toast.service';
import { ADMIN_ROLES, FAMILY_ROLE_LABELS, FamilyRole } from '../../core/models/family-member.model';

@Component({
    selector: 'app-admin-family-members',
    imports: [FormsModule, RouterLink],
    template: `
        <a routerLink="/admin/families" class="back">
            <span class="material-symbols-outlined">arrow_back</span> Родини
        </a>
        <div class="page-head">
            <h2 class="page-title">{{ family()?.name || 'Родина' }}</h2>
            <p class="page-hint">Учасники родини. Один користувач може бути в кількох родинах.</p>
        </div>

        <div class="add-box">
            <select class="control grow" [(ngModel)]="newUserId">
                <option value="">— Оберіть користувача —</option>
                @for (user of addableUsers(); track user.id) {
                    <option [value]="user.id">{{ user.displayName || user.email }}</option>
                }
            </select>
            <select class="control" [(ngModel)]="newRole">
                @for (role of roles; track role) { <option [value]="role">{{ roleLabels[role] }}</option> }
            </select>
            <button class="btn primary" (click)="add()" [disabled]="!newUserId || busy()">Додати</button>
        </div>

        @if (data.members().length === 0) {
            <div class="empty">У цій родині ще немає учасників.</div>
        } @else {
            <div class="member-list">
                @for (member of data.members(); track member.id) {
                    <article class="member-card">
                        @if (member.avatarUrl) {
                            <img class="avatar" [src]="member.avatarUrl" alt="" referrerpolicy="no-referrer">
                        } @else {
                            <span class="avatar avatar-fallback material-symbols-outlined">account_circle</span>
                        }
                        <div class="member-meta">
                            <span class="member-name">{{ member.displayName || member.email }}</span>
                            <span class="member-email">{{ member.email }}</span>
                        </div>
                        <select class="control role-select" [ngModel]="member.role" (ngModelChange)="changeRole(member.id, $event)">
                            @for (role of roles; track role) { <option [value]="role">{{ roleLabels[role] }}</option> }
                        </select>
                        <button class="icon-danger" (click)="remove(member.id)" title="Видалити з родини">
                            <span class="material-symbols-outlined">person_remove</span>
                        </button>
                    </article>
                }
            </div>
        }
    `,
    styles: [`
        :host { display: block; }
        .back { display: inline-flex; align-items: center; gap: 4px; color: var(--color-text-secondary); font-size: var(--text-sm); margin-bottom: var(--space-4); }
        .back .material-symbols-outlined { font-size: 18px; }
        .page-head { margin-bottom: var(--space-5); }
        .page-title { font-family: var(--font-display); font-size: var(--text-2xl); font-weight: var(--weight-bold); margin: 0 0 var(--space-1); color: var(--color-text-primary); }
        .page-hint { color: var(--color-text-secondary); font-size: var(--text-sm); margin: 0; }
        .add-box { display: flex; flex-wrap: wrap; gap: var(--space-2); margin-bottom: var(--space-5); }
        .control { padding: 10px 12px; border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-surface); color: var(--color-text-primary); font-family: var(--font-body); font-size: var(--text-sm); min-height: 42px; }
        .grow { flex: 1; min-width: 180px; }
        .btn { padding: 10px 18px; border: none; border-radius: var(--radius-full); font-weight: var(--weight-semibold); font-size: var(--text-sm); cursor: pointer; }
        .btn.primary { background: var(--color-accent); color: var(--color-text-inverse); }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .empty { color: var(--color-text-tertiary); padding: var(--space-8) 0; text-align: center; }
        .member-list { display: flex; flex-direction: column; gap: var(--space-2); }
        .member-card { display: flex; align-items: center; gap: var(--space-3); background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--space-3) var(--space-4); }
        .avatar { width: 40px; height: 40px; border-radius: var(--radius-full); object-fit: cover; flex: none; }
        .avatar-fallback { display: grid; place-items: center; font-size: 28px; color: var(--color-text-tertiary); background: var(--color-surface-hover); }
        .member-meta { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
        .member-name { font-weight: var(--weight-medium); color: var(--color-text-primary); }
        .member-email { font-size: var(--text-xs); color: var(--color-text-tertiary); }
        .role-select { flex: none; }
        .icon-danger { width: 40px; height: 40px; flex: none; border: none; cursor: pointer; border-radius: var(--radius-md); background: transparent; color: var(--color-text-tertiary); display: grid; place-items: center; }
        .icon-danger:hover { background: var(--color-error-light); color: var(--color-error); }
    `],
})
export class AdminFamilyMembersPage {
    protected readonly data = inject(AdminDataService);
    private readonly route = inject(ActivatedRoute);
    private readonly toast = inject(ToastService);

    protected readonly roles: FamilyRole[] = [...ADMIN_ROLES, 'editor', 'viewer'];
    protected readonly roleLabels = FAMILY_ROLE_LABELS;
    protected readonly busy = signal(false);

    protected newUserId = '';
    protected newRole: FamilyRole = 'viewer';

    private readonly familyId = toSignal(this.route.paramMap.pipe(map(p => p.get('familyId') ?? '')));
    protected readonly family = computed(() => this.data.families().find(f => f.id === this.familyId()));

    protected readonly addableUsers = computed(() => {
        const memberIds = new Set(this.data.members().map(m => m.userId));
        return this.data.users().filter(u => !memberIds.has(u.id));
    });

    constructor() {
        void this.data.loadFamilies();
        void this.data.loadUsers();
        queueMicrotask(() => {
            const id = this.familyId();
            if (id) void this.data.loadMembers(id);
        });
    }

    protected async add(): Promise<void> {
        if (!this.newUserId) return;
        this.busy.set(true);
        const { error } = await this.data.addMember(this.familyId()!, this.newUserId, this.newRole);
        this.busy.set(false);
        if (error) { this.toast.show(`Помилка: ${error.message}`, 'error'); return; }
        this.toast.show('Учасника додано ✨', 'success');
        this.newUserId = '';
    }

    protected async changeRole(memberId: string, role: FamilyRole): Promise<void> {
        const { error } = await this.data.setMemberRole(this.familyId()!, memberId, role);
        this.toast.show(error ? `Помилка: ${error.message}` : 'Роль оновлено', error ? 'error' : 'success');
    }

    protected async remove(memberId: string): Promise<void> {
        if (!confirm('Видалити учасника з родини?')) return;
        const { error } = await this.data.removeMember(this.familyId()!, memberId);
        this.toast.show(error ? `Помилка: ${error.message}` : 'Учасника видалено', error ? 'error' : 'info');
    }
}
