import { FamilyRole } from './family-member.model';

export type AccessRequestStatus = 'pending' | 'approved' | 'rejected';

export interface AccessRequest {
    id: string;
    email: string;
    familyId: string | null;
    requestedRole: FamilyRole | null;
    status: AccessRequestStatus;
    requestedByUserId: string | null;
    reviewedByUserId: string | null;
    reviewNote: string | null;
    createdAt: string;
    updatedAt: string;
}

/** Access request joined with family + requester profile — used in the super-admin queue. */
export interface AccessRequestWithContext extends AccessRequest {
    familyName: string | null;
    familySlug: string | null;
    displayName: string | null;
    avatarUrl: string | null;
}

export const ACCESS_REQUEST_STATUS_LABELS: Record<AccessRequestStatus, string> = {
    pending: 'Очікує',
    approved: 'Схвалено',
    rejected: 'Відхилено',
};
