import { Component, computed, effect, ElementRef, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import {
    ALL_CATEGORIES,
    CATEGORY_LABELS,
    CookingStep,
    DIFFICULTY_LABELS,
    Dish,
    DishCategory,
    DishDifficulty,
    ImageItem,
    Ingredient,
    TASTE_LABELS,
    TasteProfile,
} from '../../core/models/dish.model';
import { AdminService } from '../../core/services/admin.service';
import { ChecklistService } from '../../core/services/checklist.service';
import { DishService } from '../../core/services/dish.service';
import { PaletteService } from '../../core/services/palette.service';
import { ToastService } from '../../core/services/toast.service';
import { FavoritesButtonComponent } from '../../shared/components/favorites-button.component';
import { ImageEditorComponent, ImageEditorResult } from '../../shared/components/image-editor.component';
import { RatingStarsComponent } from '../../shared/components/rating-stars.component';
import { TagChipComponent } from '../../shared/components/tag-chip.component';
import { TasteRadarComponent } from '../../shared/components/taste-radar.component';

@Component({
    selector: 'app-dish-detail',
    imports: [RouterLink, RatingStarsComponent, FavoritesButtonComponent, TagChipComponent, TasteRadarComponent, FormsModule, ImageEditorComponent],
    templateUrl: './dish-detail.html',
    styleUrl: './dish-detail.scss',
    host: {
        style: 'display: block; transition: --color-accent 600ms ease, --color-accent-light 600ms ease, --color-accent-dark 600ms ease, --color-accent-hover 600ms ease;',
    },
})
export class DishDetailPage {
    private readonly route = inject(ActivatedRoute);
    private readonly dishService = inject(DishService);
    private readonly router = inject(Router);
    protected readonly checklistService = inject(ChecklistService);
    private readonly paletteService = inject(PaletteService);
    private readonly toastService = inject(ToastService);
    private readonly el = inject(ElementRef<HTMLElement>);
    protected readonly adminService = inject(AdminService);

    // Inline editing state
    protected readonly editingField = signal<string | null>(null);
    protected readonly editDraft = signal<Partial<Dish>>({});
    protected readonly isSaving = signal(false);
    protected readonly newTag = signal('');
    protected readonly allCategories = ALL_CATEGORIES;
    protected readonly categoryLabels = CATEGORY_LABELS;

    // Image manager state
    protected readonly isImageManagerOpen = signal(false);
    protected readonly editImages = signal<ImageItem[]>([]);
    protected readonly isUploadingImage = signal(false);
    protected readonly editingAltIndex = signal<number | null>(null);

    // Image editor state
    protected readonly isEditorOpen = signal(false);
    protected readonly editorSource = signal<string | File | null>(null);
    private editorEditIndex: number | null = null; // null = new image, number = replace existing

    private readonly slug = toSignal(
        this.route.paramMap.pipe(map(params => params.get('slug') ?? ''))
    );

    readonly dish = computed(() => {
        const slugValue = this.slug();
        if (!slugValue) return undefined;
        return this.dishService.getDishBySlug(slugValue)();
    });

    readonly isLoading = this.dishService.isLoading;

    protected readonly isNew = computed(() => {
        const d = this.dish();
        if (!d?.createdAt) return false;
        return Date.now() - new Date(d.createdAt).getTime() < 7 * 24 * 60 * 60 * 1000;
    });

    protected readonly activeImageIndex = signal(0);
    protected readonly completedSteps = signal<Set<number>>(new Set());

    // Swipe navigation
    protected readonly adjacentDishes = computed(() => {
        const all = this.dishService.filteredDishes();
        const current = this.dish();
        if (!current || all.length < 2) return { prev: undefined, next: undefined };
        const idx = all.findIndex(d => d.id === current.id);
        return {
            prev: idx > 0 ? all[idx - 1] : undefined,
            next: idx < all.length - 1 ? all[idx + 1] : undefined,
        };
    });

    private touchStartX = 0;
    private lastDishId: string | null = null;

    constructor() {
        effect(() => {
            const currentDish = this.dish();

            if (!currentDish) {
                this.lastDishId = null;
                this.activeImageIndex.set(0);
                return;
            }

            const images = currentDish.images ?? [];
            if (images.length === 0) {
                this.activeImageIndex.set(0);
                this.lastDishId = currentDish.id;
                return;
            }

            const isNewDish = this.lastDishId !== currentDish.id;
            const activeIndex = this.activeImageIndex();
            const isActiveOutOfRange = activeIndex < 0 || activeIndex >= images.length;

            if (isNewDish || isActiveOutOfRange) {
                this.activeImageIndex.set(this.getPrimaryImageIndex(images));
            }

            this.lastDishId = currentDish.id;
        });
    }

    private getPrimaryImageIndex(images: ImageItem[]): number {
        const primaryIndex = images.findIndex(image => image.isPrimary);
        return primaryIndex >= 0 ? primaryIndex : 0;
    }

    protected get currentImage(): string {
        const dishValue = this.dish();
        if (!dishValue || dishValue.images.length === 0) return '';
        return dishValue.images[this.activeImageIndex()]?.url ?? dishValue.images[0]?.url ?? '';
    }

    protected get currentImageAlt(): string {
        const dishValue = this.dish();
        if (!dishValue || dishValue.images.length === 0) return '';
        return dishValue.images[this.activeImageIndex()]?.alt ?? dishValue.title;
    }

    protected getCategoryLabel(category: DishCategory): string {
        return CATEGORY_LABELS[category] ?? category;
    }

    protected getDifficultyLabel(difficulty: DishDifficulty): string {
        return DIFFICULTY_LABELS[difficulty] ?? difficulty;
    }

    protected getTasteLabel(key: string): string {
        return TASTE_LABELS[key as keyof TasteProfile] ?? key;
    }

    protected getTasteEntries(dish: Dish): { key: string; label: string; value: number }[] {
        return Object.entries(dish.tasteProfile)
            .filter(([, value]) => value > 0)
            .map(([key, value]) => ({
                key,
                label: this.getTasteLabel(key),
                value: value as number,
            }))
            .sort((a, b) => b.value - a.value);
    }

    protected formatDate(isoString: string): string {
        return new Date(isoString).toLocaleDateString('uk-UA', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    }

    protected selectImage(index: number): void {
        this.activeImageIndex.set(index);
    }

    protected async shareDish(): Promise<void> {
        const d = this.dish();
        if (!d) return;

        const url = window.location.href;
        const text = `${d.title} — ${d.cookingTime.total} хв · ${d.calories} ккал`;

        // Native share (mobile)
        if (navigator.share) {
            try {
                await navigator.share({ title: d.title, text, url });
                return;
            } catch {
                // User cancelled — do nothing
                return;
            }
        }

        // Fallback: copy link
        try {
            await navigator.clipboard.writeText(url);
            this.toastService.success('Посилання скопійовано');
        } catch {
            this.toastService.error('Не вдалося скопіювати');
        }
    }

    protected onHeroLoad(event: Event): void {
        const img = event.target as HTMLImageElement;
        const palette = this.paletteService.extractFromImage(img);
        if (!palette) return;

        const host = this.el.nativeElement;
        host.style.setProperty('--color-accent', palette.accent);
        host.style.setProperty('--color-accent-light', palette.accentLight);
        host.style.setProperty('--color-accent-dark', palette.accentDark);
        host.style.setProperty('--color-accent-hover', palette.accentHover);
    }

    protected onImageError(event: Event): void {
        const img = event.target as HTMLImageElement;
        img.src = 'data:image/svg+xml,' + encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" fill="%23F0EDE8">` +
            `<rect width="800" height="500"/>` +
            `<text x="400" y="250" text-anchor="middle" dy=".3em" fill="%23A0A0A0" font-family="Inter,sans-serif" font-size="16">` +
            `Зображення недоступне</text></svg>`
        );
    }

    // ── Ingredient checklist with confetti ──
    protected toggleIngredient(dishId: string, name: string, total: number): void {
        const wasChecked = this.checklistService.isChecked(dishId, name)();
        this.checklistService.toggle(dishId, name);

        if (!wasChecked) {
            const { allDone } = this.checklistService.checkedCount(dishId, total)();
            if (allDone) {
                this.launchConfetti();
            }
        }
    }

    // ── Steps checklist ──
    protected isStepDone(order: number): boolean {
        return this.completedSteps().has(order);
    }

    protected toggleStep(order: number): void {
        this.completedSteps.update(s => {
            const next = new Set(s);
            if (next.has(order)) {
                next.delete(order);
            } else {
                next.add(order);
            }
            return next;
        });
    }

    // ── Swipe navigation ──
    protected onTouchStart(event: TouchEvent): void {
        this.touchStartX = event.touches[0].clientX;
    }

    protected onTouchEnd(event: TouchEvent): void {
        const diff = this.touchStartX - event.changedTouches[0].clientX;
        const threshold = 80;
        if (Math.abs(diff) < threshold) return;

        const { prev, next } = this.adjacentDishes();
        if (diff > 0 && next) {
            this.router.navigate(['/dish', next.slug]);
        } else if (diff < 0 && prev) {
            this.router.navigate(['/dish', prev.slug]);
        }
    }

    // ── Confetti ──
    private launchConfetti(): void {
        const emojis = ['🎉', '✨', '🌟', '💫', '🎊', '⭐'];
        for (let i = 0; i < 30; i++) {
            const el = document.createElement('span');
            el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
            const x = 20 + Math.random() * 60;
            const delay = Math.random() * 300;
            Object.assign(el.style, {
                position: 'fixed',
                left: `${x}vw`,
                top: '-20px',
                fontSize: `${14 + Math.random() * 18}px`,
                pointerEvents: 'none',
                zIndex: '9999',
                opacity: '1',
                transition: `all ${1.2 + Math.random() * 0.8}s cubic-bezier(0.25, 0.46, 0.45, 0.94)`,
                transitionDelay: `${delay}ms`,
            });
            document.body.appendChild(el);

            requestAnimationFrame(() => {
                el.style.top = `${70 + Math.random() * 30}vh`;
                el.style.left = `${x + (Math.random() - 0.5) * 20}vw`;
                el.style.opacity = '0';
                el.style.transform = `rotate(${Math.random() * 720 - 360}deg)`;
            });

            setTimeout(() => el.remove(), 2500);
        }
    }

    // ── Inline editing ──

    protected startEditing(field: string): void {
        if (!this.adminService.isAdminMode()) return;
        const d = this.dish();
        if (!d) return;

        this.editingField.set(field);
        // Create a deep copy of current dish as draft
        this.editDraft.set(JSON.parse(JSON.stringify(d)));
    }

    protected isEditing(field: string): boolean {
        return this.adminService.isAdminMode() && this.editingField() === field;
    }

    protected cancelEditing(): void {
        this.editingField.set(null);
        this.editDraft.set({});
    }

    protected async saveField(field: string): Promise<void> {
        const d = this.dish();
        const draft = this.editDraft();
        if (!d || !draft) return;

        this.isSaving.set(true);
        try {
            const updates: Partial<Dish> = {};
            (updates as any)[field] = (draft as any)[field];
            await this.dishService.updateDish(d.id, updates);
            this.toastService.success('Збережено ✨');
            this.editingField.set(null);
        } catch {
            this.toastService.error('Помилка збереження');
        } finally {
            this.isSaving.set(false);
        }
    }

    protected async saveFullDish(): Promise<void> {
        const d = this.dish();
        const draft = this.editDraft();
        if (!d) return;

        this.isSaving.set(true);
        try {
            await this.dishService.updateDish(d.id, draft);
            this.toastService.success('Страву збережено ✨');
            this.editingField.set(null);
        } catch {
            this.toastService.error('Помилка збереження');
        } finally {
            this.isSaving.set(false);
        }
    }

    protected updateDraft(field: string, value: any): void {
        this.editDraft.update(d => ({ ...d, [field]: value }));
    }

    protected updateNestedDraft(path: string, value: any): void {
        this.editDraft.update(d => {
            const copy = JSON.parse(JSON.stringify(d));
            const keys = path.split('.');
            let obj = copy;
            for (let i = 0; i < keys.length - 1; i++) {
                obj = obj[keys[i]];
            }
            obj[keys[keys.length - 1]] = value;
            return copy;
        });
    }

    protected addTag(): void {
        const tag = this.newTag().trim();
        if (!tag) return;
        this.editDraft.update(d => {
            const tags = [...(d.tags ?? [])];
            if (!tags.includes(tag)) tags.push(tag);
            return { ...d, tags };
        });
        this.newTag.set('');
    }

    protected removeTag(tag: string): void {
        this.editDraft.update(d => ({
            ...d,
            tags: (d.tags ?? []).filter(t => t !== tag),
        }));
    }

    protected toggleCategory(cat: DishCategory): void {
        this.editDraft.update(d => {
            const cats = [...(d.categories ?? [])];
            const idx = cats.indexOf(cat);
            if (idx >= 0) cats.splice(idx, 1);
            else cats.push(cat);
            return { ...d, categories: cats };
        });
    }

    protected addIngredient(): void {
        this.editDraft.update(d => {
            const ingredients = [...(d.ingredients ?? [])];
            ingredients.push({ name: '', amount: '', unit: '', optional: false });
            return { ...d, ingredients };
        });
    }

    protected removeIngredient(index: number): void {
        this.editDraft.update(d => {
            const ingredients = [...(d.ingredients ?? [])];
            ingredients.splice(index, 1);
            return { ...d, ingredients };
        });
    }

    protected updateIngredient(index: number, field: keyof Ingredient, value: any): void {
        this.editDraft.update(d => {
            const ingredients = [...(d.ingredients ?? [])].map((ing, i) =>
                i === index ? { ...ing, [field]: value } : ing
            );
            return { ...d, ingredients };
        });
    }

    protected addStep(): void {
        this.editDraft.update(d => {
            const steps = [...(d.steps ?? [])];
            steps.push({ order: steps.length + 1, description: '', duration: undefined });
            return { ...d, steps };
        });
    }

    protected removeStep(index: number): void {
        this.editDraft.update(d => {
            const steps = [...(d.steps ?? [])].filter((_, i) => i !== index)
                .map((s, i) => ({ ...s, order: i + 1 }));
            return { ...d, steps };
        });
    }

    protected updateStep(index: number, field: keyof CookingStep, value: any): void {
        this.editDraft.update(d => {
            const steps = [...(d.steps ?? [])].map((step, i) =>
                i === index ? { ...step, [field]: value } : step
            );
            return { ...d, steps };
        });
    }

    // ── Image Manager ──

    protected openImageManager(): void {
        const d = this.dish();
        if (!d) return;
        this.editImages.set(JSON.parse(JSON.stringify(d.images)));
        this.isImageManagerOpen.set(true);
        this.editingAltIndex.set(null);
    }

    protected closeImageManager(): void {
        this.isImageManagerOpen.set(false);
        this.editImages.set([]);
        this.editingAltIndex.set(null);
    }

    protected async onImageFileSelected(event: Event): Promise<void> {
        const input = event.target as HTMLInputElement;
        const files = input.files;
        if (!files || files.length === 0) return;

        // If single file, open editor; if multiple, upload directly
        if (files.length === 1) {
            this.editorEditIndex = null;
            this.editorSource.set(files[0]);
            this.isEditorOpen.set(true);
        } else {
            this.isUploadingImage.set(true);
            try {
                for (const file of Array.from(files)) {
                    const result = await this.adminService.uploadImage(file);
                    const newImage: ImageItem = {
                        url: result.url,
                        alt: this.dish()?.title ?? 'Фото страви',
                        isPrimary: this.editImages().length === 0,
                    };
                    this.editImages.update(imgs => [...imgs, newImage]);
                }
                this.toastService.success('Зображення завантажено');
            } catch {
                this.toastService.error('Помилка завантаження');
            } finally {
                this.isUploadingImage.set(false);
            }
        }
        input.value = '';
    }

    // ── Image Editor ──

    protected openEditorForExisting(index: number): void {
        const img = this.editImages()[index];
        if (!img) return;
        this.editorEditIndex = index;
        this.editorSource.set(img.url);
        this.isEditorOpen.set(true);
    }

    protected closeEditor(): void {
        this.isEditorOpen.set(false);
        this.editorSource.set(null);
        this.editorEditIndex = null;
    }

    protected async onEditorSave(result: ImageEditorResult): Promise<void> {
        this.isUploadingImage.set(true);
        try {
            const file = new File([result.blob], 'edited.jpg', { type: 'image/jpeg' });
            const uploaded = await this.adminService.uploadImage(file);

            if (this.editorEditIndex !== null) {
                // Replace existing image
                const idx = this.editorEditIndex;
                this.editImages.update(imgs =>
                    imgs.map((img, i) => i === idx ? { ...img, url: uploaded.url } : img)
                );
                this.toastService.success('Фото оновлено');
            } else {
                // Add new image
                const newImage: ImageItem = {
                    url: uploaded.url,
                    alt: this.dish()?.title ?? 'Фото страви',
                    isPrimary: this.editImages().length === 0,
                };
                this.editImages.update(imgs => [...imgs, newImage]);
                this.toastService.success('Фото додано');
            }
        } catch {
            this.toastService.error('Помилка завантаження');
        } finally {
            this.isUploadingImage.set(false);
            this.closeEditor();
        }
    }

    protected removeImage(index: number): void {
        this.editImages.update(imgs => {
            const next = imgs.filter((_, i) => i !== index);
            // If removed was primary, make first one primary
            if (next.length > 0 && !next.some(img => img.isPrimary)) {
                next[0] = { ...next[0], isPrimary: true };
            }
            return next;
        });
    }

    protected setPrimaryImage(index: number): void {
        this.editImages.update(imgs =>
            imgs.map((img, i) => ({ ...img, isPrimary: i === index }))
        );
    }

    protected moveImage(index: number, direction: -1 | 1): void {
        const target = index + direction;
        this.editImages.update(imgs => {
            if (target < 0 || target >= imgs.length) return imgs;
            const copy = [...imgs];
            [copy[index], copy[target]] = [copy[target], copy[index]];
            return copy;
        });
    }

    protected startEditAlt(index: number): void {
        this.editingAltIndex.set(index);
    }

    protected updateImageAlt(index: number, alt: string): void {
        this.editImages.update(imgs =>
            imgs.map((img, i) => i === index ? { ...img, alt } : img)
        );
    }

    protected finishEditAlt(): void {
        this.editingAltIndex.set(null);
    }

    protected async saveImages(): Promise<void> {
        const d = this.dish();
        if (!d) return;

        this.isSaving.set(true);
        try {
            const nextImages = this.editImages();
            await this.dishService.updateDish(d.id, { images: nextImages });
            this.activeImageIndex.set(this.getPrimaryImageIndex(nextImages));
            this.toastService.success('Зображення збережено ✨');
            this.closeImageManager();
        } catch {
            this.toastService.error('Помилка збереження');
        } finally {
            this.isSaving.set(false);
        }
    }
}
