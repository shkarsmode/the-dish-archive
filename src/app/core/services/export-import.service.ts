import { Injectable, inject } from '@angular/core';
import { DishData } from '../models/dish.model';
import { DishService } from './dish.service';
import { ToastService } from './toast.service';

@Injectable({ providedIn: 'root' })
export class ExportImportService {
    private readonly dishService = inject(DishService);
    private readonly toastService = inject(ToastService);

    exportToJson(): void {
        try {
            const data = this.dishService.exportData();
            const jsonString = JSON.stringify(data, null, 4);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = `dish-archive-${this.formatDate(new Date())}.json`;
            document.body.appendChild(anchor);
            anchor.click();
            document.body.removeChild(anchor);
            URL.revokeObjectURL(url);

            this.toastService.success('Данные экспортированы');
        } catch (error) {
            console.error('Export failed:', error);
            this.toastService.error('Ошибка при экспорте данных');
        }
    }

    importFromJson(file: File): void {
        const reader = new FileReader();

        reader.onload = () => {
            try {
                const data = JSON.parse(reader.result as string) as DishData;

                if (!this.validateDishData(data)) {
                    this.toastService.error('Неверный формат данных');
                    return;
                }

                this.dishService.importDishes(data);
                this.toastService.success(`Импортировано ${data.dishes.length} блюд`);
            } catch (error) {
                console.error('Import failed:', error);
                this.toastService.error('Ошибка при чтении файла');
            }
        };

        reader.onerror = () => {
            this.toastService.error('Ошибка при чтении файла');
        };

        reader.readAsText(file);
    }

    private validateDishData(data: unknown): data is DishData {
        if (!data || typeof data !== 'object') return false;
        const dishData = data as Record<string, unknown>;
        if (typeof dishData['version'] !== 'string') return false;
        if (!Array.isArray(dishData['dishes'])) return false;

        return dishData['dishes'].every((dish: Record<string, unknown>) =>
            typeof dish['id'] === 'string' &&
            typeof dish['title'] === 'string' &&
            typeof dish['slug'] === 'string'
        );
    }

    private formatDate(date: Date): string {
        return date.toISOString().slice(0, 10);
    }
}
