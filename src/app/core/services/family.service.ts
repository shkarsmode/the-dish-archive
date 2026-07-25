import { Injectable, computed, inject, signal } from '@angular/core';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { Family } from '../models/family.model';

/** Loads the families the current user can see (RLS-scoped) for switcher + editor. */
@Injectable({ providedIn: 'root' })
export class FamilyService {
    private readonly api = inject(ApiService);
    private readonly auth = inject(AuthService);

    private readonly familiesSignal = signal<Family[]>([]);
    readonly families = this.familiesSignal.asReadonly();

    /** Families the user may create/edit recipes in (super admin: all visible). */
    readonly editableFamilies = computed(() =>
        this.familiesSignal().filter(family => this.auth.canEditFamily(family.id)),
    );

    constructor() {
        void this.load();
    }

    async load(): Promise<void> {
        const data = await this.api.get<Family[]>('/families?status=active');
        this.familiesSignal.set(data ?? []);
    }

    async updateFamily(id: string, patch: {
        name?: string;
        description?: string | null;
        themeColor?: string | null;
        coverImageUrl?: string | null;
        avatarImageUrl?: string | null;
        isPublicVisible?: boolean;
    }) {
        const result = await this.api.call(() => this.api.patch<Family>('/families/' + id, patch));
        await this.load();
        return result;
    }

    bySlug(slug: string): Family | undefined {
        return this.familiesSignal().find(family => family.slug === slug);
    }

    byId(id: string): Family | undefined {
        return this.familiesSignal().find(family => family.id === id);
    }
}
