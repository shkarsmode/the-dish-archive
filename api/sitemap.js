// Dynamic /sitemap.xml — lists the home page plus every published + public
// recipe (anon RLS guarantees nothing private leaks in).

'use strict';

const { siteUrlFromReq, fetchPublicDishes, escapeHtml } = require('./_lib/ssr');

module.exports = async (req, res) => {
    try {
        const siteUrl = siteUrlFromReq(req);
        const dishes = await fetchPublicDishes();

        const entries = [
            { loc: `${siteUrl}/`, lastmod: null, priority: '1.0' },
            ...dishes.map((dish) => ({
                loc: `${siteUrl}/dish/${dish.slug}`,
                lastmod: dish.updatedAt ? new Date(dish.updatedAt).toISOString() : null,
                priority: '0.8',
            })),
        ];

        const body = entries
            .map((entry) => {
                const lastmod = entry.lastmod ? `\n    <lastmod>${entry.lastmod}</lastmod>` : '';
                return (
                    '  <url>\n' +
                    `    <loc>${escapeHtml(entry.loc)}</loc>${lastmod}\n` +
                    `    <changefreq>weekly</changefreq>\n` +
                    `    <priority>${entry.priority}</priority>\n` +
                    '  </url>'
                );
            })
            .join('\n');

        const xml =
            '<?xml version="1.0" encoding="UTF-8"?>\n' +
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
            body +
            '\n</urlset>\n';

        res.setHeader('Content-Type', 'application/xml; charset=utf-8');
        res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
        res.statusCode = 200;
        res.end(xml);
    } catch (err) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/xml; charset=utf-8');
        res.end('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
    }
};
