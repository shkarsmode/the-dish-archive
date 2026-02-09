import { Component, ElementRef, HostListener, inject, signal } from '@angular/core';
import { SORT_OPTIONS, SortOption } from '../../core/models/dish.model';
import { DishService } from '../../core/services/dish.service';

@Component({
    selector: 'app-sort-dropdown',
    template: `
        <div class="sort-dropdown">
            <button
                class="sort-trigger"
                (click)="toggleDropdown()"
                [attr.aria-expanded]="isOpen()"
                aria-haspopup="listbox"
                aria-label="Сортування">
                <span class="material-symbols-outlined">sort</span>
                <span class="sort-label">{{ currentLabel() }}</span>
                <span class="material-symbols-outlined chevron" [class.rotated]="isOpen()">
                    expand_more
                </span>
            </button>
            @if (isOpen()) {
                <div class="sort-backdrop" [class.closing]="isClosing() || isDragClosing()" (click)="closeDropdown()"></div>
                <div class="sort-menu" role="listbox" aria-label="Варіанти сортування"
                     [class.closing]="isClosing()"
                     [class.drag-closing]="isDragClosing()"
                     [class.snapping]="isSnapping()"
                     [style.transform]="dragTransform()"
                     (animationend)="onAnimationDone()"
                     (transitionend)="onTransitionDone()"
                     (touchstart)="onDragStart($event)"
                     (touchmove)="onDragMove($event)"
                     (touchend)="onDragEnd()">
                    <div class="sort-menu-handle">
                        <div class="handle-bar"></div>
                    </div>
                    @for (option of sortOptions; track option.value) {
                        <button
                            class="sort-option"
                            role="option"
                            [class.active]="dishService.sortOption() === option.value"
                            [attr.aria-selected]="dishService.sortOption() === option.value"
                            (click)="selectOption(option.value)">
                            <span>{{ option.label }}</span>
                            @if (dishService.sortOption() === option.value) {
                                <span class="material-symbols-outlined check-icon">check</span>
                            }
                        </button>
                    }
                </div>
            }
        </div>
    `,
    styles: `
        @use 'mixins' as m;

        .sort-dropdown {
            position: relative;
        }

        .sort-trigger {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 40px;
            height: 40px;
            border-radius: var(--radius-full);
            font-size: var(--text-sm);
            color: var(--color-text-secondary);
            white-space: nowrap;
            transition: color var(--transition-fast),
                        background-color var(--transition-fast);

            @include m.hover {
                color: var(--color-text-primary);
                background-color: var(--color-surface-hover);
            }

            &:active {
                background-color: var(--color-surface-active);
            }

            .material-symbols-outlined {
                font-size: 20px;
            }

            @media (min-width: 768px) {
                width: auto;
                height: auto;
                gap: var(--space-2);
                padding: var(--space-2) var(--space-3);
                border-radius: var(--radius-sm);

                .material-symbols-outlined {
                    font-size: 18px;
                }
            }
        }

        .chevron {
            display: none;
            transition: transform var(--transition-base);

            @media (min-width: 768px) {
                display: inline;
            }

            &.rotated {
                transform: rotate(180deg);
            }
        }

        .sort-backdrop {
            position: fixed;
            inset: 0;
            background: var(--color-backdrop);
            z-index: var(--z-drawer);
            animation: fadeIn 150ms ease;

            &.closing {
                animation: fadeOut 200ms ease forwards;
            }

            @media (min-width: 768px) {
                display: none;
            }
        }

        .sort-menu {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: var(--color-surface);
            border-radius: var(--radius-xl) var(--radius-xl) 0 0;
            box-shadow: 0 -4px 32px rgba(0, 0, 0, 0.12);
            padding: var(--space-2) var(--space-2) calc(var(--space-2) + env(safe-area-inset-bottom, 0px));
            z-index: calc(var(--z-drawer) + 1);
            animation: slideUp 200ms var(--ease-out-expo);
            touch-action: none;
            will-change: transform;

            &.closing {
                animation: slideDown 200ms ease forwards;
            }

            &.drag-closing {
                animation: none;
                transition: transform 250ms ease, opacity 200ms ease;
                opacity: 0;
            }

            &.snapping {
                transition: transform 200ms var(--ease-out-expo);
            }

            @media (min-width: 768px) {
                position: absolute;
                top: calc(100% + var(--space-1));
                right: 0;
                left: auto;
                bottom: auto;
                min-width: 200px;
                border: 1px solid var(--color-border-light);
                border-radius: var(--radius-md);
                box-shadow: var(--shadow-lg);
                padding: var(--space-1);
                animation: scaleIn 150ms var(--ease-out-expo);
                touch-action: auto;

                &.closing {
                    animation: scaleIn 150ms ease reverse forwards;
                }
            }
        }

        @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
        }

        @keyframes slideDown {
            from { transform: translateY(0); opacity: 1; }
            to { transform: translateY(100%); opacity: 0; }
        }

        .sort-menu-handle {
            display: flex;
            justify-content: center;
            padding: var(--space-2) 0 var(--space-3);

            @media (min-width: 768px) {
                display: none;
            }
        }

        .handle-bar {
            width: 36px;
            height: 4px;
            background: var(--color-border);
            border-radius: 2px;
        }

        .sort-option {
            display: flex;
            align-items: center;
            justify-content: space-between;
            width: 100%;
            padding: var(--space-2) var(--space-3);
            border-radius: var(--radius-sm);
            font-size: var(--text-sm);
            color: var(--color-text-secondary);
            transition: background-color var(--transition-fast),
                        color var(--transition-fast);

            @include m.hover {
                background-color: var(--color-surface-hover);
                color: var(--color-text-primary);
            }

            &.active {
                color: var(--color-accent-dark);
                font-weight: var(--weight-medium);
            }
        }

        .check-icon {
            font-size: 16px;
            color: var(--color-accent);
        }

        .sort-label {
            display: none;

            @media (min-width: 768px) {
                display: inline;
            }
        }
    `,
})
export class SortDropdownComponent {
    protected readonly dishService = inject(DishService);
    private readonly elementRef = inject(ElementRef);

    protected readonly isOpen = signal(false);
    protected readonly isClosing = signal(false);
    protected readonly isDragClosing = signal(false);
    protected readonly isSnapping = signal(false);
    protected readonly sortOptions = SORT_OPTIONS;

    private dragStartY = 0;
    private dragCurrentY = 0;
    private isDragging = false;
    protected readonly dragTransform = signal('');

    protected currentLabel = () => {
        const currentValue = this.dishService.sortOption();
        return SORT_OPTIONS.find(o => o.value === currentValue)?.label ?? 'Сортування';
    };

    @HostListener('document:click', ['$event'])
    protected onDocumentClick(event: MouseEvent): void {
        if (!this.elementRef.nativeElement.contains(event.target)) {
            if (this.isOpen()) this.closeDropdown();
        }
    }

    protected toggleDropdown(): void {
        if (this.isOpen()) {
            this.closeDropdown();
        } else {
            this.isClosing.set(false);
            this.isDragClosing.set(false);
            this.isOpen.set(true);
            this.lockScroll();
        }
    }

    protected closeDropdown(): void {
        if (window.innerWidth >= 768) {
            // Desktop: no backdrop animation — close immediately with a tiny delay
            // so the scaleIn reverse animation can play
            this.isClosing.set(true);
            setTimeout(() => {
                this.isOpen.set(false);
                this.isClosing.set(false);
                this.dragTransform.set('');
            }, 160);
        } else {
            this.isClosing.set(true);
        }
    }

    protected onAnimationDone(): void {
        if (this.isClosing()) {
            this.isOpen.set(false);
            this.isClosing.set(false);
            this.dragTransform.set('');
            this.unlockScroll();
        }
    }

    protected onTransitionDone(): void {
        if (this.isDragClosing()) {
            this.isOpen.set(false);
            this.isDragClosing.set(false);
            this.dragTransform.set('');
            this.unlockScroll();
        }
        if (this.isSnapping()) {
            this.isSnapping.set(false);
        }
    }

    protected selectOption(value: SortOption): void {
        this.dishService.updateSort(value);
        this.closeDropdown();
    }

    // ── Swipe-to-dismiss ──
    protected onDragStart(e: TouchEvent): void {
        this.dragStartY = e.touches[0].clientY;
        this.dragCurrentY = this.dragStartY;
        this.isDragging = true;
    }

    protected onDragMove(e: TouchEvent): void {
        if (!this.isDragging) return;
        this.dragCurrentY = e.touches[0].clientY;
        const dy = Math.max(0, this.dragCurrentY - this.dragStartY);
        if (dy > 0) {
            e.preventDefault();
            this.dragTransform.set(`translateY(${dy}px)`);
        }
    }

    protected onDragEnd(): void {
        if (!this.isDragging) return;
        this.isDragging = false;
        const dy = this.dragCurrentY - this.dragStartY;
        if (dy > 60) {
            // Slide down from current position
            this.isDragClosing.set(true);
            this.dragTransform.set(`translateY(100vh)`);
        } else if (dy > 5) {
            // Snap back smoothly
            this.isSnapping.set(true);
            this.dragTransform.set('translateY(0)');
        } else {
            // Barely moved — reset instantly
            this.dragTransform.set('');
        }
    }

    private lockScroll(): void {
        if (window.innerWidth < 768) {
            document.body.style.overflow = 'hidden';
        }
    }

    private unlockScroll(): void {
        document.body.style.overflow = '';
    }
}
