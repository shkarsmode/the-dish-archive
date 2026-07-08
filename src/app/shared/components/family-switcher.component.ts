import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FamilyService } from '../../core/services/family.service';
import { DishService } from '../../core/services/dish.service';
import { AuthService } from '../../core/services/auth.service';

const CYR_LAT_INITIAL = (name: string): string => {
    const c = (name.trim()[0] ?? '?').toUpperCase();
    return c;
};

/**
 * "Stories"-style family switcher: a horizontal row of avatar circles with
 * theme-colored active rings, recipe counts, and an inline manage-gear for
 * families the user can administer. Reads/writes the dish family filter directly.
 */
@Component({
    selector: 'app-family-switcher',
    imports: [RouterLink],
    template: `
        @if (families().length > 1) {
            <section class="fs" aria-label="Родини">
                <div class="fs-track">
                    <!-- All families -->
                    <button type="button" class="fs-item" [class.active]="selectedId() === null" (click)="select(null)">
                        <span class="fs-ring all">
                            <span class="fs-avatar all"><span class="material-symbols-outlined">grid_view</span></span>
                        </span>
                        <span class="fs-name">Всі родини</span>
                        <span class="fs-count">{{ totalCount() }}</span>
                    </button>

                    @for (f of families(); track f.id) {
                        <div class="fs-cell">
                            <button type="button" class="fs-item" [class.active]="selectedId() === f.id"
                                [style.--ring]="f.themeColor || 'var(--color-accent)'" (click)="select(f.id)">
                                <span class="fs-ring">
                                    <span class="fs-avatar" [style.background]="tint(f.themeColor)">
                                        @if (avatarOf(f); as src) {
                                            <img [src]="src" alt="" referrerpolicy="no-referrer">
                                        } @else {
                                            <span class="fs-initial" [style.color]="f.themeColor || 'var(--color-accent-dark)'">{{ initial(f.name) }}</span>
                                        }
                                    </span>
                                </span>
                                <span class="fs-name">{{ f.name }}</span>
                                <span class="fs-count">{{ countFor(f.id) }}</span>
                            </button>
                            @if (auth.canAdminFamily(f.id)) {
                                <a class="fs-gear" [routerLink]="['/family', f.slug, 'admin']"
                                    title="Керувати родиною" aria-label="Керувати родиною">
                                    <span class="material-symbols-outlined">settings</span>
                                </a>
                            }
                        </div>
                    }
                </div>
            </section>
        }
    `,
    styles: `
        @use 'mixins' as m;

        .fs { padding: var(--space-3) 0 var(--space-2); }
        .fs-track {
            display: flex; gap: var(--space-4);
            padding: var(--space-1) var(--space-4) var(--space-2);
            overflow-x: auto; scrollbar-width: none;
            scroll-snap-type: x proximity;
            max-width: var(--container-max); margin: 0 auto;
        }
        .fs-track::-webkit-scrollbar { display: none; }
        @include m.tablet {
            .fs-track { justify-content: center; flex-wrap: wrap; overflow: visible; }
        }

        .fs-cell { position: relative; scroll-snap-align: start; }

        .fs-item {
            display: flex; flex-direction: column; align-items: center; gap: 6px;
            width: 74px; flex: none; padding: 0; border: none; background: none; cursor: pointer;
            scroll-snap-align: start;
        }

        /* Ring — theme colored, lit when active */
        .fs-ring {
            display: grid; place-items: center;
            width: 62px; height: 62px; border-radius: var(--radius-full);
            background: var(--color-surface);
            box-shadow: 0 0 0 2px var(--color-border) inset;
            transition: box-shadow var(--transition-base), transform var(--transition-spring);
        }
        .fs-item:hover .fs-ring { transform: translateY(-2px); }
        .fs-item.active .fs-ring {
            box-shadow: 0 0 0 2.5px var(--ring, var(--color-accent)),
                        0 0 0 5px color-mix(in srgb, var(--ring, var(--color-accent)) 22%, transparent);
        }
        .fs-ring.all { box-shadow: 0 0 0 2px var(--color-border) inset; }
        .fs-item.active .fs-ring.all {
            box-shadow: 0 0 0 2.5px var(--color-accent),
                        0 0 0 5px var(--color-accent-light);
        }

        .fs-avatar {
            display: grid; place-items: center;
            width: 52px; height: 52px; border-radius: var(--radius-full); overflow: hidden;
            background: var(--color-surface-hover);
        }
        .fs-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .fs-avatar.all { background: var(--color-accent-light); color: var(--color-accent-dark); }
        .fs-avatar.all .material-symbols-outlined { font-size: 26px; }
        .fs-initial { font-family: var(--font-display); font-weight: var(--weight-bold); font-size: var(--text-xl); }

        .fs-name {
            max-width: 74px; font-size: var(--text-xs); font-weight: var(--weight-medium);
            color: var(--color-text-secondary); text-align: center; line-height: 1.15;
            overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .fs-item.active .fs-name { color: var(--color-text-primary); font-weight: var(--weight-semibold); }
        .fs-count {
            font-size: 10px; font-weight: var(--weight-semibold); color: var(--color-text-tertiary);
            line-height: 1; padding: 2px 7px; border-radius: var(--radius-full); background: var(--color-surface-active);
        }
        .fs-item.active .fs-count { background: color-mix(in srgb, var(--ring, var(--color-accent)) 16%, transparent); color: var(--color-text-primary); }

        .fs-gear {
            position: absolute; top: -2px; right: 4px;
            display: grid; place-items: center; width: 24px; height: 24px;
            border-radius: var(--radius-full); background: var(--color-surface);
            box-shadow: var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.18)); color: var(--color-text-secondary);
            opacity: 0; transition: opacity var(--transition-base), color var(--transition-base);
        }
        .fs-cell:hover .fs-gear, .fs-item.active + .fs-gear { opacity: 1; }
        .fs-gear:hover { color: var(--color-accent); }
        .fs-gear .material-symbols-outlined { font-size: 15px; }
        @media (hover: none) { .fs-gear { opacity: 1; } }
    `,
})
export class FamilySwitcherComponent {
    private readonly familyService = inject(FamilyService);
    private readonly dishService = inject(DishService);
    protected readonly auth = inject(AuthService);

    protected readonly families = this.familyService.families;

    private readonly counts = computed(() => {
        const map = new Map<string, number>();
        for (const dish of this.dishService.allDishes()) {
            map.set(dish.familyId, (map.get(dish.familyId) ?? 0) + 1);
        }
        return map;
    });
    protected readonly totalCount = computed(() => this.dishService.allDishes().length);

    protected readonly selectedId = computed(() => {
        const ids = this.dishService.filters().selectedFamilyIds;
        return ids.length === 1 ? ids[0] : null;
    });

    protected countFor(familyId: string): number { return this.counts().get(familyId) ?? 0; }
    protected initial(name: string): string { return CYR_LAT_INITIAL(name); }
    protected avatarOf(f: { avatarImageUrl: string | null; coverImageUrl: string | null }): string | null {
        return f.avatarImageUrl || f.coverImageUrl || null;
    }
    protected tint(color: string | null): string {
        return color ? `color-mix(in srgb, ${color} 14%, var(--color-surface))` : 'var(--color-surface-hover)';
    }

    protected select(familyId: string | null): void {
        this.dishService.updateFilters({ selectedFamilyIds: familyId ? [familyId] : [] });
    }
}
