import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from './api.service';
import { Family } from '../models/family.model';
import { UserProfile } from '../models/user-profile.model';
import { AccessRequestWithContext } from '../models/access-request.model';
import { ActivityLogEntryWithContext } from '../models/activity-log.model';
import { FamilyMemberWithProfile, FamilyRole } from '../models/family-member.model';

export interface GlobalStats {
    families: number;
    dishes: number;
    users: number;
    pendingRequests: number;
}

/** Data access + privileged actions for the global super-admin area. */
@Injectable({ providedIn: 'root' })
export class AdminDataService {
    private readonly api = inject(ApiService);

    readonly stats = signal<GlobalStats | null>(null);
    readonly families = signal<Family[]>([]);
    readonly users = signal<UserProfile[]>([]);
    readonly accessRequests = signal<AccessRequestWithContext[]>([]);
    readonly activity = signal<ActivityLogEntryWithContext[]>([]);
    readonly members = signal<FamilyMemberWithProfile[]>([]);

    async loadStats(): Promise<void> {
        const stats = await this.api.get<GlobalStats>('/admin/stats');
        this.stats.set(stats);
    }

    async loadFamilies(): Promise<void> {
        const families = await this.api.get<Family[]>('/admin/families');
        this.families.set(families);
    }

    async loadUsers(): Promise<void> {
        const users = await this.api.get<UserProfile[]>('/admin/users');
        this.users.set(users);
    }

    async loadAccessRequests(): Promise<void> {
        const requests = await this.api.get<AccessRequestWithContext[]>('/admin/access-requests');
        this.accessRequests.set(requests);
    }

    async loadActivity(limit = 60): Promise<void> {
        const activity = await this.api.get<ActivityLogEntryWithContext[]>(
            '/admin/activity?limit=' + limit,
        );
        this.activity.set(activity);
    }

    async createFamily(input: {
        slug: string;
        name: string;
        description?: string | null;
        themeColor?: string | null;
        ownerUserId?: string | null;
    }) {
        const result = await this.api.call(() =>
            this.api.post('/admin/families', {
                slug: input.slug,
                name: input.name,
                description: input.description ?? null,
                themeColor: input.themeColor ?? null,
                ownerUserId: input.ownerUserId ?? null,
            }),
        );
        await Promise.all([this.loadFamilies(), this.loadStats()]);
        return result;
    }

    async approveRequest(requestId: string, familyId: string, role: FamilyRole) {
        const result = await this.api.call(() =>
            this.api.post('/admin/access-requests/' + requestId + '/approve', {
                familyId,
                role,
            }),
        );
        await Promise.all([this.loadAccessRequests(), this.loadStats()]);
        return result;
    }

    async rejectRequest(requestId: string, note?: string) {
        const result = await this.api.call(() =>
            this.api.post('/admin/access-requests/' + requestId + '/reject', {
                note: note ?? null,
            }),
        );
        await Promise.all([this.loadAccessRequests(), this.loadStats()]);
        return result;
    }

    async loadMembers(familyId: string): Promise<void> {
        const members = await this.api.get<FamilyMemberWithProfile[]>(
            '/families/' + familyId + '/members',
        );
        this.members.set(members);
    }

    async addMember(familyId: string, userId: string, role: FamilyRole) {
        const result = await this.api.call(() =>
            this.api.post('/families/' + familyId + '/members', {
                userId,
                role,
            }),
        );
        await this.loadMembers(familyId);
        return result;
    }

    async setMemberRole(familyId: string, memberId: string, role: FamilyRole) {
        const result = await this.api.call(() =>
            this.api.patch('/families/' + familyId + '/members/' + memberId + '/role', {
                role,
            }),
        );
        await this.loadMembers(familyId);
        return result;
    }

    async removeMember(familyId: string, memberId: string) {
        const result = await this.api.call(() =>
            this.api.delete('/families/' + familyId + '/members/' + memberId),
        );
        await this.loadMembers(familyId);
        return result;
    }
}
