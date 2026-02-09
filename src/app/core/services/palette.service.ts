import { Injectable } from '@angular/core';

export interface AccentPalette {
    accent: string;
    accentLight: string;
    accentDark: string;
    accentHover: string;
}

@Injectable({ providedIn: 'root' })
export class PaletteService {
    /**
     * Extract dominant color from an image URL via a tiny offscreen canvas.
     * Returns an HSL-based palette, or null if extraction fails.
     */
    extractFromUrl(url: string): Promise<AccentPalette | null> {
        return new Promise(resolve => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(this.extractFromImage(img));
            img.onerror = () => resolve(null);
            img.src = url;
        });
    }

    extractFromImage(img: HTMLImageElement): AccentPalette | null {
        try {
            const size = 64;
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) return null;

            ctx.drawImage(img, 0, 0, size, size);
            const data = ctx.getImageData(0, 0, size, size).data;

            // K-means-lite: bucket pixels, find the most vibrant dominant cluster
            const buckets = new Map<string, { r: number; g: number; b: number; count: number }>();

            for (let i = 0; i < data.length; i += 16) { // sample every 4th pixel
                const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
                if (a < 128) continue; // skip transparent

                // Quantize to 4-bit
                const qr = (r >> 4) << 4;
                const qg = (g >> 4) << 4;
                const qb = (b >> 4) << 4;
                const key = `${qr},${qg},${qb}`;

                const bucket = buckets.get(key);
                if (bucket) {
                    bucket.r += r;
                    bucket.g += g;
                    bucket.b += b;
                    bucket.count++;
                } else {
                    buckets.set(key, { r, g, b, count: 1 });
                }
            }

            if (buckets.size === 0) return null;

            // Sort by count, then pick the most saturated among top buckets
            const sorted = [...buckets.values()]
                .sort((a, b) => b.count - a.count)
                .slice(0, 8);

            let best = sorted[0];
            let bestScore = 0;

            for (const b of sorted) {
                const avg = { r: b.r / b.count, g: b.g / b.count, b: b.b / b.count };
                const [h, s, l] = this.rgbToHsl(avg.r, avg.g, avg.b);
                // Score: prefer saturated, mid-lightness colors
                const score = s * (1 - Math.abs(l - 0.45)) * Math.sqrt(b.count);
                if (score > bestScore) {
                    bestScore = score;
                    best = b;
                }
            }

            const avg = { r: best.r / best.count, g: best.g / best.count, b: best.b / best.count };
            const [h, s, l] = this.rgbToHsl(avg.r, avg.g, avg.b);

            // Ensure minimum saturation for a nice accent
            const sat = Math.max(s, 0.25);
            const lig = Math.min(Math.max(l, 0.35), 0.55);

            return this.buildPalette(h, sat, lig);
        } catch {
            return null;
        }
    }

    private buildPalette(h: number, s: number, l: number): AccentPalette {
        const hDeg = Math.round(h * 360);
        const sPct = Math.round(s * 100);

        return {
            accent: `hsl(${hDeg}, ${sPct}%, ${Math.round(l * 100)}%)`,
            accentLight: `hsl(${hDeg}, ${Math.round(s * 60)}%, 93%)`,
            accentDark: `hsl(${hDeg}, ${Math.round(s * 80)}%, ${Math.round(l * 75)}%)`,
            accentHover: `hsl(${hDeg}, ${sPct}%, ${Math.round(l * 90)}%)`,
        };
    }

    private rgbToHsl(r: number, g: number, b: number): [number, number, number] {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        const l = (max + min) / 2;
        if (max === min) return [0, 0, l];
        const d = max - min;
        const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        let h = 0;
        if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        else if (max === g) h = ((b - r) / d + 2) / 6;
        else h = ((r - g) / d + 4) / 6;
        return [h, s, l];
    }
}
