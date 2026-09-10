/**
 * Insert a Cloudinary transformation into an /image/upload/ URL at render time.
 * Non-Cloudinary URLs (local /images/*.jpg, data: SVG fallbacks, anything without
 * the upload segment) are returned unchanged, so it is safe to wrap every [src].
 *
 *   cld('https://res.cloudinary.com/x/image/upload/v1/a.jpg', 'f_auto,q_auto,w_600')
 *   → 'https://res.cloudinary.com/x/image/upload/f_auto,q_auto,w_600/v1/a.jpg'
 */
export function cld(url: string | null | undefined, transform: string): string {
    if (!url) return '';
    const marker = '/image/upload/';
    const i = url.indexOf(marker);
    if (i === -1) return url;
    return url.slice(0, i + marker.length) + transform + '/' + url.slice(i + marker.length);
}

/** Build a Cloudinary width-descriptor srcset (no dpr_auto — the browser already
 *  accounts for device DPR when picking a candidate). */
export function cldSrcset(url: string | null | undefined, base: string, widths: number[]): string {
    if (!url || url.indexOf('/image/upload/') === -1) return '';
    return widths.map(w => `${cld(url, `${base},w_${w}`)} ${w}w`).join(', ');
}
