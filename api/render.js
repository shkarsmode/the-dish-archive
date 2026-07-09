// Serves /dish/:slug with server-injected meta + JSON-LD so link previews and
// crawlers see the real recipe (they don't run JS). Everyone gets the same HTML;
// the Angular SPA then boots and hydrates over it. Any failure falls back to the
// untouched SPA shell so the page still works.

'use strict';

const {
    getBaseHtml,
    siteUrlFromReq,
    fetchDishBySlug,
    renderRecipeHtml,
    withNoindex,
} = require('./_lib/ssr');

module.exports = async (req, res) => {
    let baseHtml;
    try {
        baseHtml = getBaseHtml();
        const url = new URL(req.url, 'http://localhost');
        const slug = (url.searchParams.get('slug') || '').trim();
        const siteUrl = siteUrlFromReq(req);

        let html = baseHtml;
        if (slug) {
            const dish = await fetchDishBySlug(slug);
            html = dish ? renderRecipeHtml(baseHtml, dish, siteUrl) : withNoindex(baseHtml);
        }

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        // Cache at the edge; recipes change rarely and the client always re-fetches
        // live data on hydration, so a slightly stale <head> is harmless.
        res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=86400');
        res.statusCode = 200;
        res.end(html);
    } catch (err) {
        try {
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.statusCode = 200;
            res.end(baseHtml || getBaseHtml());
        } catch (_) {
            res.statusCode = 500;
            res.end('Internal Server Error');
        }
    }
};
