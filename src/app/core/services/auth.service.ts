import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Session, User } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';
import { UserProfile } from '../models/user-profile.model';
import { Family } from '../models/family.model';
import { FamilyMember, FamilyRole } from '../models/family-member.model';
import { mapProfile, mapFamily, mapFamilyMember } from './supabase-mappers';

export interface MembershipWithFamily extends FamilyMember {
    family: Family | null;
}

/**
 * Single source of truth for the authenticated user, their profile, family
 * memberships and derived permissions. Replaces the old nickname/password
 * AdminService with Supabase Google OAuth + role-aware state.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
    private readonly supabase = inject(SupabaseService);
    private readonly router = inject(Router);

    private readonly userSignal = signal<User | null>(null);
    private readonly profileSignal = signal<UserProfile | null>(null);
    private readonly membershipsSignal = signal<MembershipWithFamily[]>([]);
    private readonly readySignal = signal<boolean>(false);
    private readonly signingInSignal = signal<boolean>(false);

    private readyResolvers: Array<() => void> = [];

    readonly user = this.userSignal.asReadonly();
    readonly profile = this.profileSignal.asReadonly();
    readonly memberships = this.membershipsSignal.asReadonly();
    readonly isReady = this.readySignal.asReadonly();
    readonly isSigningIn = this.signingInSignal.asReadonly();

    readonly isAuthenticated = computed(() => this.userSignal() !== null);
    readonly isSuperAdmin = computed(() => this.profileSignal()?.globalRole === 'super_admin');
    readonly approvedMemberships = computed(() =>
        this.membershipsSignal().filter(membership => membership.status === 'approved'),
    );
    readonly isApproved = computed(() => this.isSuperAdmin() || this.approvedMemberships().length > 0);
    readonly displayName = computed(
        () => this.profileSignal()?.displayName ?? this.profileSignal()?.email ?? null,
    );

    constructor() {
        this.initialize();
    }

    private async initialize(): Promise<void> {
        const { data } = await this.supabase.client.auth.getSession();
        await this.applySession(data.session);
        this.supabase.client.auth.onAuthStateChange((_event, session) => {
            void this.applySession(session);
        });
    }

    private async applySession(session: Session | null): Promise<void> {
        const user = session?.user ?? null;
        this.userSignal.set(user);
        if (user) {
            await this.loadProfileAndMemberships(user.id);
            void this.supabase.client.rpc('touch_last_login');
        } else {
            this.profileSignal.set(null);
            this.membershipsSignal.set([]);
        }
        this.markReady();
    }

    private async loadProfileAndMemberships(userId: string): Promise<void> {
        const [profileResult, membershipResult] = await Promise.all([
            this.supabase.client.from('profiles').select('*').eq('id', userId).maybeSingle(),
            this.supabase.client
                .from('family_members')
                .select('*, families(*)')
                .eq('user_id', userId),
        ]);

        this.profileSignal.set(profileResult.data ? mapProfile(profileResult.data) : null);
        const memberships = (membershipResult.data ?? []).map((row: Record<string, any>) => ({
            ...mapFamilyMember(row),
            family: row['families'] ? mapFamily(row['families']) : null,
        }));
        this.membershipsSignal.set(memberships);
    }

    private markReady(): void {
        this.readySignal.set(true);
        const resolvers = this.readyResolvers;
        this.readyResolvers = [];
        resolvers.forEach(resolve => resolve());
    }

    /** Resolves once the initial session has been restored (for route guards). */
    whenReady(): Promise<void> {
        if (this.readySignal()) {
            return Promise.resolve();
        }
        return new Promise<void>(resolve => this.readyResolvers.push(resolve));
    }

    async signInWithGoogle(redirectPath = '/'): Promise<void> {
        this.signingInSignal.set(true);
        const { error } = await this.supabase.client.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: `${window.location.origin}${redirectPath}` },
        });
        if (error) {
            this.signingInSignal.set(false);
            throw error;
        }
    }

    async signOut(): Promise<void> {
        await this.supabase.client.auth.signOut();
        await this.router.navigate(['/login']);
    }

    async refresh(): Promise<void> {
        const { data } = await this.supabase.client.auth.getSession();
        await this.applySession(data.session);
    }

    async requestAccess(familyId: string | null = null, role: FamilyRole = 'viewer') {
        return this.supabase.client.rpc('request_access', {
            p_family: familyId,
            p_requested_role: role,
        });
    }

    familyRole(familyId: string): FamilyRole | null {
        return this.approvedMemberships().find(membership => membership.familyId === familyId)?.role ?? null;
    }

    familyBySlug(slug: string): Family | null {
        return this.approvedMemberships().find(membership => membership.family?.slug === slug)?.family ?? null;
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
