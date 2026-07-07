import { UserProfile } from '../models/user-profile.model';
import { Family } from '../models/family.model';
import { FamilyMember } from '../models/family-member.model';
import { RecipeRating } from '../models/recipe-rating.model';
import { AccessRequest } from '../models/access-request.model';
import { ActivityLogEntry } from '../models/activity-log.model';
import { Dish } from '../models/dish.model';

/** Columns used when reading a dish with its children + family from Supabase. */
export const DISH_SELECT =
    '*, dish_images(*), ingredients(*), cooking_steps(*), families(slug,name,theme_color)';

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

const bySortOrder = (a: Row, b: Row) => (a.sort_order ?? 0) - (b.sort_order ?? 0);

export function mapDish(row: Row): Dish {
    const family = row.families ?? null;
    return {
        id: row.id,
        title: row.title,
        slug: row.slug,
        description: row.description ?? '',
        images: (row.dish_images ?? []).slice().sort(bySortOrder).map((image: Row) => ({
            url: image.url,
            alt: image.alt ?? '',
            isPrimary: image.is_primary,
        })),
        rating: Number(row.rating ?? 0),
        price: { amount: row.price_amount ?? 0, currency: row.price_currency ?? 'UAH' },
        cookingTime: {
            preparation: row.prep_time ?? 0,
            cooking: row.cook_time ?? 0,
            total: row.total_time ?? 0,
        },
        calories: row.calories ?? 0,
        servings: row.servings ?? 0,
        difficulty: row.difficulty ?? 'easy',
        tags: row.tags ?? [],
        categories: row.categories ?? [],
        tasteProfile: {
            sweet: row.taste_sweet ?? 0,
            salty: row.taste_salty ?? 0,
            sour: row.taste_sour ?? 0,
            bitter: row.taste_bitter ?? 0,
            spicy: row.taste_spicy ?? 0,
            umami: row.taste_umami ?? 0,
        },
        ingredients: (row.ingredients ?? []).slice().sort(bySortOrder).map((ing: Row) => ({
            name: ing.name,
            amount: ing.amount ?? '',
            unit: ing.unit ?? '',
            optional: ing.optional ?? false,
        })),
        steps: (row.cooking_steps ?? []).slice()
            .sort((a: Row, b: Row) => (a.step_order ?? 0) - (b.step_order ?? 0))
            .map((step: Row) => ({
                order: step.step_order,
                description: step.description ?? '',
                duration: step.duration ?? undefined,
                imageUrl: step.image_url ?? undefined,
            })),
        notes: row.notes ?? '',
        sourceUrl: row.source_url ?? '',
        familyId: row.family_id,
        createdByUserId: row.created_by_user_id ?? null,
        updatedByUserId: row.updated_by_user_id ?? null,
        visibility: row.visibility ?? 'family',
        status: row.status ?? 'draft',
        ratingCount: row.rating_count ?? 0,
        ratingAverage: Number(row.rating_average ?? 0),
        viewCount: row.view_count ?? 0,
        cookedCount: row.cooked_count ?? 0,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        familyName: family?.name,
        familySlug: family?.slug,
        familyThemeColor: family?.theme_color ?? null,
    };
}

/** Maps the scalar fields of a (partial) Dish to dishes-table columns. */
export function dishScalarsToRow(dish: Partial<Dish>): Row {
    const row: Row = {};
    if (dish.title !== undefined) row.title = dish.title;
    if (dish.slug !== undefined) row.slug = dish.slug;
    if (dish.description !== undefined) row.description = dish.description;
    if (dish.rating !== undefined) row.rating = dish.rating;
    if (dish.price !== undefined) {
        row.price_amount = dish.price.amount;
        row.price_currency = dish.price.currency;
    }
    if (dish.cookingTime !== undefined) {
        row.prep_time = dish.cookingTime.preparation;
        row.cook_time = dish.cookingTime.cooking;
        row.total_time = dish.cookingTime.total;
    }
    if (dish.calories !== undefined) row.calories = dish.calories;
    if (dish.servings !== undefined) row.servings = dish.servings;
    if (dish.difficulty !== undefined) row.difficulty = dish.difficulty;
    if (dish.tags !== undefined) row.tags = dish.tags;
    if (dish.categories !== undefined) row.categories = dish.categories;
    if (dish.tasteProfile !== undefined) {
        row.taste_sweet = dish.tasteProfile.sweet;
        row.taste_salty = dish.tasteProfile.salty;
        row.taste_sour = dish.tasteProfile.sour;
        row.taste_bitter = dish.tasteProfile.bitter;
        row.taste_spicy = dish.tasteProfile.spicy;
        row.taste_umami = dish.tasteProfile.umami;
    }
    if (dish.notes !== undefined) row.notes = dish.notes;
    if (dish.sourceUrl !== undefined) row.source_url = dish.sourceUrl;
    if (dish.visibility !== undefined) row.visibility = dish.visibility;
    if (dish.status !== undefined) row.status = dish.status;
    return row;
}
