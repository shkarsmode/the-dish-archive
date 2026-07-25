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
            const url = this.doc.location.pathname + this.doc.location.search;
            this.doc.defaultView?.history.replaceState(null, '', url);
        }
        await this.loadSession();
    }

    private async loadSession(): Promise<void> {
        try {
            const data = await this.api.get<SessionResponse>('/auth/session');
            this.applySession(data);
        } catch {
            this.applySession({ user: null, profile: null, memberships: [] });
        }
        this.markReady();
    }

    private applySession(data: SessionResponse): void {
        this.userSignal.set(data.user ?? null);
        this.profileSignal.set(data.profile ?? null);
        this.membershipsSignal.set(data.memberships ?? []);
        if (!data.user) {
            this.editModeSignal.set(false);
        } else {
            void this.api.post('/auth/touch-last-login').catch(() => undefined);
        }
    }

    private markReady(): void {
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
