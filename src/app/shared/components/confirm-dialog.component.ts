import { Component, HostListener, inject } from '@angular/core';
import { ConfirmService } from '../../core/services/confirm.service';

/** Renders the active ConfirmService dialog. Mount once at the app root. */
@Component({
    selector: 'app-confirm-dialog',
    template: `
        @if (confirm.current(); as opts) {
            <div class="cd-backdrop" (click)="cancel()"></div>
            <div class="cd-dialog" role="alertdialog" aria-modal="true" [attr.aria-label]="opts.title">
                <div class="cd-handle"><div class="cd-bar"></div></div>
                @if (opts.icon) {
                    <div class="cd-icon" [class.danger]="opts.danger">
                        <span class="material-symbols-outlined">{{ opts.icon }}</span>
                    </div>
                }
                <h2 class="cd-title">{{ opts.title }}</h2>
                @if (opts.message) { <p class="cd-message">{{ opts.message }}</p> }
                <div class="cd-actions">
                    <button type="button" class="cd-btn ghost" (click)="cancel()">{{ opts.cancelLabel || 'Скасувати' }}</button>
                    <button type="button" class="cd-btn" [class.danger]="opts.danger" [class.primary]="!opts.danger" (click)="ok()">
                        {{ opts.confirmLabel || 'Підтвердити' }}
                    </button>
                </div>
            </div>
        }
    `,
    styles: `
        .cd-backdrop {
            position: fixed; inset: 0; background: var(--color-backdrop);
            z-index: var(--z-modal, 400); animation: cdFade 160ms ease;
        }
        .cd-dialog {
            position: fixed; z-index: calc(var(--z-modal, 400) + 1);
            left: 0; right: 0; bottom: 0;
            display: flex; flex-direction: column; align-items: center; text-align: center;
            background: var(--color-surface); color: var(--color-text-primary);
            border-radius: var(--radius-xl) var(--radius-xl) 0 0;
            padding: var(--space-3) var(--space-5) calc(var(--space-6) + env(safe-area-inset-bottom, 0px));
            box-shadow: 0 -6px 40px rgba(0,0,0,0.18);
            animation: cdUp 240ms var(--ease-out-expo, ease);
        }
        @media (min-width: 640px) {
            .cd-dialog {
                left: 50%; right: auto; bottom: auto; top: 50%;
                transform: translate(-50%, -50%); width: min(420px, calc(100vw - 32px));
                border-radius: var(--radius-lg); padding: var(--space-6);
                box-shadow: var(--shadow-xl, 0 24px 60px rgba(0,0,0,0.25));
                animation: cdPop 180ms var(--ease-out-expo, ease);
            }
        }
        .cd-handle { padding: 0 0 var(--space-3); }
        .cd-bar { width: 36px; height: 4px; border-radius: 2px; background: var(--color-border); }
        @media (min-width: 640px) { .cd-handle { display: none; } }
        .cd-icon {
            display: grid; place-items: center; width: 52px; height: 52px; margin-bottom: var(--space-3);
            border-radius: var(--radius-full); background: var(--color-accent-light); color: var(--color-accent-dark);
        }
        .cd-icon.danger { background: var(--color-error-light); color: var(--color-error); }
        .cd-icon .material-symbols-outlined { font-size: 28px; }
        .cd-title { font-family: var(--font-display); font-size: var(--text-lg); font-weight: var(--weight-bold); margin: 0; }
        .cd-message { margin: var(--space-2) 0 0; color: var(--color-text-secondary); font-size: var(--text-sm); line-height: var(--leading-relaxed); }
        .cd-actions { display: flex; gap: var(--space-2); width: 100%; margin-top: var(--space-5); }
        .cd-btn {
            flex: 1; padding: 13px 18px; border: none; border-radius: var(--radius-full); cursor: pointer;
            font-family: var(--font-body); font-size: var(--text-sm); font-weight: var(--weight-semibold);
            transition: filter var(--transition-base), background var(--transition-base);
        }
        .cd-btn.ghost { background: var(--color-surface-active); color: var(--color-text-primary); }
        .cd-btn.primary { background: var(--color-accent); color: var(--color-text-inverse); }
        .cd-btn.danger { background: var(--color-error); color: #fff; }
        .cd-btn:hover { filter: brightness(0.96); }
        @keyframes cdFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes cdUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes cdPop { from { opacity: 0; transform: translate(-50%, -46%) scale(0.96); } to { opacity: 1; transform: translate(-50%, -50%) scale(1); } }
    `,
})
export class ConfirmDialogComponent {
    protected readonly confirm = inject(ConfirmService);

    protected ok(): void { this.confirm.resolve(true); }
    protected cancel(): void { this.confirm.resolve(false); }

    @HostListener('document:keydown.escape')
    protected onEscape(): void {
        if (this.confirm.current()) this.confirm.resolve(false);
    }
}
