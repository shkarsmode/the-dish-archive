import { Injectable, computed, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { Family } from '../models/family.model';
import { mapFamily } from './supabase-mappers';

/** Loads the families the current user can see (RLS-scoped) for switcher + editor. */
@Injectable({ providedIn: 'root' })
export class FamilyService {
    private readonly supabase = inject(SupabaseService);
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
        const { data } = await this.supabase.client
            .from('families')
            .select('*')
            .eq('status', 'active')
            .order('name', { ascending: true });
        this.familiesSignal.set((data ?? []).map(mapFamily));
    }

    async updateFamily(id: string, patch: {
        name?: string;
        description?: string | null;
        themeColor?: string | null;
        coverImageUrl?: string | null;
        avatarImageUrl?: string | null;
        isPublicVisible?: boolean;
    }) {
        const row: Record<string, any> = {};
        if (patch.name !== undefined) row['name'] = patch.name;
        if (patch.description !== undefined) row['description'] = patch.description;
        if (patch.themeColor !== undefined) row['theme_color'] = patch.themeColor;
        if (patch.coverImageUrl !== undefined) row['cover_image_url'] = patch.coverImageUrl;
        if (patch.avatarImageUrl !== undefined) row['avatar_image_url'] = patch.avatarImageUrl;
        if (patch.isPublicVisible !== undefined) row['is_public_visible'] = patch.isPublicVisible;
        const result = await this.supabase.client.from('families').update(row).eq('id', id);
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
