import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

const TOKEN_KEY = 'dish_token';

/**
 * Thin HTTP client for the NestJS backend (replaces the Supabase client).
 *
 * Auth: a JWT is kept in localStorage and sent as a Bearer header (the backend
 * also sets an httpOnly cookie, but Safari blocks cross-site cookies between the
 * *.vercel.app subdomains, so the Bearer header is the reliable path). Requests
 * are also sent withCredentials so the cookie flows where the browser allows it.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
    private readonly http = inject(HttpClient);
    private readonly base = environment.apiUrl.replace(/\/$/, '');
    private token: string | null = null;

    constructor() {
        this.token = localStorage.getItem(TOKEN_KEY);
    }

    getToken(): string | null {
        return this.token;
    }

    setToken(token: string | null): void {
        this.token = token;
        if (token) {
            localStorage.setItem(TOKEN_KEY, token);
        } else {
            localStorage.removeItem(TOKEN_KEY);
        }
    }

    private options(extraHeaders?: Record<string, string>) {
        let headers = new HttpHeaders(extraHeaders ?? {});
        if (this.token) {
            headers = headers.set('Authorization', `Bearer ${this.token}`);
        }
        return { headers, withCredentials: true as const };
    }

    get<T>(path: string): Promise<T> {
        return firstValueFrom(this.http.get<T>(this.base + path, this.options()));
    }

    post<T>(path: string, body?: unknown): Promise<T> {
        return firstValueFrom(this.http.post<T>(this.base + path, body ?? {}, this.options()));
    }

    put<T>(path: string, body?: unknown): Promise<T> {
        return firstValueFrom(this.http.put<T>(this.base + path, body ?? {}, this.options()));
    }

    patch<T>(path: string, body?: unknown): Promise<T> {
        return firstValueFrom(this.http.patch<T>(this.base + path, body ?? {}, this.options()));
    }

    delete<T>(path: string): Promise<T> {
        return firstValueFrom(this.http.delete<T>(this.base + path, this.options()));
    }

    /** Multipart upload (FormData). The browser sets the multipart boundary. */
    postForm<T>(path: string, form: FormData): Promise<T> {
        return firstValueFrom(this.http.post<T>(this.base + path, form, this.options()));
    }

    /**
     * Supabase-compatible `{ data, error }` wrapper for mutation callers that
     * still destructure `error` (ratings, admin actions, access requests). Never
     * throws — turns an HTTP failure into a friendly `error.message`.
     */
    async call<T>(fn: () => Promise<T>): Promise<{ data: T | null; error: { message: string } | null }> {
        try {
            return { data: await fn(), error: null };
        } catch (e: unknown) {
            return { data: null, error: { message: this.errorMessage(e) } };
        }
    }

    private errorMessage(e: unknown): string {
        const err = e as { error?: { message?: string }; message?: string };
        return err?.error?.message || err?.message || 'Помилка запиту';
    }
}
