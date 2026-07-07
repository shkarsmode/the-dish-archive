export interface RecipeRating {
    id: string;
    dishId: string;
    userId: string;
    familyId: string;
    rating: number;
    comment: string | null;
    createdAt: string;
    updatedAt: string;
}

/** Rating joined with the rater's profile — used in rating lists. */
export interface RecipeRatingWithProfile extends RecipeRating {
    displayName: string | null;
    avatarUrl: string | null;
}
