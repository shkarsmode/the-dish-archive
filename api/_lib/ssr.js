// Shared server-render helpers for The Dish Archive's Vercel functions.
//
// The app itself is a client-rendered Angular SPA. Preview bots (Telegram,
// Facebook, Messenger, Twitter/X, WhatsApp) and — reliably — search crawlers
// do NOT run JS, so they'd otherwise see an empty shell. These helpers fetch a
// recipe from our NestJS backend's public endpoints (which only ever expose
// published + public recipes) and inject real <head> meta + schema.org JSON-LD
// (and a crawlable body) into the built index.html before it reaches the bot.
//
// Plain CommonJS with zero dependencies (uses the Node 18+ global `fetch`) so
// it needs no build step of its own — Angular's build never touches api/.

'use strict';

const fs = require('fs');
const path = require('path');

// ── Config. The backend's public SEO endpoints only ever return published +
// public recipes. Overridable via the API_URL env var (include the /api prefix).
const API_URL = (process.env.API_URL || 'https://the-dish-archive-back.vercel.app/api').replace(/\/$/, '');

const SITE_NAME = 'The Dish Archive';
const DEFAULT_TITLE = 'The Dish Archive — Колекція рецептів';
const DEFAULT_DESCRIPTION = 'Колекція улюблених рецептів та страв, зібрана з турботою.';

// ── Small utilities ──────────────────────────────────────────────────────────

/** Escapes text for safe use in HTML text nodes and double-quoted attributes. */
function escapeHtml(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/** Turns a root-relative asset path into an absolute URL (og:image needs one). */
function absolutize(url, siteUrl) {
    if (!url) return '';
    if (/^https?:\/\//i.test(url)) return url;
    return siteUrl.replace(/\/$/, '') + (url.startsWith('/') ? url : '/' + url);
}

/** Trims a description to ~n chars on a word boundary, with an ellipsis. */
function truncate(text, n) {
    const clean = String(text || '').replace(/\s+/g, ' ').trim();
    if (clean.length <= n) return clean;
    const cut = clean.slice(0, n);
    const lastSpace = cut.lastIndexOf(' ');
    return (lastSpace > n * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s.,;:!?-]+$/, '') + '…';
}

/** Resolves the public origin (https://host) for canonical + absolute URLs. */
function siteUrlFromReq(req) {
    if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, '');
    const proto = (req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
    return `${proto}://${host}`;
}

// The built shell is read once per warm lambda and cached in module scope.
let baseHtmlCache = null;
function getBaseHtml() {
    if (baseHtmlCache) return baseHtmlCache;
    const candidates = [
        path.join(process.cwd(), 'dist/the-dish-archive/browser/index.html'),
        path.join(__dirname, '../../dist/the-dish-archive/browser/index.html'),
        path.join(__dirname, '../dist/the-dish-archive/browser/index.html'),
    ];
    for (const candidate of candidates) {
        try {
            baseHtmlCache = fs.readFileSync(candidate, 'utf8');
            return baseHtmlCache;
        } catch (_) {
            /* try next candidate */
        }
    }
    // Last-resort shell so the function never hard-fails if the build moved.
    baseHtmlCache =
        '<!doctype html><html lang="uk"><head><meta charset="utf-8">' +
        `<title>${DEFAULT_TITLE}</title></head><body><app-root></app-root></body></html>`;
    return baseHtmlCache;
}

// ── Backend public reads (published + public recipes only) ───────────────────

async function apiGet(pathAndQuery) {
    const res = await fetch(`${API_URL}${pathAndQuery}`, { headers: { Accept: 'application/json' } });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
}

/** Fetches a single published + public dish by slug (camelCase Dish, or null). */
async function fetchDishBySlug(slug) {
    return apiGet(`/public/dishes/${encodeURIComponent(slug)}`);
}

/** Fetches all published + public dishes ([{ slug, updatedAt }]) for the sitemap. */
async function fetchPublicDishes() {
    const rows = await apiGet('/public/dishes');
    return Array.isArray(rows) ? rows : [];
}

// ── View-model helpers (the API returns the camelCase Dish shape, already sorted) ──

function sortedImages(dish) {
    return dish.images || [];
}

function primaryImage(dish) {
    const images = sortedImages(dish);
    return images.find((img) => img.isPrimary) || images[0] || null;
}

function ingredientLines(dish) {
    return (dish.ingredients || [])
        .map((ing) => {
            const qty = [ing.amount, ing.unit].map((x) => (x || '').trim()).filter(Boolean).join(' ');
            return qty ? `${ing.name} — ${qty}` : ing.name;
        })
        .filter(Boolean);
}

function stepTexts(dish) {
    return (dish.steps || [])
        .map((step) => (step.description || '').trim())
        .filter(Boolean);
}

// ── schema.org/Recipe JSON-LD ────────────────────────────────────────────────

function recipeJsonLd(dish, canonical, imageAbs, allImagesAbs) {
    const data = {
        '@context': 'https://schema.org',
        '@type': 'Recipe',
        name: dish.title,
        description: (dish.description || '').replace(/\s+/g, ' ').trim(),
        image: allImagesAbs.length ? allImagesAbs : imageAbs ? [imageAbs] : undefined,
        url: canonical,
        mainEntityOfPage: canonical,
        author: {
            '@type': 'Organization',
            name: dish.familyName || SITE_NAME,
        },
        datePublished: dish.createdAt || undefined,
        dateModified: dish.updatedAt || undefined,
        keywords: (dish.tags || []).join(', ') || undefined,
        recipeCategory: (dish.categories || []).join(', ') || undefined,
        recipeYield: dish.servings ? String(dish.servings) : undefined,
        recipeIngredient: ingredientLines(dish),
        recipeInstructions: stepTexts(dish).map((text) => ({ '@type': 'HowToStep', text })),
        inLanguage: 'uk',
    };

    const time = dish.cookingTime || {};
    if (time.total) data.totalTime = `PT${time.total}M`;
    if (time.preparation) data.prepTime = `PT${time.preparation}M`;
    if (time.cooking) data.cookTime = `PT${time.cooking}M`;
    if (dish.calories) {
        data.nutrition = { '@type': 'NutritionInformation', calories: `${dish.calories} kcal` };
    }
    if (dish.ratingCount > 0) {
        data.aggregateRating = {
            '@type': 'AggregateRating',
            ratingValue: Number(dish.ratingAverage).toFixed(1),
            ratingCount: dish.ratingCount,
        };
    }

    // Drop undefined/empty keys for a clean payload.
    for (const key of Object.keys(data)) {
        const v = data[key];
        if (v == null || (Array.isArray(v) && v.length === 0)) delete data[key];
    }
    // Escape "<" so the payload can never break out of the <script> element.
    return JSON.stringify(data).replace(/</g, '\\u003c');
}

// ── HTML assembly ────────────────────────────────────────────────────────────

/** Removes any meta/link/JSON-LD tags we manage, so we never emit duplicates. */
function stripManagedTags(html) {
    return html
        .replace(/<meta\s+property=["']og:[^"']*["'][^>]*>\s*/gi, '')
        .replace(/<meta\s+name=["']twitter:[^"']*["'][^>]*>\s*/gi, '')
        .replace(/<meta\s+name=["']description["'][^>]*>\s*/gi, '')
        .replace(/<link\s+rel=["']canonical["'][^>]*>\s*/gi, '')
        .replace(/<script\s+type=["']application\/ld\+json["'][\s\S]*?<\/script>\s*/gi, '');
}

function metaTag(attr, key, content) {
    return `    <meta ${attr}="${key}" content="${escapeHtml(content)}">\n`;
}

/**
 * Builds the full HTML document for a recipe: title + description + canonical +
 * Open Graph + Twitter Card + Recipe JSON-LD in <head>, and a visually-hidden
 * crawlable summary before <app-root> (Google reads it; the SPA hydrates over it
 * and the preloader hides it from human eyes). Same HTML is served to everyone —
 * no user-agent cloaking.
 */
function renderRecipeHtml(baseHtml, dish, siteUrl) {
    const canonical = `${siteUrl}/dish/${dish.slug}`;
    const primary = primaryImage(dish);
    const imageAbs = primary ? absolutize(primary.url, siteUrl) : '';
    const imageAlt = (primary && primary.alt) || dish.title;
    const allImagesAbs = sortedImages(dish).map((img) => absolutize(img.url, siteUrl));
    const description = truncate(dish.description || DEFAULT_DESCRIPTION, 200);
    const fullTitle = `${dish.title} — ${SITE_NAME}`;

    let head = '';
    head += metaTag('name', 'description', description);
    head += `    <link rel="canonical" href="${escapeHtml(canonical)}">\n`;
    head += metaTag('property', 'og:type', 'article');
    head += metaTag('property', 'og:site_name', SITE_NAME);
    head += metaTag('property', 'og:locale', 'uk_UA');
    head += metaTag('property', 'og:title', dish.title);
    head += metaTag('property', 'og:description', description);
    head += metaTag('property', 'og:url', canonical);
    if (imageAbs) {
        head += metaTag('property', 'og:image', imageAbs);
        head += metaTag('property', 'og:image:secure_url', imageAbs);
        head += metaTag('property', 'og:image:alt', imageAlt);
        head += metaTag('property', 'og:image:width', '1200');
        head += metaTag('property', 'og:image:height', '630');
    }
    head += metaTag('name', 'twitter:card', imageAbs ? 'summary_large_image' : 'summary');
    head += metaTag('name', 'twitter:title', dish.title);
    head += metaTag('name', 'twitter:description', description);
    if (imageAbs) head += metaTag('name', 'twitter:image', imageAbs);
    head +=
        '    <script type="application/ld+json">' +
        recipeJsonLd(dish, canonical, imageAbs, allImagesAbs) +
        '</script>\n';

    const body = crawlableBody(dish, imageAbs, imageAlt, description);

    let html = stripManagedTags(baseHtml);
    html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(fullTitle)}</title>`);
    html = html.replace(/<\/head>/i, head + '</head>');
    html = html.replace(/<app-root><\/app-root>/i, body + '\n    <app-root></app-root>');
    return html;
}

/** Visually-hidden, crawler-readable recipe summary injected before <app-root>. */
function crawlableBody(dish, imageAbs, imageAlt, description) {
    const ingredients = ingredientLines(dish)
        .map((line) => `<li>${escapeHtml(line)}</li>`)
        .join('');
    const steps = stepTexts(dish)
        .map((text) => `<li>${escapeHtml(text)}</li>`)
        .join('');
    const img = imageAbs
        ? `<img src="${escapeHtml(imageAbs)}" alt="${escapeHtml(imageAlt)}" width="1200" height="630">`
        : '';
    return (
        '<div id="ssr-seo" aria-hidden="true" style="position:absolute;width:1px;height:1px;' +
        'padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;">' +
        `<h1>${escapeHtml(dish.title)}</h1>` +
        img +
        `<p>${escapeHtml(description)}</p>` +
        (ingredients ? `<h2>Інгредієнти</h2><ul>${ingredients}</ul>` : '') +
        (steps ? `<h2>Приготування</h2><ol>${steps}</ol>` : '') +
        '</div>'
    );
}

/** Adds a noindex hint (used when a slug maps to no public recipe). */
function withNoindex(baseHtml) {
    return baseHtml.replace(/<\/head>/i, '    <meta name="robots" content="noindex">\n</head>');
}

module.exports = {
    SITE_NAME,
    DEFAULT_TITLE,
    DEFAULT_DESCRIPTION,
    escapeHtml,
    absolutize,
    truncate,
    siteUrlFromReq,
    getBaseHtml,
    fetchDishBySlug,
    fetchPublicDishes,
    renderRecipeHtml,
    withNoindex,
};
