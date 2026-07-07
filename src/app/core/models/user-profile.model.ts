export type GlobalRole = 'super_admin' | 'user';

export interface UserProfile {
    id: string;
    email: string;
    displayName: string | null;
    avatarUrl: string | null;
    globalRole: GlobalRole;
    createdAt: string;
    updatedAt: string;
    lastLoginAt: string | null;
}

export const SUPER_ADMIN_EMAIL = 'zshkarrr@gmail.com';
