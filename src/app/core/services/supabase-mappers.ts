import { UserProfile } from '../models/user-profile.model';
import { Family } from '../models/family.model';
import { FamilyMember } from '../models/family-member.model';
import { RecipeRating } from '../models/recipe-rating.model';
import { AccessRequest } from '../models/access-request.model';
import { ActivityLogEntry } from '../models/activity-log.model';

// Supabase returns snake_case rows; these adapters keep the app on the existing
// camelCase model shapes so components/services stay unchanged.
// Rows are dynamic at this boundary, so `any` is intentional here.
type Row = any;

export function mapProfile(row: Row): UserProfile {
    return {
        id: row.id,
        email: row.email,
        displayName: row.display_name ?? null,
        avatarUrl: row.avatar_url ?? null,
        globalRole: row.global_role,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        lastLoginAt: row.last_login_at ?? null,
    };
}

export function mapFamily(row: Row): Family {
    return {
        id: row.id,
        slug: row.slug,
        name: row.name,
        description: row.description ?? null,
        coverImageUrl: row.cover_image_url ?? null,
        avatarImageUrl: row.avatar_image_url ?? null,
        themeColor: row.theme_color ?? null,
        isPublicVisible: row.is_public_visible,
        status: row.status,
        createdByUserId: row.created_by_user_id ?? null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

export function mapFamilyMember(row: Row): FamilyMember {
    return {
        id: row.id,
        familyId: row.family_id,
        userId: row.user_id,
        role: row.role,
        status: row.status,
        approvedByUserId: row.approved_by_user_id ?? null,
        approvedAt: row.approved_at ?? null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

export function mapRecipeRating(row: Row): RecipeRating {
    return {
        id: row.id,
        dishId: row.dish_id,
        userId: row.user_id,
        familyId: row.family_id,
        rating: row.rating,
        comment: row.comment ?? null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

export function mapAccessRequest(row: Row): AccessRequest {
    return {
        id: row.id,
        email: row.email,
        familyId: row.family_id ?? null,
        requestedRole: row.requested_role ?? null,
        status: row.status,
        requestedByUserId: row.requested_by_user_id ?? null,
        reviewedByUserId: row.reviewed_by_user_id ?? null,
        reviewNote: row.review_note ?? null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

export function mapActivityLogEntry(row: Row): ActivityLogEntry {
    return {
        id: row.id,
        actorUserId: row.actor_user_id ?? null,
        familyId: row.family_id ?? null,
        entityType: row.entity_type,
        entityId: row.entity_id ?? null,
        action: row.action,
        metadata: row.metadata ?? {},
        createdAt: row.created_at,
    };
}
