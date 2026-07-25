import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { debounceTime, map } from 'rxjs';
import {
    ALL_CATEGORIES,
    ALL_TASTE_KEYS,
    CATEGORY_LABELS,
    DIFFICULTY_LABELS,
    Dish,
    DishCategory,
    DishDifficulty,
    TASTE_LABELS,
} from '../../core/models/dish.model';
import { AiRecipeDraft, AiService } from '../../core/services/ai.service';
import { DishService } from '../../core/services/dish.service';
import { FamilyService } from '../../core/services/family.service';
import { AuthService } from '../../core/services/auth.service';
import { UploadService } from '../../core/services/upload.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { EditorDraftService } from '../../core/services/editor-draft.service';
import { SelectComponent, SelectOption } from '../../shared/components/select.component';

const CYRILLIC: Record<string, string> = {
    а: 'a', б: 'b', в: 'v', г: 'h', ґ: 'g', д: 'd', е: 'e', є: 'ie', ж: 'zh', з: 'z', и: 'y',
    і: 'i', ї: 'i', й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's',
    т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ь: '', ю: 'iu', я: 'ia',
};
const slugify = (v: string) => v.toLowerCase().split('').map(c => CYRILLIC[c] ?? c).join('')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

@Component({
    selector: 'app-recipe-editor',
    imports: [ReactiveFormsModule, FormsModule, SelectComponent],
    templateUrl: './recipe-editor.html',
    styleUrl: './recipe-editor.scss',
})
export class RecipeEditorPage {
    private readonly fb = inject(FormBuilder);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly dishService = inject(DishService);
    protected readonly familyService = inject(FamilyService);
    private readonly auth = inject(AuthService);
    private readonly ai = inject(AiService);
    private readonly uploadService = inject(UploadService);
    private readonly toast = inject(ToastService);
    private readonly confirm = inject(ConfirmService);
    private readonly drafts = inject(EditorDraftService);
    private readonly destroyRef = inject(DestroyRef);

    protected readonly allCategories = ALL_CATEGORIES;
    protected readonly categoryLabels = CATEGORY_LABELS;
    protected readonly tasteKeys = ALL_TASTE_KEYS;
    protected readonly tasteLabels = TASTE_LABELS;
    protected readonly difficultyLabels = DIFFICULTY_LABELS;
    protected readonly difficulties: DishDifficulty[] = ['easy', 'medium', 'hard'];
    protected readonly difficultyOptions: SelectOption[] =
        this.difficulties.map(d => ({ value: d, label: DIFFICULTY_LABELS[d] }));
    protected readonly familyOptions = computed<SelectOption[]>(() =>
        this.familyService.editableFamilies().map(f => ({ value: f.id, label: f.name })));

    protected readonly saving = signal(false);
    protected readonly uploading = signal(false);
    protected readonly deleting = signal(false);
    protected saved = false;

    /** Timestamp of the last local autosave; drives the "draft saved" indicator. */
    protected readonly draftSavedAt = signal<number | null>(null);
    /** True only when a draft from a previous session was restored on load. */
    protected readonly restoredDraft = signal(false);
    private hydrating = false;

    // ── AI compose (new-recipe only, group admins + super-admin) ──
    protected readonly aiText = signal('');
    protected readonly aiLoading = signal(false);
    protected readonly aiError = signal<string | null>(null);
    protected readonly aiWarnings = signal<string[]>([]);
    protected readonly aiDaily = signal<{ limit: number | null; used: number | null; remaining: number | null } | null>(null);
    protected readonly isGroupAdmin = computed(() =>
        this.auth.isSuperAdmin() ||
        this.auth.approvedMemberships().some((m) => m.role === 'owner' || m.role === 'admin'),
    );

    private readonly editId = toSignal(this.route.paramMap.pipe(map(p => p.get('dishId'))));
    protected readonly isEdit = computed(() => !!this.editId());
    /** The AI compose panel shows only for a new recipe and only to group admins. */
    protected readonly showAi = computed(() => !this.isEdit() && this.isGroupAdmin());

    protected readonly form = this.fb.group({
        familyId: ['', Validators.required],
        title: ['', Validators.required],
        slug: ['', Validators.required],
        description: [''],
        visibility: ['public'],
        status: ['draft'],
        prepTime: [0], cookTime: [0], totalTime: [0],
        calories: [0], servings: [1],
        difficulty: ['easy'],
        priceAmount: [0], priceCurrency: ['UAH'],
        categories: [[] as DishCategory[]],
        notes: [''], sourceUrl: [''],
        images: this.fb.array<FormControl>([]),
        ingredients: this.fb.array<ReturnType<RecipeEditorPage['newIngredient']>>([]),
        steps: this.fb.array<ReturnType<RecipeEditorPage['newStep']>>([]),
        tags: this.fb.array<FormControl<string>>([]),
        taste: this.fb.group({ sweet: [0], salty: [0], sour: [0], bitter: [0], spicy: [0], umami: [0] }),
    });

    protected newTag = '';
    private slugTouched = false;

    /** Whether the selected family lets this user publish publicly (owner/admin/super). */
    protected readonly canMakePublic = computed(() => {
        const familyId = this.form.controls.familyId.value;
        return !!familyId && this.auth.canAdminFamily(familyId);
    });

    get images(): FormArray { return this.form.controls.images; }
    get ingredients(): FormArray { return this.form.controls.ingredients; }
    get steps(): FormArray { return this.form.controls.steps; }
    get tags(): FormArray { return this.form.controls.tags; }

    constructor() {
        queueMicrotask(() => {
            const id = this.editId();
            if (id) {
                this.loadDish(id);
            } else {
                this.initNewRecipe();
            }
        });
    }

    /** Seed a fresh recipe, restoring any locally-autosaved draft first. */
    private initNewRecipe(): void {
        const draft = this.drafts.load(null);
        if (draft) {
            this.hydrate(draft.value);
            this.draftSavedAt.set(draft.savedAt);
            this.restoredDraft.set(true);
            this.toast.show('Чернетку відновлено ✨', 'info');
        } else {
            const first = this.familyService.editableFamilies()[0];
            if (first) this.form.controls.familyId.setValue(first.id);
            this.addIngredient();
            this.addStep();
        }
        // Autosave locally on every change so a reload never loses work.
        this.form.valueChanges
            .pipe(debounceTime(500), takeUntilDestroyed(this.destroyRef))
            .subscribe(() => {
                if (this.hydrating || this.saved) return;
                const savedAt = this.drafts.save(null, this.form.getRawValue());
                this.draftSavedAt.set(savedAt);
            });
    }

    /**
     * Rebuild the whole form (scalars + arrays) from a stored raw value.
     * All mutations use { emitEvent: false } so hydration never triggers the
     * debounced autosave (which would otherwise resurrect a cleared draft).
     */
    private hydrate(value: any): void {
        this.hydrating = true;
        this.slugTouched = !!value?.slug;
        const silent = { emitEvent: false };
        this.form.patchValue({
            familyId: value?.familyId ?? '',
            title: value?.title ?? '',
            slug: value?.slug ?? '',
            description: value?.description ?? '',
            visibility: value?.visibility ?? 'public',
            status: value?.status ?? 'draft',
            prepTime: value?.prepTime ?? 0,
            cookTime: value?.cookTime ?? 0,
            totalTime: value?.totalTime ?? 0,
            calories: value?.calories ?? 0,
            servings: value?.servings ?? 1,
            difficulty: value?.difficulty ?? 'easy',
            priceAmount: value?.priceAmount ?? 0,
            priceCurrency: value?.priceCurrency ?? 'UAH',
            categories: Array.isArray(value?.categories) ? [...value.categories] : [],
            notes: value?.notes ?? '',
            sourceUrl: value?.sourceUrl ?? '',
            taste: value?.taste ?? { sweet: 0, salty: 0, sour: 0, bitter: 0, spicy: 0, umami: 0 },
        }, silent);
        this.images.clear(silent);
        (value?.images ?? []).forEach((img: unknown) => this.images.push(this.fb.control(img), silent));
        this.ingredients.clear(silent);
        (value?.ingredients ?? []).forEach((ing: any) => this.ingredients.push(this.newIngredient(ing), silent));
        this.steps.clear(silent);
        (value?.steps ?? []).forEach((s: any) => this.steps.push(this.newStep({ description: s?.description ?? '', duration: s?.duration ?? null }), silent));
        this.tags.clear(silent);
        (value?.tags ?? []).forEach((tag: string) => this.tags.push(this.fb.control(tag, { nonNullable: true }), silent));
        if (this.ingredients.length === 0) this.ingredients.push(this.newIngredient(), silent);
        if (this.steps.length === 0) this.steps.push(this.newStep(), silent);
        this.hydrating = false;
    }

    /** Discard the restored local draft and start from a clean slate. */
    protected async startFresh(): Promise<void> {
        const ok = await this.confirm.ask({
            title: 'Почати заново?',
            message: 'Відновлену чернетку буде видалено, а форму очищено.',
            confirmLabel: 'Очистити',
            danger: true,
            icon: 'restart_alt',
        });
        if (!ok) return;
        this.drafts.clear(null);
        this.draftSavedAt.set(null);
        this.restoredDraft.set(false);
        this.hydrate({});
        const first = this.familyService.editableFamilies()[0];
        if (first) this.form.controls.familyId.setValue(first.id, { emitEvent: false });
        this.form.markAsPristine();
    }

    /** Generate a draft from the free-form description and fill the form for editing. */
    protected async generateWithAi(): Promise<void> {
        const text = this.aiText().trim();
        if (text.length < 10) {
            this.aiError.set('Опишіть страву докладніше (мінімум кілька слів).');
            return;
        }
        this.aiLoading.set(true);
        this.aiError.set(null);
        this.aiWarnings.set([]);
        try {
            const draft = await this.ai.parseRecipe(text);
            this.applyAiDraft(draft);
            this.aiWarnings.set(draft.warnings ?? []);
            if (draft.meta) {
                this.aiDaily.set({
                    limit: draft.meta.dailyLimit,
                    used: draft.meta.dailyUsed,
                    remaining: draft.meta.dailyRemaining,
                });
            }
            this.toast.success('Рецепт згенеровано ✨ Перевірте і збережіть');
        } catch (error: any) {
            const payload = error?.error ?? {};
            this.aiError.set(payload.message || 'Не вдалося згенерувати рецепт. Спробуйте ще раз.');
        } finally {
            this.aiLoading.set(false);
        }
    }

    /** Fill the editor form from an AI draft (keeps the chosen family). */
    private applyAiDraft(draft: AiRecipeDraft): void {
        const familyId = this.form.controls.familyId.value;
        this.hydrate({
            familyId,
            title: draft.title,
            slug: draft.title ? slugify(draft.title) : '',
            description: draft.description,
            visibility: 'public',
            status: 'draft',
            prepTime: draft.cookingTime.preparation,
            cookTime: draft.cookingTime.cooking,
            totalTime: draft.cookingTime.total,
            calories: draft.calories,
            servings: draft.servings || 1,
            difficulty: draft.difficulty,
            categories: draft.categories,
            notes: draft.notes,
            ingredients: draft.ingredients,
            steps: draft.steps.map((s) => ({ description: s.description, duration: s.duration ?? null })),
            tags: draft.tags,
        });
        this.form.markAsDirty();
    }

    private newIngredient(value?: { name: string; amount: string; unit: string; optional: boolean }) {
        return this.fb.group({
            name: [value?.name ?? '', Validators.required],
            amount: [value?.amount ?? ''],
            unit: [value?.unit ?? ''],
            optional: [value?.optional ?? false],
        });
    }

    private newStep(value?: { description: string; duration: number | null }) {
        return this.fb.group({
            description: [value?.description ?? '', Validators.required],
            duration: [value?.duration ?? null],
        });
    }

    private loadDish(id: string): void {
        const dish = this.dishService.allDishes().find(d => d.id === id);
        if (!dish) {
            this.toast.show('Рецепт не знайдено', 'error');
            void this.router.navigate(['/']);
            return;
        }
        this.slugTouched = true;
        this.form.patchValue({
            familyId: dish.familyId,
            title: dish.title,
            slug: dish.slug,
            description: dish.description,
            visibility: dish.visibility,
            status: dish.status,
            prepTime: dish.cookingTime.preparation,
            cookTime: dish.cookingTime.cooking,
            totalTime: dish.cookingTime.total,
            calories: dish.calories,
            servings: dish.servings,
            difficulty: dish.difficulty,
            priceAmount: dish.price.amount,
            priceCurrency: dish.price.currency,
            categories: [...dish.categories],
            notes: dish.notes,
            sourceUrl: dish.sourceUrl,
            taste: dish.tasteProfile,
        });
        dish.images.forEach(image => this.images.push(this.fb.control(image)));
        dish.ingredients.forEach(ing => this.ingredients.push(this.newIngredient(ing)));
        dish.steps.forEach(step => this.steps.push(this.newStep({ description: step.description, duration: step.duration ?? null })));
        dish.tags.forEach(tag => this.tags.push(this.fb.control(tag, { nonNullable: true })));
    }

    protected onTitleInput(value: string): void {
        if (!this.slugTouched) {
            this.form.controls.slug.setValue(slugify(value));
        }
    }

    protected markSlugTouched(): void { this.slugTouched = true; }

    protected toggleCategory(category: DishCategory): void {
        const current = this.form.controls.categories.value ?? [];
        this.form.controls.categories.setValue(
            current.includes(category) ? current.filter(c => c !== category) : [...current, category],
        );
        this.form.markAsDirty();
    }

    protected isCategoryActive(category: DishCategory): boolean {
        return (this.form.controls.categories.value ?? []).includes(category);
    }

    protected addIngredient(): void { this.ingredients.push(this.newIngredient()); this.form.markAsDirty(); }
    protected removeIngredient(i: number): void { this.ingredients.removeAt(i); this.form.markAsDirty(); }
    protected addStep(): void { this.steps.push(this.newStep()); this.form.markAsDirty(); }
    protected removeStep(i: number): void { this.steps.removeAt(i); this.form.markAsDirty(); }

    protected addTag(): void {
        const value = this.newTag.trim();
        if (value && !this.tags.value.includes(value)) {
            this.tags.push(this.fb.control(value, { nonNullable: true }));
            this.form.markAsDirty();
        }
        this.newTag = '';
    }
    protected removeTag(i: number): void { this.tags.removeAt(i); this.form.markAsDirty(); }

    protected async onImageSelected(event: Event): Promise<void> {
        const input = event.target as HTMLInputElement;
        const files = Array.from(input.files ?? []);
        if (!files.length) return;
        this.uploading.set(true);
        for (const file of files) {
            try {
                const { url } = await this.uploadService.uploadImage(file);
                this.images.push(this.fb.control({ url, alt: this.form.controls.title.value ?? '', isPrimary: this.images.length === 0 }));
            } catch {
                this.toast.show('Не вдалося завантажити фото', 'error');
            }
        }
        this.uploading.set(false);
        input.value = '';
        this.form.markAsDirty();
    }

    protected setPrimary(index: number): void {
        this.images.controls.forEach((control, i) =>
            control.setValue({ ...control.value, isPrimary: i === index }));
        this.form.markAsDirty();
    }
    protected removeImage(index: number): void {
        const wasPrimary = this.images.at(index).value.isPrimary;
        this.images.removeAt(index);
        if (wasPrimary && this.images.length > 0) {
            this.images.at(0).setValue({ ...this.images.at(0).value, isPrimary: true });
        }
        this.form.markAsDirty();
    }

    protected imageUrl(index: number): string { return this.images.at(index).value.url; }
    protected imageIsPrimary(index: number): boolean { return this.images.at(index).value.isPrimary; }

    private buildDish(status: 'draft' | 'published'): Partial<Dish> {
        const v = this.form.getRawValue();
        return {
            familyId: v.familyId!,
            title: v.title!,
            slug: v.slug!,
            description: v.description ?? '',
            visibility: (this.canMakePublic() ? v.visibility : 'family') as Dish['visibility'],
            status,
            images: this.images.value,
            ingredients: this.ingredients.value,
            steps: this.steps.value.map((s: { description: string; duration: number | null }, i: number) => ({
                order: i + 1, description: s.description, duration: s.duration ?? undefined,
            })),
            cookingTime: { preparation: v.prepTime ?? 0, cooking: v.cookTime ?? 0, total: v.totalTime ?? 0 },
            calories: v.calories ?? 0,
            servings: v.servings ?? 1,
            difficulty: v.difficulty as Dish['difficulty'],
            price: { amount: v.priceAmount ?? 0, currency: v.priceCurrency ?? 'UAH' },
            categories: v.categories ?? [],
            tags: this.tags.value,
            tasteProfile: v.taste as Dish['tasteProfile'],
            notes: v.notes ?? '',
            sourceUrl: v.sourceUrl ?? '',
        };
    }

    protected async save(status: 'draft' | 'published'): Promise<void> {
        if (this.form.controls.title.invalid || this.form.controls.familyId.invalid) {
            this.form.markAllAsTouched();
            this.toast.show('Заповніть назву та оберіть родину', 'error');
            return;
        }
        this.saving.set(true);
        try {
            const payload = this.buildDish(status);
            let dish: Dish;
            if (this.isEdit()) {
                dish = await this.dishService.updateDish(this.editId()!, payload);
            } else {
                dish = await this.dishService.createDish(payload);
            }
            this.saved = true;
            this.drafts.clear(null);
            this.toast.show(status === 'published' ? 'Опубліковано ✨' : 'Чернетку збережено', 'success');
            void this.router.navigate(['/dish', dish.slug]);
        } catch (error: any) {
            this.toast.show(`Помилка: ${error?.message ?? 'не вдалося зберегти'}`, 'error');
        } finally {
            this.saving.set(false);
        }
    }

    protected cancel(): void {
        void this.router.navigate(this.isEdit() ? ['/dish', this.form.controls.slug.value] : ['/']);
    }

    /** Delete the current recipe (edit mode) after a confirmation dialog. */
    protected async remove(): Promise<void> {
        const id = this.editId();
        if (!id || this.deleting()) return;
        const ok = await this.confirm.ask({
            title: 'Видалити рецепт?',
            message: `«${this.form.controls.title.value || 'Цей рецепт'}» буде видалено назавжди разом із фото, інгредієнтами та кроками. Цю дію не можна скасувати.`,
            confirmLabel: 'Видалити',
            danger: true,
            icon: 'delete',
        });
        if (!ok) return;
        this.deleting.set(true);
        try {
            await this.dishService.deleteDish(id);
            this.saved = true;
            this.drafts.clear(id);
            this.toast.show('Рецепт видалено', 'success');
            void this.router.navigate(['/']);
        } catch (error: any) {
            this.toast.show(`Не вдалося видалити: ${error?.message ?? 'помилка'}`, 'error');
        } finally {
            this.deleting.set(false);
        }
    }

    canDeactivate(): boolean {
        // New-recipe work is autosaved locally, so leaving never loses it.
        if (this.saved || !this.form.dirty || !this.isEdit()) return true;
        return confirm('Залишити редактор? Незбережені зміни цього рецепта буде втрачено.');
    }
}
