export type FamilyStatus = 'active' | 'archived';

export interface Family {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    coverImageUrl: string | null;
    avatarImageUrl: string | null;
    themeColor: string | null;
    isPublicVisible: boolean;
    status: FamilyStatus;
    createdByUserId: string | null;
    createdAt: string;
    updatedAt: string;
}

export const DEFAULT_FAMILY_SLUG = 'bulkina-family';
