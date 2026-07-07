import { Injectable, signal } from '@angular/core';

export interface ConfirmOptions {
    title: string;
    message?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    /** Style the confirm button as destructive (red). */
    danger?: boolean;
    /** Material Symbols icon shown in the dialog header. */
    icon?: string;
}

/** Promise-based confirmation dialog, rendered by ConfirmDialogComponent at the app root. */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
    readonly current = signal<ConfirmOptions | null>(null);
    private resolver: ((result: boolean) => void) | null = null;

    ask(options: ConfirmOptions): Promise<boolean> {
        // Resolve any dangling dialog as cancelled before opening a new one.
        this.resolver?.(false);
        return new Promise<boolean>(resolve => {
            this.resolver = resolve;
            this.current.set(options);
        });
    }

    resolve(result: boolean): void {
        const resolve = this.resolver;
        this.resolver = null;
        this.current.set(null);
        resolve?.(result);
    }
}
