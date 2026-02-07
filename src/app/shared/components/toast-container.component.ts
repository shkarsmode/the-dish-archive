import { Component, inject } from '@angular/core';
import { ToastService } from '../../core/services/toast.service';

@Component({
    selector: 'app-toast-container',
    template: `
        @if (toastService.toasts().length > 0) {
            <div class="toast-container" aria-live="polite" aria-atomic="true">
                @for (toast of toastService.toasts(); track toast.id) {
                    <div class="toast" [class]="'toast--' + toast.type">
                        <span class="material-symbols-outlined toast-icon">
                            {{ toast.type === 'success' ? 'check_circle' : toast.type === 'error' ? 'error' : 'info' }}
                        </span>
                        <span class="toast-message">{{ toast.message }}</span>
                        <button
                            class="toast-dismiss"
                            (click)="toastService.dismiss(toast.id)"
                            aria-label="Закрити сповіщення">
                            <span class="material-symbols-outlined">close</span>
                        </button>
                    </div>
                }
            </div>
        }
    `,
    styles: `
        .toast-container {
            position: fixed;
            top: calc(var(--header-height) + var(--space-3) + var(--safe-top));
            right: var(--space-4);
            z-index: var(--z-toast);
            display: flex;
            flex-direction: column;
            gap: var(--space-2);
            max-width: 380px;
            width: calc(100vw - var(--space-8));
        }

        .toast {
            display: flex;
            align-items: center;
            gap: var(--space-3);
            padding: var(--space-3) var(--space-4);
            background: var(--color-surface);
            border-radius: var(--radius-md);
            box-shadow: var(--shadow-lg);
            border-left: 3px solid;
            animation: toastIn 220ms var(--ease-out-expo);

            &--success {
                border-left-color: var(--color-success);

                .toast-icon { color: var(--color-success); }
            }

            &--error {
                border-left-color: var(--color-error);

                .toast-icon { color: var(--color-error); }
            }

            &--info {
                border-left-color: var(--color-accent);

                .toast-icon { color: var(--color-accent); }
            }
        }

        .toast-icon {
            font-size: 20px;
            flex-shrink: 0;
        }

        .toast-message {
            flex: 1;
            font-size: var(--text-sm);
            color: var(--color-text-primary);
        }

        .toast-dismiss {
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 28px;
            height: 28px;
            border-radius: var(--radius-xs);
            color: var(--color-text-tertiary);
            transition: color var(--transition-fast),
                        background-color var(--transition-fast);

            &:hover {
                color: var(--color-text-primary);
                background: var(--color-surface-hover);
            }

            .material-symbols-outlined { font-size: 16px; }
        }
    `,
})
export class ToastContainerComponent {
    protected readonly toastService = inject(ToastService);
}
