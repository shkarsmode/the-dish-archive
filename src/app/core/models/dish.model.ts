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
    quick: 'Быстрое',
    healthy: 'ПП',
    dessert: 'Десерт',
    everyday: 'На каждый день',
    festive: 'Праздничное',
    vegetarian: 'Вегетарианское',
    breakfast: 'Завтрак',
    lunch: 'Обед',
    dinner: 'Ужин',
    snack: 'Перекус',
    soup: 'Суп',
    salad: 'Салат',
    baking: 'Выпечка',
};

export const DIFFICULTY_LABELS: Record<DishDifficulty, string> = {
    easy: 'Легко',
    medium: 'Средне',
    hard: 'Сложно',
};

export const TASTE_LABELS: Record<keyof TasteProfile, string> = {
    sweet: 'Сладкое',
    salty: 'Солёное',
    sour: 'Кислое',
    bitter: 'Горькое',
    spicy: 'Острое',
    umami: 'Умами',
};

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
    { value: 'date-desc', label: 'Сначала новые' },
    { value: 'date-asc', label: 'Сначала старые' },
    { value: 'rating-desc', label: 'По рейтингу ↓' },
    { value: 'rating-asc', label: 'По рейтингу ↑' },
    { value: 'price-asc', label: 'Дешевле' },
    { value: 'price-desc', label: 'Дороже' },
    { value: 'time-asc', label: 'Быстрее' },
    { value: 'time-desc', label: 'Дольше' },
    { value: 'calories-asc', label: 'Меньше калорий' },
    { value: 'calories-desc', label: 'Больше калорий' },
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
