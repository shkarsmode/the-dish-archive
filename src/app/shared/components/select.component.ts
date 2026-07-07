import {
    Component,
    ElementRef,
    HostListener,
    Injector,
    OnDestroy,
    afterNextRender,
    computed,
    forwardRef,
    inject,
    input,
    signal,
    viewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/**
 * Body scroll-lock shared across all select instances via a reference count,
 * so the lock is only released once the last open sheet closes.
 */
let scrollLockCount = 0;
function acquireScrollLock(): void {
    if (scrollLockCount++ === 0) document.body.style.overflow = 'hidden';
}
function releaseScrollLock(): void {
    if (scrollLockCount > 0 && --scrollLockCount === 0) document.body.style.overflow = '';
}

export interface SelectOption {
    value: string;
    label: string;
    /** Optional Material Symbols icon name shown before the label. */
    icon?: string;
    /** Optional muted helper line under the label. */
    hint?: string;
    disabled?: boolean;
}

/**
 * Reusable custom dropdown. Desktop = anchored popover; mobile = bottom sheet
 * with a drag handle, backdrop, scroll-lock and swipe-to-dismiss. Fully keyboard
 * accessible and a ControlValueAccessor, so it works with `formControlName`,
 * `[(ngModel)]`, or `[ngModel] + (ngModelChange)`.
 */
@Component({
    selector: 'app-select',
    providers: [
        { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => SelectComponent), multi: true },
    ],
    template: `
        <div class="select" [class.inline]="variant() === 'inline'" [class.open]="isOpen()">
            <button
                #trigger
                type="button"
                class="select-trigger"
                [class.placeholder]="!selectedOption()"
                [disabled]="disabled()"
                (click)="toggle()"
                (keydown)="onTriggerKeydown($event)"
                [attr.aria-expanded]="isOpen()"
                aria-haspopup="listbox"
                [attr.aria-label]="ariaLabel() || placeholder()">
                @if (icon() || selectedOption()?.icon) {
                    <span class="material-symbols-outlined lead">{{ selectedOption()?.icon || icon() }}</span>
                }
                <span class="select-value">{{ selectedOption()?.label || placeholder() }}</span>
                <span class="material-symbols-outlined chevron" [class.rotated]="isOpen()">expand_more</span>
            </button>

            @if (isOpen()) {
                <div class="select-backdrop" [class.closing]="isClosing() || isDragClosing()" (click)="close()"></div>
                <div
                    #panel
                    class="select-menu"
                    role="listbox"
                    tabindex="-1"
                    [attr.aria-label]="ariaLabel() || placeholder()"
                    [class.closing]="isClosing()"
                    [class.drag-closing]="isDragClosing()"
                    [class.snapping]="isSnapping()"
                    [style.transform]="dragTransform()"
                    (keydown)="onPanelKeydown($event)"
                    (animationend)="onAnimationDone()"
                    (transitionend)="onTransitionDone()"
                    (touchstart)="onDragStart($event)"
                    (touchmove)="onDragMove($event)"
                    (touchend)="onDragEnd()">
                    <div class="select-handle"><div class="handle-bar"></div></div>
                    @if (sheetTitle()) { <div class="select-sheet-title">{{ sheetTitle() }}</div> }
                    <div class="select-options">
                        @for (option of options(); track option.value; let i = $index) {
                            <button
                                type="button"
                                class="select-option"
                                role="option"
                                [attr.data-index]="i"
                                [disabled]="option.disabled"
                                [class.active]="option.value === value()"
                                [class.focused]="i === activeIndex()"
                                [attr.aria-selected]="option.value === value()"
                                (click)="pick(option)"
                                (mouseenter)="activeIndex.set(i)">
                                @if (option.icon) { <span class="material-symbols-outlined opt-icon">{{ option.icon }}</span> }
                                <span class="opt-body">
                                    <span class="opt-label">{{ option.label }}</span>
                                    @if (option.hint) { <span class="opt-hint">{{ option.hint }}</span> }
                                </span>
                                @if (option.value === value()) {
                                    <span class="material-symbols-outlined check">check</span>
                                }
                            </button>
                        }
                    </div>
                </div>
            }
        </div>
    `,
    styles: `
        @use 'mixins' as m;

        :host { display: block; }
        .select { position: relative; }
        .select.inline { display: inline-block; }

        .select-trigger {
            display: flex; align-items: center; gap: var(--space-2);
            width: 100%; padding: 11px 13px; cursor: pointer;
            border: 1px solid var(--color-border); border-radius: var(--radius-md);
            background: var(--color-bg); color: var(--color-text-primary);
            font-family: var(--font-body); font-size: var(--text-base); text-align: left;
            transition: border-color var(--transition-base), background var(--transition-base);
        }
        .select-trigger:hover:not(:disabled) { border-color: var(--color-accent); }
        .select-trigger:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 0; border-color: transparent; }
        .select.open .select-trigger { border-color: var(--color-accent); }
        .select-trigger:disabled { opacity: 0.6; cursor: not-allowed; }
        .select-trigger.placeholder .select-value { color: var(--color-text-tertiary); }
        .select-value { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .lead { font-size: 19px; color: var(--color-text-secondary); flex: none; }
        .chevron { font-size: 20px; color: var(--color-text-tertiary); flex: none; transition: transform var(--transition-base); }
        .chevron.rotated { transform: rotate(180deg); }

        .select.inline .select-trigger {
            width: auto; padding: 8px 12px; border-radius: var(--radius-full);
            background: var(--color-surface); font-size: var(--text-sm); gap: 6px;
        }
        .select.inline .chevron { font-size: 18px; }

        .select-backdrop {
            position: fixed; inset: 0; background: var(--color-backdrop);
            z-index: var(--z-drawer); animation: fadeIn 150ms ease;
        }
        .select-backdrop.closing { animation: fadeOut 200ms ease forwards; }
        @media (min-width: 768px) { .select-backdrop { display: none; } }

        .select-menu {
            position: fixed; bottom: 0; left: 0; right: 0;
            background: var(--color-surface); border-radius: var(--radius-xl) var(--radius-xl) 0 0;
            box-shadow: 0 -4px 32px rgba(0,0,0,0.14);
            padding: var(--space-2) var(--space-2) calc(var(--space-3) + env(safe-area-inset-bottom, 0px));
            z-index: calc(var(--z-drawer) + 1); animation: slideUp 220ms var(--ease-out-expo);
            touch-action: none; will-change: transform; max-height: 70dvh; overflow-y: auto;
        }
        .select-menu.closing { animation: slideDown 200ms ease forwards; }
        .select-menu.drag-closing { animation: none; transition: transform 250ms ease, opacity 200ms ease; opacity: 0; }
        .select-menu.snapping { transition: transform 200ms var(--ease-out-expo); }

        @media (min-width: 768px) {
            .select-menu {
                position: absolute; top: calc(100% + var(--space-1)); left: 0; right: 0; bottom: auto;
                min-width: 200px; border: 1px solid var(--color-border-light);
                border-radius: var(--radius-md); box-shadow: var(--shadow-lg);
                padding: var(--space-1); animation: scaleIn 140ms var(--ease-out-expo);
                touch-action: auto; max-height: 320px;
            }
            .select-menu.closing { animation: scaleIn 130ms ease reverse forwards; }
        }

        .select-handle { display: flex; justify-content: center; padding: var(--space-1) 0 var(--space-3); }
        .handle-bar { width: 36px; height: 4px; background: var(--color-border); border-radius: 2px; }
        @media (min-width: 768px) { .select-handle { display: none; } }

        .select-sheet-title {
            font-family: var(--font-display); font-weight: var(--weight-semibold); font-size: var(--text-md);
            color: var(--color-text-primary); padding: 0 var(--space-2) var(--space-3);
        }
        @media (min-width: 768px) { .select-sheet-title { display: none; } }

        .select-options { display: flex; flex-direction: column; gap: 2px; }

        .select-option {
            display: flex; align-items: center; gap: var(--space-3); width: 100%;
            padding: 13px var(--space-3); border: none; background: none; cursor: pointer;
            border-radius: var(--radius-md); color: var(--color-text-secondary);
            font-family: var(--font-body); font-size: var(--text-base); text-align: left;
            transition: background var(--transition-fast), color var(--transition-fast);
        }
        @media (min-width: 768px) { .select-option { padding: 10px var(--space-3); font-size: var(--text-sm); } }
        .select-option:disabled { opacity: 0.45; cursor: not-allowed; }
        .select-option.focused:not(:disabled) { background: var(--color-surface-hover); color: var(--color-text-primary); }
        .select-option.active { color: var(--color-accent-dark); font-weight: var(--weight-medium); }
        .opt-icon { font-size: 20px; flex: none; }
        .opt-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
        .opt-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .opt-hint { font-size: var(--text-xs); color: var(--color-text-tertiary); }
        .check { font-size: 18px; color: var(--color-accent); flex: none; }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes slideDown { from { transform: translateY(0); opacity: 1; } to { transform: translateY(100%); opacity: 0; } }
        @keyframes scaleIn { from { opacity: 0; transform: translateY(-6px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
    `,
})
export class SelectComponent implements ControlValueAccessor, OnDestroy {
    readonly options = input<SelectOption[]>([]);
    readonly placeholder = input('Оберіть…');
    readonly ariaLabel = input('');
    /** Optional leading icon on the trigger when nothing is selected. */
    readonly icon = input('');
    /** Title shown atop the mobile bottom sheet. */
    readonly sheetTitle = input('');
    /** 'field' = full-width form control; 'inline' = compact pill. */
    readonly variant = input<'field' | 'inline'>('field');

    private readonly elementRef = inject(ElementRef);
    private readonly injector = inject(Injector);
    private readonly triggerRef = viewChild<ElementRef<HTMLButtonElement>>('trigger');
    private readonly panelRef = viewChild<ElementRef<HTMLElement>>('panel');

    /** True while this instance holds the shared body scroll-lock. */
    private holdsLock = false;
    /** Whether the next close should return focus to the trigger (internal close only). */
    private restoreFocusOnClose = false;

    protected readonly value = signal<string>('');
    protected readonly disabled = signal(false);
    protected readonly isOpen = signal(false);
    protected readonly isClosing = signal(false);
    protected readonly isDragClosing = signal(false);
    protected readonly isSnapping = signal(false);
    protected readonly activeIndex = signal(0);
    protected readonly dragTransform = signal('');

    protected readonly selectedOption = computed(() =>
        this.options().find(o => o.value === this.value()),
    );

    private onChange: (value: string) => void = () => {};
    private onTouched: () => void = () => {};

    // ── ControlValueAccessor ──
    writeValue(value: string | null): void { this.value.set(value ?? ''); }
    registerOnChange(fn: (value: string) => void): void { this.onChange = fn; }
    registerOnTouched(fn: () => void): void { this.onTouched = fn; }
    setDisabledState(isDisabled: boolean): void { this.disabled.set(isDisabled); }

    // ── Open / close ──
    protected toggle(): void {
        if (this.disabled()) return;
        if (this.isOpen()) { this.restoreFocusOnClose = true; this.close(); return; }
        this.isClosing.set(false);
        this.isDragClosing.set(false);
        this.restoreFocusOnClose = true;
        this.activeIndex.set(Math.max(0, this.options().findIndex(o => o.value === this.value())));
        this.isOpen.set(true);
        this.onTouched();
        this.lockScroll();
        // Zoneless: wait for the @if panel to render before focusing it.
        afterNextRender(() => this.panelRef()?.nativeElement.focus?.(), { injector: this.injector });
    }

    close(): void {
        if (!this.isOpen() || this.isClosing() || this.isDragClosing()) return;
        if (window.innerWidth >= 768) {
            this.isClosing.set(true);
            setTimeout(() => this.finishClose(), 150);
        } else {
            this.isClosing.set(true);
        }
    }

    private finishClose(): void {
        if (!this.isOpen()) return; // idempotent — desktop fires both setTimeout and animationend
        this.isOpen.set(false);
        this.isClosing.set(false);
        this.isDragClosing.set(false);
        this.dragTransform.set('');
        this.unlockScroll();
        if (this.restoreFocusOnClose) {
            this.restoreFocusOnClose = false;
            this.triggerRef()?.nativeElement.focus?.();
        }
    }

    protected onAnimationDone(): void { if (this.isClosing()) this.finishClose(); }
    protected onTransitionDone(): void {
        if (this.isDragClosing()) this.finishClose();
        if (this.isSnapping()) this.isSnapping.set(false);
    }

    protected pick(option: SelectOption): void {
        if (option.disabled) return;
        this.value.set(option.value);
        this.onChange(option.value);
        this.restoreFocusOnClose = true;
        this.close();
    }

    @HostListener('document:click', ['$event'])
    protected onDocumentClick(event: MouseEvent): void {
        if (this.isOpen() && !this.elementRef.nativeElement.contains(event.target)) {
            // Outside click: don't steal focus from whatever the user clicked.
            this.restoreFocusOnClose = false;
            this.close();
        }
    }

    ngOnDestroy(): void {
        // Release the shared lock if we're torn down while open (no close animation fires).
        this.unlockScroll();
    }

    // ── Keyboard ──
    protected onTriggerKeydown(event: KeyboardEvent): void {
        if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
            event.preventDefault();
            if (!this.isOpen()) this.toggle();
        }
    }

    protected onPanelKeydown(event: KeyboardEvent): void {
        const count = this.options().length;
        if (!count) return;
        switch (event.key) {
            case 'Escape': event.preventDefault(); this.restoreFocusOnClose = true; this.close(); break;
            case 'ArrowDown': event.preventDefault(); this.moveActive(1); break;
            case 'ArrowUp': event.preventDefault(); this.moveActive(-1); break;
            case 'Home': event.preventDefault(); this.activeIndex.set(0); break;
            case 'End': event.preventDefault(); this.activeIndex.set(count - 1); break;
            case 'Enter':
            case ' ': {
                event.preventDefault();
                const option = this.options()[this.activeIndex()];
                if (option) this.pick(option);
                break;
            }
            default: return;
        }
    }

    private moveActive(delta: number): void {
        const count = this.options().length;
        let next = this.activeIndex();
        for (let step = 0; step < count; step++) {
            next = (next + delta + count) % count;
            if (!this.options()[next]?.disabled) break;
        }
        this.activeIndex.set(next);
    }

    // ── Swipe-to-dismiss (mobile) ──
    private dragStartY = 0;
    private dragCurrentY = 0;
    private isDragging = false;

    protected onDragStart(event: TouchEvent): void {
        this.dragStartY = event.touches[0].clientY;
        this.dragCurrentY = this.dragStartY;
        this.isDragging = true;
    }
    protected onDragMove(event: TouchEvent): void {
        if (!this.isDragging) return;
        this.dragCurrentY = event.touches[0].clientY;
        const dy = Math.max(0, this.dragCurrentY - this.dragStartY);
        if (dy > 0) { event.preventDefault(); this.dragTransform.set(`translateY(${dy}px)`); }
    }
    protected onDragEnd(): void {
        if (!this.isDragging) return;
        this.isDragging = false;
        const dy = this.dragCurrentY - this.dragStartY;
        if (dy > 60) { this.restoreFocusOnClose = false; this.isDragClosing.set(true); this.dragTransform.set('translateY(100vh)'); }
        else if (dy > 5) { this.isSnapping.set(true); this.dragTransform.set('translateY(0)'); }
        else { this.dragTransform.set(''); }
    }

    private lockScroll(): void {
        if (window.innerWidth < 768 && !this.holdsLock) {
            this.holdsLock = true;
            acquireScrollLock();
        }
    }
    private unlockScroll(): void {
        if (this.holdsLock) {
            this.holdsLock = false;
            releaseScrollLock();
        }
    }
}
