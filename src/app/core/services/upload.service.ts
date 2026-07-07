import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';

/** Uploads images to Supabase Storage and returns their public URLs. */
@Injectable({ providedIn: 'root' })
export class UploadService {
    private readonly supabase = inject(SupabaseService);
    private readonly bucket = 'recipe-images';

    async uploadImage(file: File | Blob): Promise<{ url: string }> {
        const originalName = file instanceof File ? file.name : 'image.jpg';
        const extension = (originalName.split('.').pop() || 'jpg').toLowerCase();
        const path = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${extension}`;

        const { error } = await this.supabase.client.storage
            .from(this.bucket)
            .upload(path, file, {
                cacheControl: '3600',
                upsert: false,
                contentType: file instanceof File ? file.type || 'image/jpeg' : 'image/jpeg',
            });
        if (error) {
            throw error;
        }

        const { data } = this.supabase.client.storage.from(this.bucket).getPublicUrl(path);
        return { url: data.publicUrl };
    }
}
