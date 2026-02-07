import { Injectable, signal } from '@angular/core';
import { ToastMessage } from '../models/dish.model';

let toastIdCounter = 0;

@Injectable({ providedIn: 'root' })
export class ToastService {
    readonly toasts = signal<ToastMessage[]>([]);

    show(message: string, type: ToastMessage['type'] = 'info', duration = 3000): void {
        const id = `toast-${++toastIdCounter}`;
        const toast: ToastMessage = { id, message, type, duration };

        this.toasts.update(current => [...current, toast]);

        if (duration > 0) {
            setTimeout(() => this.dismiss(id), duration);
        }
    }

    success(message: string): void {
        this.show(message, 'success');
    }

    error(message: string): void {
        this.show(message, 'error', 5000);
    }

    info(message: string): void {
        this.show(message, 'info');
    }

    dismiss(toastId: string): void {
        this.toasts.update(current =>
            current.filter(toast => toast.id !== toastId)
        );
    }
}
