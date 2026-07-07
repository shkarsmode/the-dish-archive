import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';
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
import { DishService } from '../../core/services/dish.service';
import { FamilyService } from '../../core/services/family.service';
import { AuthService } from '../../core/services/auth.service';
import { UploadService } from '../../core/services/upload.service';
import { ToastService } from '../../core/services/toast.service';

const CYRILLIC: Record<string, string> = {
    а: 'a', б: 'b', в: 'v', г: 'h', ґ: 'g', д: 'd', е: 'e', є: 'ie', ж: 'zh', з: 'z', и: 'y',
    і: 'i', ї: 'i', й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's',
    т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ь: '', ю: 'iu', я: 'ia',
};
const slugify = (v: string) => v.toLowerCase().split('').map(c => CYRILLIC[c] ?? c).join('')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

@Component({
    selector: 'app-recipe-editor',
    imports: [ReactiveFormsModule, FormsModule],
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
    private readonly uploadService = inject(UploadService);
    private readonly toast = inject(ToastService);

    protected readonly allCategories = ALL_CATEGORIES;
    protected readonly categoryLabels = CATEGORY_LABELS;
    protected readonly tasteKeys = ALL_TASTE_KEYS;
    protected readonly tasteLabels = TASTE_LABELS;
    protected readonly difficultyLabels = DIFFICULTY_LABELS;
    protected readonly difficulties: DishDifficulty[] = ['easy', 'medium', 'hard'];

    protected readonly saving = signal(false);
    protected readonly uploading = signal(false);
    protected saved = false;

    private readonly editId = toSignal(this.route.paramMap.pipe(map(p => p.get('dishId'))));
    protected readonly isEdit = computed(() => !!this.editId());

    protected readonly form = this.fb.group({
        familyId: ['', Validators.required],
        title: ['', Validators.required],
        slug: ['', Validators.required],
        description: [''],
        visibility: ['family'],
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
        // Default family = first editable one.
        queueMicrotask(() => {
            const id = this.editId();
            if (id) {
                this.loadDish(id);
            } else {
                const first = this.familyService.editableFamilies()[0];
                if (first) this.form.controls.familyId.setValue(first.id);
                this.addIngredient();
                this.addStep();
            }
        });
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

    canDeactivate(): boolean {
        return this.saved || !this.form.dirty || confirm('Залишити редактор? Незбережені зміни буде втрачено.');
    }
}
