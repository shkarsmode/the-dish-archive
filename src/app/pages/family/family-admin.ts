import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { FamilyService } from '../../core/services/family.service';
import { AdminDataService } from '../../core/services/admin-data.service';
import { AuthService } from '../../core/services/auth.service';
import { UploadService } from '../../core/services/upload.service';
import { ToastService } from '../../core/services/toast.service';
import { ADMIN_ROLES, FAMILY_ROLE_LABELS, FamilyRole } from '../../core/models/family-member.model';
import { HintComponent } from '../../shared/components/hint.component';
import { ConfirmService } from '../../core/services/confirm.service';
import { SelectComponent, SelectOption } from '../../shared/components/select.component';

@Component({
    selector: 'app-family-admin',
    imports: [FormsModule, RouterLink, HintComponent, SelectComponent],
    template: `
        @if (family(); as fam) {
            <header class="fa-header" [style.--tint]="fam.themeColor || 'var(--color-accent)'">
                <a routerLink="/" class="icon-btn"><span class="material-symbols-outlined">arrow_back</span></a>
                <div>
                    <h1 class="fa-title">{{ fam.name }}</h1>
                    <p class="fa-sub">Керування родиною</p>
                </div>
            </header>

            <div class="fa-body">
                <!-- Settings -->
                <section class="card">
                    <h2 class="card-title">Налаштування родини</h2>
                    <div class="field"><label>Назва</label><input type="text" [(ngModel)]="name"></div>
                    <div class="field"><label>Опис</label><textarea [(ngModel)]="description" rows="2"></textarea></div>
                    <div class="field">
                        <label>Колір теми
                            <app-hint title="Колір теми" text="Використовується для акцентів родини — крапка у перемикачі, лінія над панеллю та бейджі страв." />
                        </label>
                        <div class="color-row">
                            <input type="color" [(ngModel)]="themeColor">
                            <span class="color-value">{{ themeColor }}</span>
                        </div>
                    </div>
                    <div class="toggle-row">
                        <div class="toggle-copy">
                            <span class="toggle-label">Показувати у спільному списку родин</span>
                            <span class="toggle-sub">Родину та її публічні страви бачитимуть усі схвалені користувачі. Вимкніть, щоб залишити приватною.</span>
                        </div>
                        <button type="button" class="switch" role="switch" [class.on]="isPublic"
                            [attr.aria-checked]="isPublic" (click)="isPublic = !isPublic" aria-label="Публічна видимість">
                            <span class="knob"></span>
                        </button>
                    </div>
                    <div class="field field-row">
                        <label class="img-field">
                            <span>Обкладинка</span>
                            <input type="file" accept="image/*" hidden (change)="upload($event, 'cover')">
                            <span class="img-btn"><span class="material-symbols-outlined">image</span>{{ coverImageUrl ? 'Змінити' : 'Завантажити' }}</span>
                        </label>
                        <label class="img-field">
                            <span>Аватар</span>
                            <input type="file" accept="image/*" hidden (change)="upload($event, 'avatar')">
                            <span class="img-btn"><span class="material-symbols-outlined">account_circle</span>{{ avatarImageUrl ? 'Змінити' : 'Завантажити' }}</span>
                        </label>
                    </div>
                    <button class="btn primary" (click)="saveSettings()" [disabled]="saving()">{{ saving() ? 'Зберігаю…' : 'Зберегти' }}</button>
                </section>

                <!-- Pending requests -->
                @if (pending().length > 0) {
                    <section class="card">
                        <h2 class="card-title">Запити на приєднання ({{ pending().length }})</h2>
                        @for (req of pending(); track req.id) {
                            <div class="req-row">
                                <div class="req-user">
                                    <span class="req-name">{{ req.displayName || req.email }}</span>
                                    <span class="req-email">{{ req.email }}</span>
                                </div>
                                <app-select variant="inline" [options]="roleOptions" sheetTitle="Роль учасника"
                                    ariaLabel="Роль" [ngModel]="reqRole(req.id)" (ngModelChange)="setReqRole(req.id, $event)"
                                    [ngModelOptions]="{ standalone: true }" />
                                <button class="btn approve" (click)="approve(req.id)">Схвалити</button>
                                <button class="btn reject" (click)="reject(req.id)">✕</button>
                            </div>
                        }
                    </section>
                }

                <!-- Members -->
                <section class="card">
                    <h2 class="card-title">Учасники ({{ data.members().length }})</h2>
                    @if (data.members().length === 0) {
                        <p class="muted">Ще немає учасників. Люди можуть надіслати запит на доступ, і ви їх схвалите тут.</p>
                    }
                    @for (member of data.members(); track member.id) {
                        <div class="member-row">
                            @if (member.avatarUrl) {
                                <img class="m-avatar" [src]="member.avatarUrl" alt="" referrerpolicy="no-referrer">
                            } @else {
                                <span class="m-avatar m-fallback material-symbols-outlined">account_circle</span>
                            }
                            <div class="m-meta">
                                <span class="m-name">{{ member.displayName || member.email }}</span>
                                <span class="m-email">{{ member.email }}</span>
                            </div>
                            <app-select variant="inline" [options]="roleOptions" sheetTitle="Роль учасника"
                                ariaLabel="Роль" [ngModel]="member.role" (ngModelChange)="changeRole(member.id, $event)"
                                [ngModelOptions]="{ standalone: true }" />
                            <button class="icon-danger" (click)="remove(member.id)"><span class="material-symbols-outlined">person_remove</span></button>
                        </div>
                    }
                </section>
            </div>
        } @else {
            <div class="loading">Завантаження…</div>
        }
    `,
    styles: [`
        :host { display: block; min-height: 100dvh; background: var(--color-bg); }
        .fa-header {
            display: flex; align-items: center; gap: var(--space-3);
            padding: var(--space-5) var(--space-4); border-bottom: 3px solid var(--tint);
            background: var(--color-surface);
        }
        .icon-btn { width: 40px; height: 40px; flex: none; border: none; cursor: pointer; display: grid; place-items: center; border-radius: var(--radius-full); background: var(--color-surface-hover); color: var(--color-text-secondary); }
        .fa-title { font-family: var(--font-display); font-size: var(--text-xl); font-weight: var(--weight-bold); margin: 0; color: var(--color-text-primary); }
        .fa-sub { margin: 0; font-size: var(--text-xs); color: var(--color-text-tertiary); }
        .fa-body { max-width: 680px; margin: 0 auto; padding: var(--space-6) var(--space-4) var(--space-16); display: flex; flex-direction: column; gap: var(--space-5); }
        .card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--space-5); box-shadow: var(--shadow-card); }
        .card-title { font-family: var(--font-display); font-size: var(--text-md); font-weight: var(--weight-semibold); margin: 0 0 var(--space-4); color: var(--color-text-primary); }
        .field { display: flex; flex-direction: column; gap: var(--space-2); margin-bottom: var(--space-4); }
        .field-row { flex-direction: row; flex-wrap: wrap; align-items: flex-end; gap: var(--space-4); }
        label { font-size: var(--text-sm); font-weight: var(--weight-medium); color: var(--color-text-secondary); }
        input[type=text], textarea, .control { width: 100%; padding: 11px 13px; border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-bg); color: var(--color-text-primary); font-family: var(--font-body); font-size: var(--text-base); }
        input:focus, textarea:focus, .control:focus { outline: 2px solid var(--color-accent); border-color: transparent; }
        .control { min-height: 42px; width: auto; }
        .color-row { display: flex; align-items: center; gap: var(--space-3); }
        .color-row input { width: 52px; height: 42px; padding: 2px; border-radius: var(--radius-md); border: 1px solid var(--color-border); cursor: pointer; }
        .color-value { font-size: var(--text-sm); color: var(--color-text-tertiary); font-variant-numeric: tabular-nums; text-transform: uppercase; }
        .toggle-row { display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); margin-bottom: var(--space-4); }
        .toggle-copy { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .toggle-label { font-size: var(--text-sm); font-weight: var(--weight-medium); color: var(--color-text-primary); }
        .toggle-sub { font-size: var(--text-xs); color: var(--color-text-tertiary); line-height: var(--leading-relaxed); }
        .switch {
            flex: none; width: 48px; height: 28px; padding: 0; border: none; cursor: pointer;
            border-radius: var(--radius-full); background: var(--color-border); position: relative;
            transition: background var(--transition-base);
        }
        .switch.on { background: var(--color-accent); }
        .switch .knob {
            position: absolute; top: 3px; left: 3px; width: 22px; height: 22px; border-radius: 50%;
            background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.25); transition: transform var(--transition-base);
        }
        .switch.on .knob { transform: translateX(20px); }
        .img-field { display: flex; flex-direction: column; gap: var(--space-2); cursor: pointer; }
        .img-btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 14px; border-radius: var(--radius-md); border: 1px dashed var(--color-border); color: var(--color-text-secondary); font-size: var(--text-sm); }
        .img-btn .material-symbols-outlined { font-size: 18px; }
        .btn { padding: 10px 18px; border: none; border-radius: var(--radius-full); font-weight: var(--weight-semibold); font-size: var(--text-sm); cursor: pointer; }
        .btn.primary { background: var(--color-accent); color: var(--color-text-inverse); }
        .btn.approve { background: var(--color-success); color: #fff; }
        .btn.reject { background: var(--color-surface-active); color: var(--color-error); }
        .btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .req-row, .member-row { display: flex; align-items: center; gap: var(--space-2); padding: var(--space-2) 0; border-bottom: 1px solid var(--color-border-light); }
        .req-row:last-child, .member-row:last-child { border-bottom: none; }
        .req-user, .m-meta { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
        .req-name, .m-name { font-weight: var(--weight-medium); color: var(--color-text-primary); font-size: var(--text-sm); }
        .req-email, .m-email { font-size: var(--text-xs); color: var(--color-text-tertiary); }
        .m-avatar { width: 38px; height: 38px; border-radius: var(--radius-full); object-fit: cover; flex: none; }
        .m-fallback { display: grid; place-items: center; font-size: 26px; color: var(--color-text-tertiary); background: var(--color-surface-hover); }
        .icon-danger { width: 38px; height: 38px; flex: none; border: none; cursor: pointer; border-radius: var(--radius-md); background: transparent; color: var(--color-text-tertiary); display: grid; place-items: center; }
        .icon-danger:hover { background: var(--color-error-light); color: var(--color-error); }
        .muted { color: var(--color-text-tertiary); font-size: var(--text-sm); margin: 0; }
        .loading { display: grid; place-items: center; min-height: 60dvh; color: var(--color-text-tertiary); }
    `],
})
export class FamilyAdminPage {
    protected readonly familyService = inject(FamilyService);
    protected readonly data = inject(AdminDataService);
    private readonly auth = inject(AuthService);
    private readonly upload_ = inject(UploadService);
    private readonly toast = inject(ToastService);
    private readonly route = inject(ActivatedRoute);
    private readonly confirm = inject(ConfirmService);

    protected readonly roles: FamilyRole[] = [...ADMIN_ROLES, 'editor', 'viewer'];
    protected readonly roleLabels = FAMILY_ROLE_LABELS;
    protected readonly roleOptions: SelectOption[] =
        this.roles.map(r => ({ value: r, label: FAMILY_ROLE_LABELS[r] }));
    protected readonly saving = signal(false);

    private readonly slug = toSignal(this.route.paramMap.pipe(map(p => p.get('familySlug') ?? '')));
    protected readonly family = computed(() => this.familyService.bySlug(this.slug() ?? ''));

    protected readonly pending = computed(() => {
        const id = this.family()?.id;
        return this.data.accessRequests().filter(r => r.status === 'pending' && r.familyId === id);
    });

    protected name = '';
    protected description = '';
    protected themeColor = '#B8926A';
    protected isPublic = true;
    protected coverImageUrl: string | null = null;
    protected avatarImageUrl: string | null = null;

    private readonly reqRoles = signal<Record<string, FamilyRole>>({});
    private prefilled = false;

    constructor() {
        void this.familyService.load();
        void this.data.loadAccessRequests();
        effect(() => {
            const fam = this.family();
            if (fam && !this.prefilled) {
                this.prefilled = true;
                this.name = fam.name;
                this.description = fam.description ?? '';
                this.themeColor = fam.themeColor ?? '#B8926A';
                this.isPublic = fam.isPublicVisible;
                this.coverImageUrl = fam.coverImageUrl;
                this.avatarImageUrl = fam.avatarImageUrl;
                void this.data.loadMembers(fam.id);
            }
        });
    }

    protected reqRole(id: string): FamilyRole { return this.reqRoles()[id] ?? 'viewer'; }
    protected setReqRole(id: string, role: FamilyRole): void { this.reqRoles.update(c => ({ ...c, [id]: role })); }

    protected async upload(event: Event, kind: 'cover' | 'avatar'): Promise<void> {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) return;
        try {
            const { url } = await this.upload_.uploadImage(file);
            if (kind === 'cover') this.coverImageUrl = url; else this.avatarImageUrl = url;
            this.toast.show('Фото завантажено — не забудьте зберегти', 'info');
        } catch {
            this.toast.show('Не вдалося завантажити фото', 'error');
        }
    }

    protected async saveSettings(): Promise<void> {
        const fam = this.family();
        if (!fam) return;
        this.saving.set(true);
        const { error } = await this.familyService.updateFamily(fam.id, {
            name: this.name,
            description: this.description || null,
            themeColor: this.themeColor,
            isPublicVisible: this.isPublic,
            coverImageUrl: this.coverImageUrl,
            avatarImageUrl: this.avatarImageUrl,
        });
        this.saving.set(false);
        this.toast.show(error ? `Помилка: ${error.message}` : 'Збережено ✨', error ? 'error' : 'success');
    }

    protected async approve(requestId: string): Promise<void> {
        const fam = this.family();
        if (!fam) return;
        const { error } = await this.data.approveRequest(requestId, fam.id, this.reqRole(requestId));
        await this.data.loadMembers(fam.id);
        this.toast.show(error ? `Помилка: ${error.message}` : 'Учасника додано ✨', error ? 'error' : 'success');
    }

    protected async reject(requestId: string): Promise<void> {
        const { error } = await this.data.rejectRequest(requestId);
        this.toast.show(error ? `Помилка: ${error.message}` : 'Запит відхилено', error ? 'error' : 'info');
    }

    protected async changeRole(memberId: string, role: FamilyRole): Promise<void> {
        const fam = this.family();
        if (!fam) return;
        const { error } = await this.data.setMemberRole(fam.id, memberId, role);
        this.toast.show(error ? `Помилка: ${error.message}` : 'Роль оновлено', error ? 'error' : 'success');
    }

    protected async remove(memberId: string): Promise<void> {
        const fam = this.family();
        if (!fam) return;
        const ok = await this.confirm.ask({
            title: 'Видалити учасника?',
            message: 'Він втратить доступ до рецептів цієї родини.',
            confirmLabel: 'Видалити',
            danger: true,
            icon: 'person_remove',
        });
        if (!ok) return;
        const { error } = await this.data.removeMember(fam.id, memberId);
        this.toast.show(error ? `Помилка: ${error.message}` : 'Видалено', error ? 'error' : 'info');
    }
}
