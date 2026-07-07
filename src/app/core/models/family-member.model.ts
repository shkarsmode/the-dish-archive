export type FamilyRole = 'owner' | 'admin' | 'editor' | 'viewer';
export type MembershipStatus = 'pending' | 'approved' | 'rejected' | 'removed';

export interface FamilyMember {
    id: string;
    familyId: string;
    userId: string;
    role: FamilyRole;
    status: MembershipStatus;
    approvedByUserId: string | null;
    approvedAt: string | null;
    createdAt: string;
    updatedAt: string;
}

/** Membership joined with the member's profile — used in member-management UI. */
export interface FamilyMemberWithProfile extends FamilyMember {
    email: string;
    displayName: string | null;
    avatarUrl: string | null;
}

export const FAMILY_ROLE_LABELS: Record<FamilyRole, string> = {
    owner: 'Власник',
    admin: 'Адміністратор',
    editor: 'Редактор',
    viewer: 'Учасник',
};

export const MEMBERSHIP_STATUS_LABELS: Record<MembershipStatus, string> = {
    pending: 'Очікує',
    approved: 'Схвалено',
    rejected: 'Відхилено',
    removed: 'Видалено',
};

/** Roles allowed to create/edit recipes. */
export const EDITOR_ROLES: FamilyRole[] = ['owner', 'admin', 'editor'];

/** Roles allowed to manage members and family settings. */
export const ADMIN_ROLES: FamilyRole[] = ['owner', 'admin'];
