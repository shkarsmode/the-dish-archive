import { Component, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
    selector: 'app-access-pending',
    imports: [],
    template: `
        <main class="pending">
            <section class="card reveal">
                <span class="icon">⏳</span>
                <h1 class="title">Очікуємо підтвердження</h1>

                <p class="lead">
                    Вітаємо, {{ auth.displayName() }}! Ваш обліковий запис створено.
                    Доступ до архіву надається за підтвердженням адміністратора.
                </p>

                @if (requestSent()) {
                    <p class="sent" role="status">
                        Запит надіслано ✨ Ми повідомимо, щойно доступ буде відкрито.
                    </p>
                } @else {
                    <button class="primary" type="button" (click)="request()" [disabled]="sending()">
                        {{ sending() ? 'Надсилаємо…' : 'Надіслати запит на доступ' }}
                    </button>
                }

                @if (error()) {
                    <p class="error" role="alert">{{ error() }}</p>
                }

                <button class="ghost" type="button" (click)="signOut()">Вийти з облікового запису</button>
            </section>
        </main>
    `,
    styles: [`
        :host { display: block; }
        .pending {
            min-height: 100dvh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: var(--space-6);
            background: radial-gradient(120% 120% at 50% 0%, var(--color-secondary-light) 0%, var(--color-bg) 55%);
        }
        .card {
            width: 100%;
            max-width: 440px;
            background: var(--color-surface);
            border: 1px solid var(--color-border);
            border-radius: var(--radius-xl);
            box-shadow: var(--shadow-lg);
            padding: var(--space-10) var(--space-8);
            text-align: center;
        }
        .icon { font-size: 2.75rem; line-height: 1; }
        .title {
            font-family: var(--font-display);
            font-size: var(--text-2xl);
            font-weight: var(--weight-bold);
            letter-spacing: -0.02em;
            margin: var(--space-3) 0 var(--space-4);
            color: var(--color-text-primary);
        }
        .lead {
            color: var(--color-text-secondary);
            font-size: var(--text-md);
            line-height: var(--leading-relaxed);
            margin: 0 0 var(--space-6);
        }
        .sent {
            color: var(--color-success);
            font-size: var(--text-sm);
            font-weight: var(--weight-medium);
            margin: 0 0 var(--space-6);
        }
        .primary {
            width: 100%;
            padding: var(--space-4) var(--space-5);
            border: none;
            border-radius: var(--radius-full);
            background: var(--color-accent);
            color: var(--color-text-inverse);
            font-family: var(--font-body);
            font-size: var(--text-md);
            font-weight: var(--weight-semibold);
            cursor: pointer;
            transition: background var(--transition-base), transform var(--transition-spring);
            min-height: 52px;
        }
        .primary:hover:not(:disabled) { background: var(--color-accent-dark); transform: translateY(-1px); }
        .primary:disabled { opacity: 0.7; cursor: progress; }
        .error { color: var(--color-error); font-size: var(--text-sm); margin: var(--space-4) 0 0; }
        .ghost {
            margin-top: var(--space-6);
            border: none;
            background: none;
            color: var(--color-text-tertiary);
            font-size: var(--text-sm);
            cursor: pointer;
            text-decoration: underline;
            text-underline-offset: 3px;
        }
        .ghost:hover { color: var(--color-text-secondary); }
    `],
})
export class AccessPendingPage {
    readonly auth = inject(AuthService);
    private readonly router = inject(Router);

    readonly sending = signal(false);
    readonly requestSent = signal(false);
    readonly error = signal<string | null>(null);

    constructor() {
        effect(() => {
            // If access is granted while the user waits here, move them into the app.
            if (this.auth.isReady() && this.auth.isApproved()) {
                void this.router.navigateByUrl('/');
            }
        });
    }

    async request(): Promise<void> {
        this.sending.set(true);
        this.error.set(null);
        const { error } = await this.auth.requestAccess(null, 'viewer');
        this.sending.set(false);
        if (error) {
            this.error.set('Не вдалося надіслати запит. Спробуйте ще раз.');
            return;
        }
        this.requestSent.set(true);
    }

    async signOut(): Promise<void> {
        await this.auth.signOut();
    }
}
