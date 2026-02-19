import { computed, Injectable, signal } from '@angular/core';
import { Dish } from '../models/dish.model';

const MAX_COMPARE_ITEMS = 4;

@Injectable({ providedIn: 'root' })
export class CompareService {
    readonly selectedDishes = signal<Dish[]>([]);

    readonly count = computed(() => this.selectedDishes().length);
    readonly isVisible = computed(() => this.selectedDishes().length > 0);
    readonly canCompare = computed(() => this.selectedDishes().length >= 2);
    readonly isFull = computed(() => this.selectedDishes().length >= MAX_COMPARE_ITEMS);

    toggle(dish: Dish): void {
        this.selectedDishes.update(current => {
            const exists = current.some(d => d.id === dish.id);
            if (exists) {
                return current.filter(d => d.id !== dish.id);
            }
            if (current.length >= MAX_COMPARE_ITEMS) {
                return current;
            }
            return [...current, dish];
        });
    }

    remove(dishId: string): void {
        this.selectedDishes.update(current =>
            current.filter(dish => dish.id !== dishId)
        );
    }

    selectedDishesIds = computed(() => 
        new Set(this.selectedDishes().map(dish => dish?.id))
    );

    isSelected(dishId: string) {
        return this.selectedDishesIds().has(dishId);
    }

    clear(): void {
        this.selectedDishes.set([]);
    }
}
