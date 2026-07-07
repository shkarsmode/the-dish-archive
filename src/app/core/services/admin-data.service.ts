import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Family } from '../models/family.model';
import { UserProfile } from '../models/user-profile.model';
import { AccessRequestWithContext } from '../models/access-request.model';
import { ActivityLogEntryWithContext } from '../models/activity-log.model';
import { FamilyMemberWithProfile, FamilyRole } from '../models/family-member.model';
import {
    mapFamily,
    mapFamilyMember,
    mapProfile,
    mapAccessRequest,
    mapActivityLogEntry,
} from './supabase-mappers';

export interface GlobalStats {
    families: number;
    dishes: number;
    users: number;
    pendingRequests: number;
}

/** Data access + privileged actions for the global super-admin area. */
@Injectable({ providedIn: 'root' })
export class AdminDataService {
    private readonly supabase = inject(SupabaseService);

    readonly stats = signal<GlobalStats | null>(null);
    readonly families = signal<Family[]>([]);
    readonly users = signal<UserProfile[]>([]);
    readonly accessRequests = signal<AccessRequestWithContext[]>([]);
    readonly activity = signal<ActivityLogEntryWithContext[]>([]);
    readonly members = signal<FamilyMemberWithProfile[]>([]);

    private async count(table: string, filter?: (query: any) => any): Promise<number> {
        let query = this.supabase.client.from(table).select('*', { count: 'exact', head: true });
        if (filter) {
            query = filter(query);
        }
        const { count } = await query;
        return count ?? 0;
    }

    async loadStats(): Promise<void> {
        const [families, dishes, users, pendingRequests] = await Promise.all([
            this.count('families'),
            this.count('dishes'),
            this.count('profiles'),
            this.count('access_requests', q => q.eq('status', 'pending')),
        ]);
        this.stats.set({ families, dishes, users, pendingRequests });
    }

    async loadFamilies(): Promise<void> {
        const { data } = await this.supabase.client
            .from('families')
            .select('*')
            .order('created_at', { ascending: false });
        this.families.set((data ?? []).map(mapFamily));
    }

    async loadUsers(): Promise<void> {
        const { data } = await this.supabase.client
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });
        this.users.set((data ?? []).map(mapProfile));
    }

    async loadAccessRequests(): Promise<void> {
        const { data } = await this.supabase.client
            .from('access_requests')
            .select('*, families(name,slug), profiles:requested_by_user_id(display_name,avatar_url)')
            .order('created_at', { ascending: false });
        this.accessRequests.set((data ?? []).map((row: Record<string, any>) => ({
            ...mapAccessRequest(row),
            familyName: row['families']?.name ?? null,
            familySlug: row['families']?.slug ?? null,
            displayName: row['profiles']?.display_name ?? null,
            avatarUrl: row['profiles']?.avatar_url ?? null,
        })));
    }

    async loadActivity(limit = 60): Promise<void> {
        const { data } = await this.supabase.client
            .from('activity_log')
            .select('*, actor:actor_user_id(display_name,email), families(name)')
            .order('created_at', { ascending: false })
            .limit(limit);
        this.activity.set((data ?? []).map((row: Record<string, any>) => ({
            ...mapActivityLogEntry(row),
            actorDisplayName: row['actor']?.display_name ?? null,
            actorEmail: row['actor']?.email ?? null,
            familyName: row['families']?.name ?? null,
        })));
    }

    async createFamily(input: {
        slug: string;
        name: string;
        description?: string | null;
        themeColor?: string | null;
        ownerUserId?: string | null;
    }) {
        const result = await this.supabase.client.rpc('create_family', {
            p_slug: input.slug,
            p_name: input.name,
            p_description: input.description ?? null,
            p_theme_color: input.themeColor ?? null,
            p_owner_user_id: input.ownerUserId ?? null,
        });
        await Promise.all([this.loadFamilies(), this.loadStats()]);
        return result;
    }

    async approveRequest(requestId: string, familyId: string, role: FamilyRole) {
        const result = await this.supabase.client.rpc('approve_access_request', {
            p_request_id: requestId,
            p_family: familyId,
            p_role: role,
        });
        await Promise.all([this.loadAccessRequests(), this.loadStats()]);
        return result;
    }

    async rejectRequest(requestId: string, note?: string) {
        const result = await this.supabase.client.rpc('reject_access_request', {
            p_request_id: requestId,
            p_note: note ?? null,
        });
        await Promise.all([this.loadAccessRequests(), this.loadStats()]);
        return result;
    }

    async loadMembers(familyId: string): Promise<void> {
        const { data } = await this.supabase.client
            .from('family_members')
            .select('*, profiles:user_id(display_name,email,avatar_url)')
            .eq('family_id', familyId)
            .neq('status', 'removed')
            .order('created_at', { ascending: true });
        this.members.set((data ?? []).map((row: Record<string, any>) => ({
            ...mapFamilyMember(row),
            email: row['profiles']?.email ?? '',
            displayName: row['profiles']?.display_name ?? null,
            avatarUrl: row['profiles']?.avatar_url ?? null,
        })));
    }

    async addMember(familyId: string, userId: string, role: FamilyRole) {
        const result = await this.supabase.client.rpc('add_family_member', {
            p_family: familyId,
            p_user_id: userId,
            p_role: role,
        });
        await this.loadMembers(familyId);
        return result;
    }

    async setMemberRole(familyId: string, memberId: string, role: FamilyRole) {
        const result = await this.supabase.client.rpc('set_member_role', {
            p_member_id: memberId,
            p_role: role,
        });
        await this.loadMembers(familyId);
        return result;
    }

    async removeMember(familyId: string, memberId: string) {
        const result = await this.supabase.client.rpc('remove_member', { p_member_id: memberId });
        await this.loadMembers(familyId);
        return result;
    }
}
