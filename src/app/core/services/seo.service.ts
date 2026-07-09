import { DOCUMENT, inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { Dish } from '../models/dish.model';

const SITE_NAME = 'The Dish Archive';
const DEFAULT_TITLE = 'The Dish Archive — Колекція рецептів';
const DEFAULT_DESCRIPTION = 'Колекція улюблених рецептів та страв, зібрана з турботою.';
const JSONLD_ID = 'seo-jsonld';

interface OgOptions {
    type: 'website' | 'article';
    title: string;
    description: string;
    url: string;
    image: string;
    imageAlt: string;
}

/**
 * Keeps <title>, description, canonical, Open Graph, Twitter Card and the
 * schema.org/Recipe JSON-LD in sync as the user navigates the SPA.
 *
 * Preview bots don't run JS, so the *initial* tags for a shared recipe link come
 * from the server (api/render.js). This service mirrors that same output on the
 * client so in-app navigation, the browser tab title, and JS-rendering crawlers
 * (e.g. Googlebot) all stay correct.
 */
@Injectable({ providedIn: 'root' })
export class SeoService {
    private readonly titleService = inject(Title);
    private readonly meta = inject(Meta);
    private readonly doc = inject(DOCUMENT);

    /** Applies recipe-specific metadata for a /dish/:slug page. */
    setRecipe(dish: Dish): void {
        const origin = this.origin();
        const url = `${origin}/dish/${dish.slug}`;
        const image = this.absolute(this.primaryImageUrl(dish), origin);
        const description = this.truncate(dish.description || DEFAULT_DESCRIPTION, 200);

        this.titleService.setTitle(`${dish.title} — ${SITE_NAME}`);
        this.setDescription(description);
        this.setCanonical(url);
        this.setOpenGraph({
            type: 'article',
            title: dish.title,
            description,
            url,
            image,
            imageAlt: this.primaryImageAlt(dish),
        });
        this.setTwitter(image ? 'summary_large_image' : 'summary', dish.title, description, image);
        this.setJsonLd(this.recipeJsonLd(dish, url, image, origin));
    }

    /** Restores the generic site metadata (used when leaving a recipe page). */
    setDefault(): void {
        const origin = this.origin();
        const url = origin + this.doc.location.pathname;

        this.titleService.setTitle(DEFAULT_TITLE);
        this.setDescription(DEFAULT_DESCRIPTION);
        this.setCanonical(url);
        this.setOpenGraph({
            type: 'website',
            title: DEFAULT_TITLE,
            description: DEFAULT_DESCRIPTION,
            url,
            image: '',
            imageAlt: '',
        });
        this.setTwitter('summary', DEFAULT_TITLE, DEFAULT_DESCRIPTION, '');
        this.removeJsonLd();
    }

    // ── Tag helpers ──────────────────────────────────────────────────────────

    private setDescription(content: string): void {
        this.meta.updateTag({ name: 'description', content });
    }

    private setOpenGraph(og: OgOptions): void {
        this.meta.updateTag({ property: 'og:type', content: og.type });
        this.meta.updateTag({ property: 'og:site_name', content: SITE_NAME });
        this.meta.updateTag({ property: 'og:locale', content: 'uk_UA' });
        this.meta.updateTag({ property: 'og:title', content: og.title });
        this.meta.updateTag({ property: 'og:description', content: og.description });
        this.meta.updateTag({ property: 'og:url', content: og.url });
        if (og.image) {
            this.meta.updateTag({ property: 'og:image', content: og.image });
            this.meta.updateTag({ property: 'og:image:alt', content: og.imageAlt });
        } else {
            this.meta.removeTag("property='og:image'");
            this.meta.removeTag("property='og:image:alt'");
        }
    }

    private setTwitter(card: string, title: string, description: string, image: string): void {
        this.meta.updateTag({ name: 'twitter:card', content: card });
        this.meta.updateTag({ name: 'twitter:title', content: title });
        this.meta.updateTag({ name: 'twitter:description', content: description });
        if (image) {
            this.meta.updateTag({ name: 'twitter:image', content: image });
        } else {
            this.meta.removeTag("name='twitter:image'");
        }
    }

    private setCanonical(href: string): void {
        let link = this.doc.head.querySelector<HTMLLinkElement>("link[rel='canonical']");
        if (!link) {
            link = this.doc.createElement('link');
            link.setAttribute('rel', 'canonical');
            this.doc.head.appendChild(link);
        }
        link.setAttribute('href', href);
    }

    private setJsonLd(json: string): void {
        let script = this.doc.getElementById(JSONLD_ID) as HTMLScriptElement | null;
        if (!script) {
            script = this.doc.createElement('script');
            script.type = 'application/ld+json';
            script.id = JSONLD_ID;
            this.doc.head.appendChild(script);
        }
        script.textContent = json;
    }

    private removeJsonLd(): void {
        this.doc.getElementById(JSONLD_ID)?.remove();
    }

    // ── schema.org/Recipe ────────────────────────────────────────────────────

    private recipeJsonLd(dish: Dish, url: string, image: string, origin: string): string {
        const images = dish.images
            .slice()
            .sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0))
            .map((img) => this.absolute(img.url, origin))
            .filter(Boolean);

        const data: Record<string, unknown> = {
            '@context': 'https://schema.org',
            '@type': 'Recipe',
            name: dish.title,
            description: (dish.description || '').replace(/\s+/g, ' ').trim(),
            image: images.length ? images : image ? [image] : undefined,
            url,
            mainEntityOfPage: url,
            author: { '@type': 'Organization', name: dish.familyName || SITE_NAME },
            datePublished: dish.createdAt || undefined,
            dateModified: dish.updatedAt || undefined,
            keywords: dish.tags.length ? dish.tags.join(', ') : undefined,
            recipeCategory: dish.categories.length ? dish.categories.join(', ') : undefined,
            recipeYield: dish.servings ? String(dish.servings) : undefined,
            recipeIngredient: dish.ingredients.map((ing) => {
                const qty = [ing.amount, ing.unit].map((x) => (x || '').trim()).filter(Boolean).join(' ');
                return qty ? `${ing.name} — ${qty}` : ing.name;
            }),
            recipeInstructions: dish.steps
                .slice()
                .sort((a, b) => a.order - b.order)
                .map((step) => ({ '@type': 'HowToStep', text: step.description })),
            inLanguage: 'uk',
        };

        if (dish.cookingTime.total) data['totalTime'] = `PT${dish.cookingTime.total}M`;
        if (dish.cookingTime.preparation) data['prepTime'] = `PT${dish.cookingTime.preparation}M`;
        if (dish.cookingTime.cooking) data['cookTime'] = `PT${dish.cookingTime.cooking}M`;
        if (dish.calories) {
            data['nutrition'] = { '@type': 'NutritionInformation', calories: `${dish.calories} kcal` };
        }
        if (dish.ratingCount > 0) {
            data['aggregateRating'] = {
                '@type': 'AggregateRating',
                ratingValue: dish.ratingAverage.toFixed(1),
                ratingCount: dish.ratingCount,
            };
        }

        for (const key of Object.keys(data)) {
            const value = data[key];
            if (value == null || (Array.isArray(value) && value.length === 0)) delete data[key];
        }
        return JSON.stringify(data).replace(/</g, '\\u003c');
    }

    // ── Small utilities ──────────────────────────────────────────────────────

    private origin(): string {
        return this.doc.location?.origin ?? '';
    }

    private primaryImageUrl(dish: Dish): string {
        const primary = dish.images.find((img) => img.isPrimary) ?? dish.images[0];
        return primary?.url ?? '';
    }

    private primaryImageAlt(dish: Dish): string {
        const primary = dish.images.find((img) => img.isPrimary) ?? dish.images[0];
        return primary?.alt || dish.title;
    }

    private absolute(url: string, origin: string): string {
        if (!url) return '';
        if (/^https?:\/\//i.test(url)) return url;
        return origin.replace(/\/$/, '') + (url.startsWith('/') ? url : '/' + url);
    }

    private truncate(text: string, n: number): string {
        const clean = String(text || '').replace(/\s+/g, ' ').trim();
        if (clean.length <= n) return clean;
        const cut = clean.slice(0, n);
        const lastSpace = cut.lastIndexOf(' ');
        return (lastSpace > n * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s.,;:!?-]+$/, '') + '…';
    }
}
