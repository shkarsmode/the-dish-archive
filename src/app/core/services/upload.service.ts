import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';

/** Uploads images through the NestJS backend and returns their public URLs. */
@Injectable({ providedIn: 'root' })
export class UploadService {
    private readonly api = inject(ApiService);

    async uploadImage(file: File | Blob): Promise<{ url: string }> {
        const form = new FormData();
        if (file instanceof File) {
            form.append('file', file);
        } else {
            form.append('file', file, 'image.jpg');
        }

        const response = await this.api.postForm<{ url: string }>('/uploads/recipe-images', form);
        return { url: response.url };
    }
}
