import { Injectable, signal } from '@angular/core';

export type ChangeType = 'feature' | 'improvement' | 'fix' | 'removed';

export interface ReleaseItem {
    type: ChangeType;
    text: string;
}

export interface Release {
    version: string;
    title: string;
    /** ISO date. */
    date: string;
    items: ReleaseItem[];
}

/**
 * Curated in-app "What's New" release notes. Newest release first.
 * Tracks the last version the user has seen (localStorage) to badge the sidebar.
 */
@Injectable({ providedIn: 'root' })
export class WhatsNewService {
    private static readonly SEEN_KEY = 'dishArchive.whatsNewSeen';

    readonly releases: Release[] = [
        {
            version: '1.4',
            title: 'Готування та аналітика',
            date: '2026-07-08',
            items: [
                { type: 'feature', text: 'Режим готування — покроковий повноекранний екран з таймерами для кожного кроку, чек-листом інгредієнтів і блокуванням згасання екрана.' },
                { type: 'feature', text: 'Смачна аналітика — красива статистика колекції: рейтинги, категорії, смаковий профіль, час приготування, топ страв.' },
                { type: 'improvement', text: 'Новий перемикач родин з аватарами, кольорами теми та лічильником рецептів.' },
                { type: 'improvement', text: 'Рейтинги показують реальну середню оцінку, кількість відгуків і розподіл по зірках.' },
                { type: 'improvement', text: 'Публічність рецепта тепер за замовчуванням, з перемикачем прямо на сторінці страви.' },
                { type: 'removed', text: 'Прибрано настирливий pull-to-refresh, що спрацьовував випадково.' },
            ],
        },
        {
            version: '1.3',
            title: 'Соціальні фічі',
            date: '2026-07-07',
            items: [
                { type: 'feature', text: 'Реальні лайки, збережені в базі — красивий лічильник із серцем.' },
                { type: 'feature', text: 'Оцінки зі зірками та коментарі до страв.' },
                { type: 'feature', text: 'Приватні та публічні рецепти для родини.' },
                { type: 'improvement', text: 'Власні красиві випадаючі списки замість системних — зручні й на телефоні.' },
                { type: 'fix', text: 'Видалення рецепта тепер із підтвердженням і чесним повідомленням про помилку.' },
            ],
        },
        {
            version: '1.2',
            title: 'Родини та адміністрування',
            date: '2026-07-06',
            items: [
                { type: 'feature', text: 'Панель родини: керування учасниками, налаштування, обкладинка та колір.' },
                { type: 'feature', text: 'Панель супер-адміна: родини, користувачі, запити на доступ, активність.' },
                { type: 'feature', text: 'Автозбереження чернетки рецепта — робота не втрачається навіть після перезавантаження.' },
            ],
        },
        {
            version: '1.1',
            title: 'Редактор і мультиродинність',
            date: '2026-07-05',
            items: [
                { type: 'feature', text: 'Повноцінний редактор рецептів: фото, інгредієнти, кроки, смак, теги.' },
                { type: 'feature', text: 'Кілька родин з перемиканням і фільтрами у каталозі.' },
                { type: 'feature', text: 'Вхід через Google акаунт.' },
            ],
        },
        {
            version: '1.0',
            title: 'Перший реліз',
            date: '2026-07-04',
            items: [
                { type: 'feature', text: 'Кулінарна книга: каталог страв, пошук, фільтри та обране.' },
                { type: 'feature', text: 'Затишний український дизайн зі світлою та темною темами.' },
            ],
        },
    ];

    readonly latestVersion = this.releases[0]?.version ?? '';
    readonly hasUnseen = signal(this.computeUnseen());

    private computeUnseen(): boolean {
        try {
            return localStorage.getItem(WhatsNewService.SEEN_KEY) !== this.latestVersion;
        } catch {
            return false;
        }
    }

    markSeen(): void {
        try {
            localStorage.setItem(WhatsNewService.SEEN_KEY, this.latestVersion);
        } catch {
            // ignore
        }
        this.hasUnseen.set(false);
    }
}
