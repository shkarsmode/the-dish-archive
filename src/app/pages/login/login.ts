import { Component, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
    selector: 'app-login',
    imports: [],
    template: `
        <main class="login">
            <section class="card">
                <div class="brand">
                    <span class="brand-mark">🍲</span>
                    <h1 class="brand-title">The Dish Archive</h1>
                    <p class="brand-subtitle">Сімейний архів улюблених рецептів</p>
                </div>

                <p class="lead">
                    Увійдіть, щоб переглядати рецепти вашої родини, готувати разом
                    і додавати власні страви.
                </p>

                <button class="google-btn" type="button" (click)="signIn()" [disabled]="isSigningIn()">
                    <svg class="g-icon" viewBox="0 0 18 18" aria-hidden="true">
                        <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"/>
                        <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"/>
                        <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z"/>
                        <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.47.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"/>
                    </svg>
                    <span>{{ isSigningIn() ? 'Заходимо…' : 'Увійти через Google' }}</span>
                </button>

                @if (error()) {
                    <p class="error" role="alert">{{ error() }}</p>
                }

                <p class="hint">
                    Доступ надається за запрошенням. Після входу адміністратор
                    підтвердить ваш доступ.
                </p>
            </section>
        </main>
    `,
    styles: [`
        :host { display: block; }
        .login {
            min-height: 100dvh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: var(--space-6);
            background:
                radial-gradient(120% 120% at 50% 0%, var(--color-accent-light) 0%, var(--color-bg) 55%);
        }
        .card {
            width: 100%;
            max-width: 420px;
            background: var(--color-surface);
            border: 1px solid var(--color-border);
            border-radius: var(--radius-xl);
            box-shadow: var(--shadow-lg);
            padding: var(--space-10) var(--space-8);
            text-align: center;
            opacity: 1;
            animation: cardIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @keyframes cardIn {
            from { transform: translateY(14px) scale(0.98); }
            to { transform: none; }
        }
        .brand-mark { font-size: 2.75rem; line-height: 1; }
        .brand-title {
            font-family: var(--font-display);
            font-size: var(--text-3xl);
            font-weight: var(--weight-bold);
            letter-spacing: -0.02em;
            margin: var(--space-3) 0 var(--space-1);
            color: var(--color-text-primary);
        }
        .brand-subtitle {
            color: var(--color-text-secondary);
            font-size: var(--text-sm);
            margin: 0;
        }
        .lead {
            color: var(--color-text-secondary);
            font-size: var(--text-md);
            line-height: var(--leading-relaxed);
            margin: var(--space-8) 0 var(--space-6);
        }
        .google-btn {
            width: 100%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: var(--space-3);
            padding: var(--space-4) var(--space-5);
            border: 1px solid var(--color-border);
            border-radius: var(--radius-full);
            background: var(--color-surface);
            color: var(--color-text-primary);
            font-family: var(--font-body);
            font-size: var(--text-md);
            font-weight: var(--weight-semibold);
            cursor: pointer;
            transition: background var(--transition-base), border-color var(--transition-base), transform var(--transition-spring);
            min-height: 52px;
        }
        .google-btn:hover:not(:disabled) {
            background: var(--color-surface-hover);
            border-color: var(--color-accent);
            transform: translateY(-1px);
        }
        .google-btn:disabled { opacity: 0.7; cursor: progress; }
        .g-icon { width: 20px; height: 20px; flex: none; }
        .error {
            color: var(--color-error);
            font-size: var(--text-sm);
            margin: var(--space-4) 0 0;
        }
        .hint {
            color: var(--color-text-tertiary);
            font-size: var(--text-xs);
            line-height: var(--leading-normal);
            margin: var(--space-6) 0 0;
        }
    `],
})
export class LoginPage {
    private readonly auth = inject(AuthService);
    private readonly router = inject(Router);

    readonly isSigningIn = this.auth.isSigningIn;
    readonly error = signal<string | null>(null);

    constructor() {
        effect(() => {
            if (this.auth.isReady() && this.auth.isAuthenticated()) {
                void this.router.navigateByUrl(this.auth.isApproved() ? '/' : '/access-pending');
            }
        });
    }

    async signIn(): Promise<void> {
        this.error.set(null);
        try {
            await this.auth.signInWithGoogle('/');
        } catch {
            this.error.set('Не вдалося увійти. Спробуйте ще раз.');
        }
    }
}
