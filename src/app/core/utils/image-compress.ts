/**
 * Downscale a photo in the browser before it leaves the device: phone photos are
 * 4-12 MB, while 1600 px JPEG is plenty for both AI reading and recipe covers.
 * Uploads get 5-20x smaller, which is most of the wait on mobile data.
 */
export interface CompressedImage {
    blob: Blob;
    dataUrl: string;
    width: number;
    height: number;
}

export class UnsupportedImageError extends Error {
    constructor() {
        super('Цей формат фото не підтримується. Оберіть JPEG, PNG або WebP.');
    }
}

async function decode(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
    if ('createImageBitmap' in window) {
        try {
            return await createImageBitmap(file, { imageOrientation: 'from-image' });
        } catch {
            /* fall through to <img>, which some browsers decode more formats with */
        }
    }
    const url = URL.createObjectURL(file);
    try {
        const image = new Image();
        image.decoding = 'async';
        image.src = url;
        await image.decode();
        return image;
    } catch {
        throw new UnsupportedImageError();
    } finally {
        URL.revokeObjectURL(url);
    }
}

function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
    });
}

export async function compressImage(file: Blob, maxSide = 1600, quality = 0.82): Promise<CompressedImage> {
    const source = await decode(file);
    const sourceWidth = 'naturalWidth' in source ? source.naturalWidth : source.width;
    const sourceHeight = 'naturalHeight' in source ? source.naturalHeight : source.height;
    if (!sourceWidth || !sourceHeight) throw new UnsupportedImageError();

    const scale = Math.min(1, maxSide / Math.max(sourceWidth, sourceHeight));
    const width = Math.max(1, Math.round(sourceWidth * scale));
    const height = Math.max(1, Math.round(sourceHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new UnsupportedImageError();
    // JPEG has no alpha: paint white first so transparent PNG screenshots stay readable.
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    context.imageSmoothingQuality = 'high';
    context.drawImage(source, 0, 0, width, height);
    if ('close' in source) source.close();

    const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((result) => (result ? resolve(result) : reject(new UnsupportedImageError())), 'image/jpeg', quality),
    );
    return { blob, dataUrl: await blobToDataUrl(blob), width, height };
}
