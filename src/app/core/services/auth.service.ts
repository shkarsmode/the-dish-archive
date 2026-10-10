import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { Family } from '../models/family.model';
import { EDITOR_ROLES, FamilyMember, FamilyRole } from '../models/family-member.model';
import { UserProfile } from '../models/user-profile.model';
import { ApiService } from './api.service';

/** Minimal authenticated-user shape (replaces the Supabase `User`). */
export interface AuthUser {
    id: string;
    email: string;
}

export interface MembershipWithFamily extends FamilyMember {
    family: Family | null;
}

interface SessionResponse {
    user: AuthUser | null;
    profile: UserProfile | null;
    memberships: MembershipWithFamily[];
}

const EMPTY_SESSION: SessionResponse = { user: null, profile: null, memberships: [] };
/** Last good session, so a returning user sees the app at once while it revalidates. */
const SESSION_CACHE_KEY = 'dish_session_v1';

/** A JWT whose `exp` has passed can never succeed; treat it as signed out without a round trip. */
function isExpiredJwt(token: string): boolean {
    try {
        const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
        return typeof payload?.exp === 'number' && payload.exp * 1000 < Date.now();
    } catch {
        return false;
    }
}

function readCachedSession(): SessionResponse | null {
    try {
        const parsed = JSON.parse(localStorage.getItem(SESSION_CACHE_KEY) || 'null');
        return parsed?.user ? (parsed as SessionResponse) : null;
    } catch {
        return null;
    }
}

function writeCachedSession(session: SessionResponse | null): void {
    try {
        if (session?.user) localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(session));
        else localStorage.removeItem(SESSION_CACHE_KEY);
    } catch {
        /* storage full or blocked: the cache is only a speed-up */
    }
}

/**
 * Single source of truth for the authenticated user, profile, memberships and
 * derived permissions — now backed by the NestJS API instead of Supabase.
 * The public surface (signals + methods) is unchanged so guards/components and
 * the rest of the app are untouched.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
    private readonly api = inject(ApiService);
    private readonly router = inject(Router);
    private readonly doc = inject(DOCUMENT);

    private readonly userSignal = signal<AuthUser | null>(null);
    private readonly profileSignal = signal<UserProfile | null>(null);
    private readonly membershipsSignal = signal<MembershipWithFamily[]>([]);
    private readonly readySignal = signal<boolean>(false);
    private readonly signingInSignal = signal<boolean>(false);
    private readonly editModeSignal = signal<boolean>(false);

    private readyResolvers: Array<() => void> = [];

    readonly user = this.userSignal.asReadonly();
    readonly profile = this.profileSignal.asReadonly();
    readonly memberships = this.membershipsSignal.asReadonly();
    readonly isReady = this.readySignal.asReadonly();
    readonly isSigningIn = this.signingInSignal.asReadonly();

    readonly isAuthenticated = computed(() => this.userSignal() !== null);
    readonly isSuperAdmin = computed(() => this.profileSignal()?.globalRole === 'super_admin');
    readonly approvedMemberships = computed(() =>
        this.membershipsSignal().filter((membership) => membership.status === 'approved'),
    );
    readonly isApproved = computed(() => this.isSuperAdmin() || this.approvedMemberships().length > 0);
    readonly displayName = computed(
        () => this.profileSignal()?.displayName ?? this.profileSignal()?.email ?? null,
    );
    readonly avatarUrl = computed(() => this.profileSignal()?.avatarUrl ?? null);

    readonly canEditAnything = computed(
        () => this.isSuperAdmin() || this.approvedMemberships().some((m) => EDITOR_ROLES.includes(m.role)),
    );

    readonly editMode = this.editModeSignal.asReadonly();

    constructor() {
        void this.initialize();
    }

    private async initialize(): Promise<void> {
        // The OAuth callback bounces back to the SPA with `#token=<jwt>` (Safari
        // cross-site-cookie fallback). Capture + persist it, then strip the hash.
        const hash = this.doc.location.hash || '';
        const match = hash.match(/[#&]token=([^&]+)/);
        if (match) {
            this.api.setToken(decodeURIComponent(match[1]));
            writeCachedSession(null);
            const url = this.doc.location.pathname + this.doc.location.search;
            this.doc.defaultView?.history.replaceState(null, '', url);
        }

        const token = this.api.getToken();
        if (token && isExpiredJwt(token)) {
            this.api.setToken(null);
            writeCachedSession(null);
        }
        if (!this.api.getToken()) {
            // No token: render as signed out right away (the login page in ~1 s instead
            // of waiting on a cold API), and still ask in the background in case a
            // cookie session exists.
            this.applySession(EMPTY_SESSION);
            this.markReady();
            await this.loadSession();
            return;
        }

        const cached = readCachedSession();
        if (cached) {
            // Returning user: open the app from the cached session, revalidate behind it.
            this.applySession(cached, { touch: false });
            this.markReady();
        }
        await this.loadSession(!!cached);
    }

    private async loadSession(hadCachedUser = false): Promise<void> {
        try {
            const data = await this.api.get<SessionResponse>('/auth/session');
            this.applySession(data);
            writeCachedSession(data);
            if (hadCachedUser && !data.user) {
                // The cached session no longer holds (token revoked or expired).
                void this.router.navigate(['/login']);
            }
        } catch {
            // Offline or a cold API failing: keep a cached session rather than logging out.
            if (!hadCachedUser) this.applySession(EMPTY_SESSION);
        }
        this.markReady();
    }

    private touched = false;

    private applySession(data: SessionResponse, options: { touch?: boolean } = {}): void {
        this.userSignal.set(data.user ?? null);
        this.profileSignal.set(data.profile ?? null);
        this.membershipsSignal.set(data.memberships ?? []);
        if (!data.user) {
            this.editModeSignal.set(false);
        } else if (options.touch !== false && !this.touched) {
            this.touched = true;
            void this.api.post('/auth/touch-last-login').catch(() => undefined);
        }
    }

    private markReady(): void {
        if (this.readySignal()) return;
        this.readySignal.set(true);
        const resolvers = this.readyResolvers;
        this.readyResolvers = [];
        resolvers.forEach((resolve) => resolve());
    }

    /** Resolves once the initial session has been restored (for route guards). */
    whenReady(): Promise<void> {
        if (this.readySignal()) {
            return Promise.resolve();
        }
        return new Promise<void>((resolve) => this.readyResolvers.push(resolve));
    }

    async signInWithGoogle(_redirectPath = '/'): Promise<void> {
        // Full-page redirect into the backend OAuth flow; it returns to the SPA
        // with the session token in the URL fragment (see initialize()).
        this.signingInSignal.set(true);
        this.doc.location.href = `${environment.apiUrl.replace(/\/$/, '')}/auth/google`;
    }

    async signOut(): Promise<void> {
        this.editModeSignal.set(false);
        try {
            await this.api.post('/auth/logout');
        } catch {
            /* ignore */
        }
        this.api.setToken(null);
        writeCachedSession(null);
        this.userSignal.set(null);
        this.profileSignal.set(null);
        this.membershipsSignal.set([]);
        await this.router.navigate(['/login']);
    }

    toggleEditMode(): void {
        this.editModeSignal.update((value) => !value);
    }

    setEditMode(value: boolean): void {
        this.editModeSignal.set(value);
    }

    async refresh(): Promise<void> {
        await this.loadSession();
    }

    async requestAccess(familyId: string | null = null, role: FamilyRole = 'viewer') {
        const result = await this.api.call(() =>
            this.api.post('/access-requests', { familyId: familyId ?? undefined, role }),
        );
        await this.refresh();
        return result;
    }

    familyRole(familyId: string): FamilyRole | null {
        return this.approvedMemberships().find((membership) => membership.familyId === familyId)?.role ?? null;
    }

    familyBySlug(slug: string): Family | null {
        return this.approvedMemberships().find((membership) => membership.family?.slug === slug)?.family ?? null;
    }

    canEditFamily(familyId: string): boolean {
        if (this.isSuperAdmin()) {
            return true;
        }
        const role = this.familyRole(familyId);
        return role === 'owner' || role === 'admin' || role === 'editor';
    }

    canAdminFamily(familyId: string): boolean {
        if (this.isSuperAdmin()) {
            return true;
        }
        const role = this.familyRole(familyId);
        return role === 'owner' || role === 'admin';
    }
}
