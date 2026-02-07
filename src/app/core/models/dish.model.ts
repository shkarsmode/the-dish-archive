export interface Dish {
    id: string;
    title: string;
    slug: string;
    description: string;
    images: ImageItem[];
    rating: number;
    price: DishPrice;
    cookingTime: CookingTime;
    calories: number;
    servings: number;
    difficulty: DishDifficulty;
    tags: string[];
    categories: DishCategory[];
    tasteProfile: TasteProfile;
    ingredients: Ingredient[];
    steps: CookingStep[];
    notes: string;
    sourceUrl: string;
    createdAt: string;
    updatedAt: string;
}

export interface ImageItem {
    url: string;
    alt: string;
    isPrimary: boolean;
}

export interface DishPrice {
    amount: number;
    currency: string;
}

export interface CookingTime {
    preparation: number;
    cooking: number;
    total: number;
}

export interface TasteProfile {
    sweet: number;
    salty: number;
    sour: number;
    bitter: number;
    spicy: number;
    umami: number;
}

export interface Ingredient {
    name: string;
    amount: string;
    unit: string;
    optional: boolean;
}

export interface CookingStep {
    order: number;
    description: string;
    duration?: number;
    imageUrl?: string;
}

export type DishDifficulty = 'easy' | 'medium' | 'hard';

export type DishCategory =
    | 'quick'
    | 'healthy'
    | 'dessert'
    | 'everyday'
    | 'festive'
    | 'vegetarian'
    | 'breakfast'
    | 'lunch'
    | 'dinner'
    | 'snack'
    | 'soup'
    | 'salad'
    | 'baking';

export type SortOption =
    | 'date-desc'
    | 'date-asc'
    | 'rating-desc'
    | 'rating-asc'
    | 'price-asc'
    | 'price-desc'
    | 'time-asc'
    | 'time-desc'
    | 'calories-asc'
    | 'calories-desc';

export interface FilterState {
    searchQuery: string;
    categories: DishCategory[];
    tags: string[];
    priceRange: [number, number] | null;
    calorieRange: [number, number] | null;
    timeRange: [number, number] | null;
    tasteFilters: (keyof TasteProfile)[];
    favoritesOnly: boolean;
}

export interface ToastMessage {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info';
    duration: number;
}

export interface DishData {
    version: string;
    lastUpdated: string;
    dishes: Dish[];
}

export const CATEGORY_LABELS: Record<DishCategory, string> = {
    quick: 'Швидке',
    healthy: 'ПП',
    dessert: 'Десерт',
    everyday: 'На кожен день',
    festive: 'Святкове',
    vegetarian: 'Вегетаріанське',
    breakfast: 'Сніданок',
    lunch: 'Обід',
    dinner: 'Вечеря',
    snack: 'Перекус',
    soup: 'Суп',
    salad: 'Салат',
    baking: 'Випічка',
};

export const DIFFICULTY_LABELS: Record<DishDifficulty, string> = {
    easy: 'Легко',
    medium: 'Середнє',
    hard: 'Складно',
};

export const TASTE_LABELS: Record<keyof TasteProfile, string> = {
    sweet: 'Солодке',
    salty: 'Солоне',
    sour: 'Кисле',
    bitter: 'Гірке',
    spicy: 'Гостре',
    umami: 'Умамі',
};

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
    { value: 'date-desc', label: 'Спочатку нові' },
    { value: 'date-asc', label: 'Спочатку старі' },
    { value: 'rating-desc', label: 'За рейтингом ↓' },
    { value: 'rating-asc', label: 'За рейтингом ↑' },
    { value: 'price-asc', label: 'Дешевше' },
    { value: 'price-desc', label: 'Дорожче' },
    { value: 'time-asc', label: 'Швидше' },
    { value: 'time-desc', label: 'Довше' },
    { value: 'calories-asc', label: 'Менше калорій' },
    { value: 'calories-desc', label: 'Більше калорій' },
];

export const DEFAULT_FILTER_STATE: FilterState = {
    searchQuery: '',
    categories: [],
    tags: [],
    priceRange: null,
    calorieRange: null,
    timeRange: null,
    tasteFilters: [],
    favoritesOnly: false,
};

export const ALL_CATEGORIES: DishCategory[] = [
    'quick', 'healthy', 'dessert', 'everyday', 'festive',
    'vegetarian', 'breakfast', 'lunch', 'dinner', 'snack',
    'soup', 'salad', 'baking',
];

export const ALL_TASTE_KEYS: (keyof TasteProfile)[] = [
    'sweet', 'salty', 'sour', 'bitter', 'spicy', 'umami',
];
