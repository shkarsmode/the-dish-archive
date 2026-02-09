import { Component, computed, ElementRef, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import {
    CATEGORY_LABELS,
    DIFFICULTY_LABELS,
    Dish,
    DishCategory,
    DishDifficulty,
    TASTE_LABELS,
    TasteProfile,
} from '../../core/models/dish.model';
import { ChecklistService } from '../../core/services/checklist.service';
import { DishService } from '../../core/services/dish.service';
import { PaletteService } from '../../core/services/palette.service';
import { ToastService } from '../../core/services/toast.service';
import { FavoritesButtonComponent } from '../../shared/components/favorites-button.component';
import { RatingStarsComponent } from '../../shared/components/rating-stars.component';
import { TagChipComponent } from '../../shared/components/tag-chip.component';
import { TasteRadarComponent } from '../../shared/components/taste-radar.component';

@Component({
    selector: 'app-dish-detail',
    imports: [RouterLink, RatingStarsComponent, FavoritesButtonComponent, TagChipComponent, TasteRadarComponent],
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
}
