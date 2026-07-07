import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminDataService } from '../../core/services/admin-data.service';
import { ToastService } from '../../core/services/toast.service';

const CYRILLIC_MAP: Record<string, string> = {
    а: 'a', б: 'b', в: 'v', г: 'h', ґ: 'g', д: 'd', е: 'e', є: 'ie', ж: 'zh', з: 'z',
    и: 'y', і: 'i', ї: 'i', й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p',
    р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch',
    ь: '', ю: 'iu', я: 'ia', "'": '',
};

function slugify(value: string): string {
    return value
        .toLowerCase()
        .split('')
        .map(ch => (ch in CYRILLIC_MAP ? CYRILLIC_MAP[ch] : ch))
        .join('')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

@Component({
    selector: 'app-admin-families',
    imports: [FormsModule, RouterLink],
    template: `
        <div class="page-head">
            <h2 class="page-title">Родини</h2>
            <button class="new-btn" (click)="showForm.set(!showForm())">
                <span class="material-symbols-outlined">{{ showForm() ? 'close' : 'add' }}</span>
                {{ showForm() ? 'Скасувати' : 'Нова родина' }}
            </button>
        </div>

        @if (showForm()) {
            <form class="create-form" (submit)="create($event)">
                <div class="field">
                    <label>Назва</label>
                    <input type="text" [(ngModel)]="name" name="name" (ngModelChange)="onNameChange($event)" placeholder="Напр. Родина Булкіних" required>
                </div>
                <div class="field">
                    <label>Slug (латиницею)</label>
                    <input type="text" [(ngModel)]="slug" name="slug" placeholder="bulkina-family" required>
                </div>
                <div class="field">
                    <label>Опис</label>
                    <textarea [(ngModel)]="description" name="description" rows="2" placeholder="Короткий теплий опис родини"></textarea>
                </div>
                <div class="field field-color">
                    <label>Колір теми</label>
                    <input type="color" [(ngModel)]="themeColor" name="themeColor">
                    <span class="color-value">{{ themeColor }}</span>
                </div>
                <button type="submit" class="submit-btn" [disabled]="saving() || !name || !slug">
                    {{ saving() ? 'Створюємо…' : 'Створити родину' }}
                </button>
            </form>
        }

        @if (data.families().length === 0) {
            <div class="empty-state">
                <span class="material-symbols-outlined">diversity_3</span>
                <p>Ще немає родин</p>
            </div>
        } @else {
            <div class="family-grid">
                @for (family of data.families(); track family.id) {
                    <article class="family-card" [style.--tint]="family.themeColor || 'var(--color-accent)'">
                        <div class="family-card-head">
                            <span class="family-avatar">{{ family.name.charAt(0) }}</span>
                            <div>
                                <h3 class="family-card-name">{{ family.name }}</h3>
                                <span class="family-card-slug">/{{ family.slug }}</span>
                            </div>
                            <span class="family-card-status" [class.archived]="family.status === 'archived'">
                                {{ family.status === 'archived' ? 'Архів' : 'Активна' }}
                            </span>
                        </div>
                        @if (family.description) {
                            <p class="family-card-desc">{{ family.description }}</p>
                        }
                        <div class="family-card-foot">
                            <span class="vis" [class.public]="family.isPublicVisible">
                                <span class="material-symbols-outlined">{{ family.isPublicVisible ? 'public' : 'lock' }}</span>
                                {{ family.isPublicVisible ? 'Публічна' : 'Приватна' }}
                            </span>
                            <a class="members-link" [routerLink]="['/admin/families', family.id]">
                                <span class="material-symbols-outlined">group</span> Учасники
                            </a>
                        </div>
                    </article>
                }
            </div>
        }
    `,
    styles: [`
        :host { display: block; }
        .page-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-5); }
        .page-title { font-family: var(--font-display); font-size: var(--text-2xl); font-weight: var(--weight-bold); margin: 0; color: var(--color-text-primary); }
        .new-btn {
            display: inline-flex; align-items: center; gap: 4px; padding: 10px 16px; border: none;
            border-radius: var(--radius-full); background: var(--color-accent); color: var(--color-text-inverse);
            font-weight: var(--weight-semibold); font-size: var(--text-sm); cursor: pointer;
        }
        .new-btn .material-symbols-outlined { font-size: 18px; }
        .create-form {
            background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg);
            padding: var(--space-5); margin-bottom: var(--space-6); display: flex; flex-direction: column; gap: var(--space-4);
            box-shadow: var(--shadow-card);
        }
        .field { display: flex; flex-direction: column; gap: var(--space-2); }
        .field label { font-size: var(--text-sm); font-weight: var(--weight-medium); color: var(--color-text-secondary); }
        .field input, .field textarea {
            padding: 11px 13px; border: 1px solid var(--color-border); border-radius: var(--radius-md);
            background: var(--color-bg); color: var(--color-text-primary); font-family: var(--font-body); font-size: var(--text-base);
        }
        .field input:focus, .field textarea:focus { outline: 2px solid var(--color-accent); outline-offset: 0; border-color: transparent; }
        .field-color { flex-direction: row; align-items: center; gap: var(--space-3); }
        .field-color input[type=color] { width: 48px; height: 40px; padding: 2px; border-radius: var(--radius-md); border: 1px solid var(--color-border); background: none; cursor: pointer; }
        .color-value { font-size: var(--text-sm); color: var(--color-text-tertiary); font-family: monospace; }
        .submit-btn {
            align-self: flex-start; padding: 11px 20px; border: none; border-radius: var(--radius-full);
            background: var(--color-accent); color: var(--color-text-inverse); font-weight: var(--weight-semibold); cursor: pointer;
        }
        .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .family-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: var(--space-4); }
        .family-card {
            background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg);
            padding: var(--space-5); box-shadow: var(--shadow-card); border-top: 3px solid var(--tint);
        }
        .family-card-head { display: flex; align-items: center; gap: var(--space-3); }
        .family-avatar {
            width: 40px; height: 40px; border-radius: var(--radius-md); flex: none;
            display: grid; place-items: center; font-family: var(--font-display); font-weight: var(--weight-bold);
            background: color-mix(in srgb, var(--tint) 16%, transparent); color: var(--tint); font-size: var(--text-lg);
        }
        .family-card-name { font-family: var(--font-display); font-size: var(--text-md); font-weight: var(--weight-semibold); margin: 0; color: var(--color-text-primary); }
        .family-card-slug { font-size: var(--text-xs); color: var(--color-text-tertiary); }
        .family-card-status { margin-left: auto; font-size: var(--text-xs); font-weight: var(--weight-semibold); padding: 3px 10px; border-radius: var(--radius-full); background: var(--color-success-light); color: var(--color-success); }
        .family-card-status.archived { background: var(--color-surface-active); color: var(--color-text-tertiary); }
        .family-card-desc { color: var(--color-text-secondary); font-size: var(--text-sm); line-height: var(--leading-normal); margin: var(--space-3) 0 0; }
        .family-card-foot { margin-top: var(--space-4); display: flex; align-items: center; justify-content: space-between; }
        .members-link { display: inline-flex; align-items: center; gap: 4px; font-size: var(--text-sm); font-weight: var(--weight-medium); color: var(--color-accent); }
        .members-link .material-symbols-outlined { font-size: 17px; }
        .vis { display: inline-flex; align-items: center; gap: 4px; font-size: var(--text-xs); color: var(--color-text-tertiary); }
        .vis .material-symbols-outlined { font-size: 15px; }
        .vis.public { color: var(--color-secondary); }
        .empty-state { text-align: center; padding: var(--space-16) var(--space-4); color: var(--color-text-tertiary); }
        .empty-state .material-symbols-outlined { font-size: 48px; opacity: 0.6; }
        .empty-state p { margin: var(--space-3) 0 0; }
    `],
})
export class AdminFamiliesPage {
    protected readonly data = inject(AdminDataService);
    private readonly toast = inject(ToastService);

    protected readonly showForm = signal(false);
    protected readonly saving = signal(false);

    protected name = '';
    protected slug = '';
    protected description = '';
    protected themeColor = '#B8926A';
    private slugEditedManually = false;

    constructor() {
        void this.data.loadFamilies();
    }

    protected onNameChange(value: string): void {
        if (!this.slugEditedManually) {
            this.slug = slugify(value);
        }
    }

    protected async create(event: Event): Promise<void> {
        event.preventDefault();
        if (!this.name || !this.slug) {
            return;
        }
        this.saving.set(true);
        const { error } = await this.data.createFamily({
            slug: this.slug,
            name: this.name,
            description: this.description || null,
            themeColor: this.themeColor,
        });
        this.saving.set(false);
        if (error) {
            this.toast.show(`Помилка: ${error.message}`, 'error');
            return;
        }
        this.toast.show('Родину створено ✨', 'success');
        this.name = this.slug = this.description = '';
        this.themeColor = '#B8926A';
        this.slugEditedManually = false;
        this.showForm.set(false);
    }
}
