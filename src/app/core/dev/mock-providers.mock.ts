import { HttpErrorResponse, HttpInterceptorFn, HttpRequest, HttpResponse } from '@angular/common/http';
import { Observable, delay, from, mergeMap, of, throwError } from 'rxjs';

/**
 * Fake API for `ng serve -c mock`: a signed-in super-admin with one family, the
 * archive's bundled recipes, and canned AI imports with realistic timing. Lets the
 * new-recipe flow (and the promo recording) run without a backend or Google login.
 */

const NOW = '2026-10-10T10:00:00.000Z';

// A signed-in look: the real app only asks for a session when a token is stored.
if (!localStorage.getItem('dish_token')) {
    localStorage.setItem('dish_token', `mock.${btoa(JSON.stringify({ sub: 'user-1' }))}.sig`);
}
const FAMILY = {
    id: 'fam-1',
    slug: 'nasha-kukhnia',
    name: 'Наша кухня',
    description: 'Рецепти, які ми готуємо разом',
    coverImageUrl: null,
    avatarImageUrl: null,
    themeColor: null,
    isPublicVisible: true,
    status: 'active',
    createdByUserId: 'user-1',
    createdAt: NOW,
    updatedAt: NOW,
};

const SESSION = {
    user: { id: 'user-1', email: 'demo@dish.archive' },
    profile: {
        id: 'user-1',
        email: 'demo@dish.archive',
        displayName: 'Оля',
        avatarUrl: null,
        globalRole: 'super_admin',
        createdAt: NOW,
        updatedAt: NOW,
        lastLoginAt: NOW,
    },
    memberships: [
        {
            id: 'm-1',
            familyId: FAMILY.id,
            userId: 'user-1',
            role: 'owner',
            status: 'approved',
            approvedByUserId: null,
            approvedAt: NOW,
            createdAt: NOW,
            updatedAt: NOW,
            family: FAMILY,
        },
    ],
};

let dishesCache: any[] | null = null;
const created: any[] = [];

async function dishes(): Promise<any[]> {
    if (!dishesCache) {
        const raw = await fetch('/data/dishes.json').then((r) => r.json());
        const list: any[] = Array.isArray(raw) ? raw : raw.dishes ?? [];
        dishesCache = list.map((dish, index) => ({
            ...dish,
            familyId: FAMILY.id,
            familyName: FAMILY.name,
            familySlug: FAMILY.slug,
            familyThemeColor: null,
            createdByUserId: 'user-1',
            updatedByUserId: null,
            visibility: 'public',
            status: 'published',
            ratingCount: 3 + (index % 5),
            ratingAverage: dish.rating ?? 4.5,
            likeCount: 2 + (index % 7),
            viewCount: 40 + index * 3,
            cookedCount: index % 6,
            sourceUrl: dish.sourceUrl ?? '',
            notes: dish.notes ?? '',
            createdAt: new Date(Date.parse(NOW) - index * 86400000).toISOString(),
            updatedAt: NOW,
        }));
    }
    return [...created, ...dishesCache];
}

const ISSUE = (field: string, severity: string, message: string, itemIndex?: number) =>
    ({ field, severity, message, ...(itemIndex != null ? { itemIndex } : {}) });

const BASE = {
    warnings: [],
    meta: { model: 'gemini-3.1-flash-lite', dailyLimit: 20, dailyUsed: 3, dailyRemaining: 17 },
    sourceLanguage: 'uk',
    cost: { model: 'gemini-3.1-flash-lite', inputTokens: 2400, outputTokens: 900, usd: 0.0019, durationMs: 6400 },
};

const VARENYKY = {
    ...BASE,
    isRecipe: true,
    notRecipeReason: '',
    confidence: 'medium',
    sourceKind: 'social_post',
    title: 'Вареники з вишнею',
    description: 'Ніжне тісто на кефірі й соковита вишнева начинка. Подавати зі сметаною і вишневим сиропом.',
    servings: 4,
    cookingTime: { preparation: 40, cooking: 10, total: 50 },
    calories: 290,
    difficulty: 'medium',
    categories: ['dessert', 'festive'],
    tags: ['вареники', 'вишня', 'тісто на кефірі', 'літо'],
    ingredients: [
        { name: 'борошно пшеничне', amount: '450', unit: 'г', optional: false },
        { name: 'кефір', amount: '250', unit: 'мл', optional: false },
        { name: 'яйце', amount: '1', unit: 'шт.', optional: false },
        { name: 'сода', amount: '0,5', unit: 'ч. л.', optional: false },
        { name: 'сіль', amount: 'дрібка', unit: '', optional: false },
        { name: 'вишня без кісточок', amount: '500', unit: 'г', optional: false },
        { name: 'цукор', amount: '', unit: '', optional: false },
        { name: 'крохмаль', amount: '1', unit: 'ст. л.', optional: false },
        { name: 'сметана для подачі', amount: '', unit: '', optional: true },
    ],
    steps: [
        { order: 1, description: 'Змішайте кефір, яйце, сіль і соду, дайте постояти 5 хвилин.' },
        { order: 2, description: 'Поступово всипте борошно і замісіть м\'яке тісто. Накрийте і залиште на 20 хвилин.', duration: 20 },
        { order: 3, description: 'Вишню відкиньте на друшляк, змішайте з цукром і крохмалем.' },
        { order: 4, description: 'Розкачайте тісто тонко, виріжте кружечки, викладіть начинку і щільно защипніть краї.' },
        { order: 5, description: 'Варіть у підсоленому окропі 3-4 хвилини після спливання.', duration: 4 },
        { order: 6, description: 'Подавайте зі сметаною, полийте соком, що стік з вишні.' },
    ],
    taste: { sweet: 4, salty: 1, sour: 3, bitter: 0, spicy: 0, umami: 0 },
    notes: 'Сік, що стік з вишні, уваріть з ложкою цукру: вийде соус для подачі.',
    issues: [
        ISSUE('ingredients', 'missing', 'Не вказано кількість цукру для начинки', 6),
        ISSUE('steps', 'unclear', 'Не сказано, скільки тіста розкачувати за раз і якої товщини (орієнтовно 2 мм)', 3),
        ISSUE('time', 'assumed', 'Загальний час оцінено як підготовка + варіння'),
    ],
    images: [{ url: '/images/varenyky-z-vyshneiu.jpg', alt: 'Вареники з вишнею', isPrimary: true }],
    sourceUrl: 'https://www.instagram.com/p/DEMO123/',
    source: {
        platform: 'instagram',
        url: 'https://www.instagram.com/p/DEMO123/',
        title: 'Вареники з вишнею як у бабусі',
        author: '@smachno.vdoma',
        imageUrl: '/images/varenyky-z-vyshneiu.jpg',
        via: ['caption', 'post-image'],
    },
};

const PLOV = {
    ...BASE,
    isRecipe: true,
    notRecipeReason: '',
    confidence: 'high',
    sourceKind: 'video',
    title: 'Узбецький плов у казані',
    description: 'Розсипчастий плов з яловичиною, морквою соломкою і цілою головкою часнику.',
    servings: 6,
    cookingTime: { preparation: 30, cooking: 90, total: 120 },
    calories: 540,
    difficulty: 'medium',
    categories: ['dinner', 'festive'],
    tags: ['плов', 'казан', 'рис', 'яловичина'],
    ingredients: [
        { name: 'рис девзіра', amount: '600', unit: 'г', optional: false },
        { name: 'яловичина', amount: '800', unit: 'г', optional: false },
        { name: 'морква', amount: '700', unit: 'г', optional: false },
        { name: 'цибуля', amount: '2', unit: 'шт.', optional: false },
        { name: 'олія', amount: '150', unit: 'мл', optional: false },
        { name: 'часник', amount: '2', unit: 'головки', optional: false },
        { name: 'зіра', amount: '1', unit: 'ст. л.', optional: false },
        { name: 'барбарис', amount: '1', unit: 'ч. л.', optional: true },
        { name: 'сіль', amount: 'за смаком', unit: '', optional: false },
    ],
    steps: [
        { order: 1, description: 'Рис промийте до прозорої води і замочіть у теплій підсоленій воді на 40 хвилин.', duration: 40 },
        { order: 2, description: 'Розігрійте олію в казані, обсмажте м\'ясо шматочками до скоринки.', duration: 10 },
        { order: 3, description: 'Додайте цибулю півкільцями, потім моркву соломкою, смажте 10 хвилин не перемішуючи.', duration: 10 },
        { order: 4, description: 'Залийте окропом, додайте зіру, барбарис і сіль, тушкуйте зірвак 40 хвилин.', duration: 40 },
        { order: 5, description: 'Викладіть рис рівним шаром, залийте водою на 1,5 см вище, встроміть часник.' },
        { order: 6, description: 'Коли вода вбереться, зберіть рис гіркою, накрийте і томіть 25 хвилин на мінімумі.', duration: 25 },
    ],
    taste: { sweet: 1, salty: 3, sour: 0, bitter: 0, spicy: 2, umami: 4 },
    notes: 'Автор у відео радить казан на 6-8 літрів.',
    issues: [],
    images: [{ url: '/images/uzbekskyi-plov.jpg', alt: 'Узбецький плов', isPrimary: true }],
    sourceUrl: 'https://www.youtube.com/watch?v=DEMO',
    source: {
        platform: 'youtube',
        url: 'https://www.youtube.com/watch?v=DEMO',
        title: 'Справжній плов у казані',
        author: 'Кухня на дровах',
        imageUrl: '/images/uzbekskyi-plov.jpg',
        via: ['description', 'video'],
    },
};

const PIE = {
    ...BASE,
    isRecipe: true,
    notRecipeReason: '',
    confidence: 'medium',
    sourceKind: 'recipe_photo',
    title: 'Яблучний пиріг бабусі Галі',
    description: 'Пухкий пиріг з кислими яблуками і корицею за рецептом з маминого зошита.',
    servings: 8,
    cookingTime: { preparation: 20, cooking: 45, total: 65 },
    calories: 310,
    difficulty: 'easy',
    categories: ['dessert', 'baking'],
    tags: ['пиріг', 'яблука', 'кориця', 'сімейний рецепт'],
    ingredients: [
        { name: 'яйця', amount: '4', unit: 'шт.', optional: false },
        { name: 'цукор', amount: '1', unit: 'склянка', optional: false },
        { name: 'борошно', amount: '1', unit: 'склянка', optional: false },
        { name: 'яблука кислі', amount: '4', unit: 'шт.', optional: false },
        { name: 'кориця', amount: '1', unit: 'ч. л.', optional: true },
        { name: 'вершкове масло для форми', amount: '10', unit: 'г', optional: false },
    ],
    steps: [
        { order: 1, description: 'Збийте яйця з цукром до світлої пишної маси, 5-7 хвилин.', duration: 7 },
        { order: 2, description: 'Акуратно вмішайте просіяне борошно лопаткою.' },
        { order: 3, description: 'Яблука наріжте часточками, викладіть у змащену форму, посипте корицею.' },
        { order: 4, description: 'Залийте тістом і випікайте до сухої шпажки.', duration: 45 },
    ],
    taste: { sweet: 4, salty: 0, sour: 2, bitter: 0, spicy: 1, umami: 0 },
    notes: 'Записано з фото рукописної картки.',
    issues: [
        ISSUE('temperature', 'missing', 'Не вказано температуру духовки (зазвичай 180 °C)'),
        ISSUE('ingredients', 'unclear', '«Склянка» - уточніть об\'єм: 200 чи 250 мл', 1),
        ISSUE('equipment', 'missing', 'Не вказано розмір форми'),
    ],
    images: [{ url: '/images/yabluchnyi-pyrih.jpg', alt: 'Яблучний пиріг', isPrimary: true }],
    sourceUrl: '',
    source: { platform: 'photo', url: '', title: '', author: '', imageUrl: '/images/yabluchnyi-pyrih.jpg', via: ['photo'] },
};

const SYRNYKY = {
    ...BASE,
    isRecipe: true,
    notRecipeReason: '',
    confidence: 'high',
    sourceKind: 'text',
    title: 'Сирники зі сметаною',
    description: 'Ніжні сирники з рум\'яною скоринкою, як на сніданок у вихідний.',
    servings: 3,
    cookingTime: { preparation: 10, cooking: 12, total: 22 },
    calories: 260,
    difficulty: 'easy',
    categories: ['breakfast', 'quick'],
    tags: ['сирники', 'сніданок', 'кисломолочний сир'],
    ingredients: [
        { name: 'кисломолочний сир 5%', amount: '500', unit: 'г', optional: false },
        { name: 'яйця', amount: '2', unit: 'шт.', optional: false },
        { name: 'борошно', amount: '3', unit: 'ст. л.', optional: false },
        { name: 'цукор', amount: 'за смаком', unit: '', optional: false },
        { name: 'олія для смаження', amount: '2', unit: 'ст. л.', optional: false },
    ],
    steps: [
        { order: 1, description: 'Розімніть сир виделкою, додайте яйця, цукор і борошно, перемішайте.' },
        { order: 2, description: 'Сформуйте сирники вологими руками й обваляйте в борошні.' },
        { order: 3, description: 'Обсмажте на середньому вогні по 3 хвилини з кожного боку.', duration: 6 },
    ],
    taste: { sweet: 3, salty: 1, sour: 2, bitter: 0, spicy: 0, umami: 1 },
    notes: '',
    issues: [],
    images: [],
    sourceUrl: '',
    source: { platform: 'text', url: '', title: '', author: '', imageUrl: '', via: [] },
};

function previewFor(url: string): any {
    if (/youtu/i.test(url)) {
        return { platform: 'youtube', url, title: 'Справжній плов у казані', author: 'Кухня на дровах', snippet: '', image: '/images/uzbekskyi-plov.jpg', hasStructuredRecipe: false, videoSeconds: 742, watchesVideo: true };
    }
    if (/news/i.test(url)) {
        return { platform: 'website', url, title: 'Новини дня', author: '', snippet: '', image: '', hasStructuredRecipe: false, videoSeconds: null };
    }
    return { platform: /tiktok/i.test(url) ? 'tiktok' : 'instagram', url, title: 'Вареники з вишнею як у бабусі', author: '@smachno.vdoma', snippet: '', image: '/images/varenyky-z-vyshneiu.jpg', hasStructuredRecipe: false, videoSeconds: null };
}

function importFor(body: any): { ms: number; result?: any; error?: { status: number; body: any } } {
    if (body?.url && /private/i.test(body.url)) {
        return { ms: 1500, error: { status: 422, body: { code: 'SOURCE_UNAVAILABLE', message: 'Instagram не віддав цей допис. Можливо, акаунт приватний або допис видалено.' } } };
    }
    if (body?.url && /news/i.test(body.url)) {
        return { ms: 4000, result: { ...SYRNYKY, isRecipe: false, notRecipeReason: 'Це новинна стаття про ціни на продукти, рецепта в ній немає.', ingredients: [], steps: [], issues: [] } };
    }
    if (body?.url && /youtu/i.test(body.url)) return { ms: 14000, result: PLOV };
    if (body?.url) return { ms: 7000, result: { ...VARENYKY, sourceUrl: body.url, source: { ...VARENYKY.source, url: body.url } } };
    if (body?.images?.length) return { ms: 8500, result: PIE };
    return { ms: 5000, result: SYRNYKY };
}

function reply(body: any, ms = 250): Observable<HttpResponse<any>> {
    return of(new HttpResponse({ status: 200, body })).pipe(delay(ms));
}

function route(req: HttpRequest<any>): Observable<HttpResponse<any>> | null {
    const path = new URL(req.url).pathname.replace(/^\/api/, '');
    const method = req.method;
    if (path === '/auth/session') return reply(SESSION, 300);
    if (path.startsWith('/auth/')) return reply({ ok: true });
    if (path === '/families' && method === 'GET') return reply([FAMILY]);
    if (path === '/me/likes') return reply([]);
    if (path === '/dishes' && method === 'GET') return from(dishes()).pipe(mergeMap((list) => reply(list, 400)));
    if (path.startsWith('/dishes/slug/')) {
        const slug = decodeURIComponent(path.split('/').pop() || '');
        return from(dishes()).pipe(mergeMap((list) => reply(list.find((dish) => dish.slug === slug) ?? null)));
    }
    if (path === '/dishes' && method === 'POST') {
        const dish = { ...req.body, id: `dish-new-${created.length + 1}`, ratingCount: 0, ratingAverage: 0, likeCount: 0, viewCount: 0, cookedCount: 0, rating: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), familyName: FAMILY.name, familySlug: FAMILY.slug };
        created.unshift(dish);
        return reply(dish, 600);
    }
    if (path === '/uploads/recipe-images') return reply({ url: '/images/berry-muffins.jpg' }, 900);
    if (path === '/ai/recipes/import/preview') return reply(previewFor(req.body?.url ?? ''), 900);
    if (path === '/ai/recipes/import') {
        const plan = importFor(req.body);
        if (plan.error) {
            return throwError(() => new HttpErrorResponse({ status: plan.error!.status, error: plan.error!.body, url: req.url })).pipe(
                (source) => of(null).pipe(delay(plan.ms), mergeMap(() => source)),
            );
        }
        return reply(plan.result, plan.ms);
    }
    if (method === 'GET') return reply(path.includes('stats') ? {} : []);
    return reply({ ok: true });
}

const mockApiInterceptor: HttpInterceptorFn = (req, next) => {
    if (!/\/api\//.test(req.url) || req.url.startsWith(location.origin)) return next(req);
    return route(req) ?? next(req);
};

export const MOCK_INTERCEPTORS: HttpInterceptorFn[] = [mockApiInterceptor];
