import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';

interface AuthResponse {
    token: string;
    nickname: string;
}

const STORAGE_KEY = 'dish-archive-admin';
const API_URL = 'the-dish-archive-back.vercel.app';

@Injectable({ providedIn: 'root' })
export class AdminService {
    private readonly http = inject(HttpClient);

    private readonly tokenSignal = signal<string | null>(this.loadToken());
    private readonly nicknameSignal = signal<string | null>(this.loadNickname());
    private readonly adminModeSignal = signal(false);
    private readonly loginErrorSignal = signal<string | null>(null);
    private readonly loginLoadingSignal = signal(false);

    readonly isAuthenticated = computed(() => !!this.tokenSignal());
    readonly nickname = this.nicknameSignal.asReadonly();
    readonly isAdminMode = computed(() => this.isAuthenticated() && this.adminModeSignal());
    readonly loginError = this.loginErrorSignal.asReadonly();
    readonly loginLoading = this.loginLoadingSignal.asReadonly();

    /** Base URL for the backend API */
    readonly apiUrl = signal(this.loadApiUrl());

    private loadToken(): string | null {
        try {
            return localStorage.getItem(STORAGE_KEY);
        } catch {
            return null;
        }
    }

    private loadNickname(): string | null {
        try {
            return localStorage.getItem(STORAGE_KEY + '-nickname');
        } catch {
            return null;
        }
    }

    private loadApiUrl(): string {
        try {
            return API_URL ?? 'http://localhost:3000';
        } catch {
            return 'http://localhost:3000';
        }
    }

    get authHeaders(): Record<string, string> {
        const token = this.tokenSignal();
        return token ? { Authorization: `Bearer ${token}` } : {};
    }

    login(nickname: string, password: string): void {
        this.loginErrorSignal.set(null);
        this.loginLoadingSignal.set(true);

        this.http
            .post<AuthResponse>(`${this.apiUrl()}/api/auth/login`, { nickname, password })
            .subscribe({
                next: (res) => {
                    this.tokenSignal.set(res.token);
                    this.nicknameSignal.set(res.nickname);
                    this.loginLoadingSignal.set(false);
                    try {
                        localStorage.setItem(STORAGE_KEY, res.token);
                        localStorage.setItem(STORAGE_KEY + '-nickname', res.nickname);
                    } catch {}
                },
                error: (err) => {
                    this.loginErrorSignal.set(
                        err?.error?.message ?? 'Помилка авторизації'
                    );
                    this.loginLoadingSignal.set(false);
                },
            });
    }

    logout(): void {
        this.tokenSignal.set(null);
        this.nicknameSignal.set(null);
        this.adminModeSignal.set(false);
        try {
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(STORAGE_KEY + '-nickname');
        } catch {}
    }

    toggleAdminMode(): void {
        this.adminModeSignal.update(v => !v);
    }

    enableAdminMode(): void {
        this.adminModeSignal.set(true);
    }

    disableAdminMode(): void {
        this.adminModeSignal.set(false);
    }

    /** Upload an image file to the backend (Cloudinary), returns { url, publicId } */
    uploadImage(file: File): Promise<{ url: string; publicId: string }> {
        const formData = new FormData();
        formData.append('image', file);

        return new Promise((resolve, reject) => {
            this.http
                .post<{ url: string; publicId: string }>(
                    `${this.apiUrl()}/api/dishes/upload`,
                    formData,
                    { headers: { Authorization: this.authHeaders['Authorization'] ?? '' } }
                )
                .subscribe({
                    next: (res) => resolve(res),
                    error: (err) => reject(err),
                });
        });
    }
}
