import { computed, inject, Injectable } from '@angular/core';
import { DishService } from './dish.service';

export interface CookRank {
    id: number;
    title: string;
    subtitle: string;
    threshold: number; // number of dishes in collection
    color: string;
    glow: string;
}

// ── 30 Ranks: від новачка до легенди ──
export const RANKS: CookRank[] = [
    { id: 1,  title: 'Новачок',               subtitle: 'Тільки починаєш',               threshold: 0,   color: '#9E9E9E', glow: '#9E9E9E40' },
    { id: 2,  title: 'Цікавий',               subtitle: 'Перша страва!',                  threshold: 1,   color: '#8D8D8D', glow: '#8D8D8D40' },
    { id: 3,  title: 'Дегустатор',             subtitle: 'Розпробовуєш',                  threshold: 2,   color: '#78909C', glow: '#78909C40' },
    { id: 4,  title: 'Помічник',               subtitle: 'Вже допомагаєш',                threshold: 3,   color: '#7CB342', glow: '#7CB34240' },
    { id: 5,  title: 'Початківець',            subtitle: 'Перші кроки',                    threshold: 4,   color: '#66BB6A', glow: '#66BB6A40' },
    { id: 6,  title: 'Кухонний учень',         subtitle: 'Вчишся швидко',                  threshold: 5,   color: '#4CAF50', glow: '#4CAF5040' },
    { id: 7,  title: 'Різальник',              subtitle: 'Ніж — твій друг',                threshold: 7,   color: '#26A69A', glow: '#26A69A40' },
    { id: 8,  title: 'Мішальник',              subtitle: 'Мішаєш як про',                  threshold: 9,   color: '#29B6F6', glow: '#29B6F640' },
    { id: 9,  title: 'Смакун',                 subtitle: 'Знаєш толк у смаках',            threshold: 11,  color: '#42A5F5', glow: '#42A5F540' },
    { id: 10, title: 'Домашній кухар',         subtitle: 'Кухня — твоя зона',              threshold: 14,  color: '#5C6BC0', glow: '#5C6BC040' },
    { id: 11, title: 'Кулінарний ентузіаст',   subtitle: 'Тебе не зупинити',               threshold: 17,  color: '#7E57C2', glow: '#7E57C240' },
    { id: 12, title: 'Майстер сніданків',      subtitle: 'Ранок починається з тебе',       threshold: 20,  color: '#AB47BC', glow: '#AB47BC40' },
    { id: 13, title: 'Обідній герой',          subtitle: 'Обід завжди смачний',            threshold: 24,  color: '#EC407A', glow: '#EC407A40' },
    { id: 14, title: 'Вечірній шеф',           subtitle: 'Вечеря — твій шедевр',           threshold: 28,  color: '#EF5350', glow: '#EF535040' },
    { id: 15, title: 'Спеціаліст',             subtitle: 'Точно знаєш що робиш',           threshold: 33,  color: '#FF7043', glow: '#FF704340' },
    { id: 16, title: 'Кондитер',               subtitle: 'Десерти — твоя стихія',           threshold: 38,  color: '#FFA726', glow: '#FFA72640' },
    { id: 17, title: 'Соусьє',                 subtitle: 'Магія соусів',                   threshold: 44,  color: '#FFCA28', glow: '#FFCA2840' },
    { id: 18, title: 'Гриль-майстер',          subtitle: 'Вогонь підкоряється тобі',       threshold: 50,  color: '#FFD54F', glow: '#FFD54F50' },
    { id: 19, title: 'Су-шеф',                 subtitle: 'Права рука на кухні',            threshold: 57,  color: '#FFF176', glow: '#FFF17650' },
    { id: 20, title: 'Шеф-кухар',              subtitle: 'Кухня тебе поважає',             threshold: 65,  color: '#E0E0E0', glow: '#FFFFFF40' },
    { id: 21, title: 'Ресторанний шеф',        subtitle: 'Рівень ресторану',               threshold: 73,  color: '#CFD8DC', glow: '#FFFFFF50' },
    { id: 22, title: 'Зірковий кухар',         subtitle: 'Перша зірка Мішлен ⭐',          threshold: 82,  color: '#B0BEC5', glow: '#FFFFFF60' },
    { id: 23, title: 'Кулінарний артист',       subtitle: 'Їжа як мистецтво',               threshold: 91,  color: '#CE93D8', glow: '#CE93D860' },
    { id: 24, title: 'Майстер-клас',           subtitle: 'Можеш вже вчити інших',          threshold: 100, color: '#F48FB1', glow: '#F48FB160' },
    { id: 25, title: 'Гуру',                   subtitle: 'Кулінарна мудрість',             threshold: 108, color: '#EF9A9A', glow: '#EF9A9A60' },
    { id: 26, title: 'Віртуоз',                subtitle: 'Досконалість у деталях',          threshold: 117, color: '#FFCC80', glow: '#FFCC8060' },
    { id: 27, title: 'Гранд-шеф',             subtitle: 'Тебе знає весь район',           threshold: 126, color: '#FFE082', glow: '#FFE08270' },
    { id: 28, title: 'Кулінарна зірка',        subtitle: 'Легенда кухні ⭐⭐',             threshold: 135, color: '#FFF59D', glow: '#FFF59D70' },
    { id: 29, title: 'Кулінарний бог',         subtitle: 'Олімп кухні підкорений',         threshold: 143, color: '#F0F4C3', glow: '#F0F4C380' },
    { id: 30, title: 'Булкіна Легенда',        subtitle: 'Найвище звання. Назавжди. 💛',   threshold: 150, color: '#FFD700', glow: '#FFD70090' },
];

@Injectable({ providedIn: 'root' })
export class RankService {
    private readonly dishService = inject(DishService);

    /** Total dishes in the collection */
    readonly totalDishes = computed(() => this.dishService.allDishes().length);

    readonly currentRank = computed(() => {
        const total = this.totalDishes();
        let rank = RANKS[0];
        for (const r of RANKS) {
            if (total >= r.threshold) rank = r;
            else break;
        }
        return rank;
    });

    readonly nextRank = computed(() => {
        const current = this.currentRank();
        const idx = RANKS.findIndex(r => r.id === current.id);
        return idx < RANKS.length - 1 ? RANKS[idx + 1] : undefined;
    });

    readonly progress = computed(() => {
        const current = this.currentRank();
        const next = this.nextRank();
        if (!next) return 100;
        const total = this.totalDishes();
        const range = next.threshold - current.threshold;
        const done = total - current.threshold;
        return Math.min(100, Math.round((done / range) * 100));
    });
}
