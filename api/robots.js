// Dynamic /robots.txt — allows crawling of the catalog + recipe pages, keeps
// bots out of auth/admin/editor routes, and points at the sitemap on the same
// host (so it's correct across preview + production deployments).

'use strict';

const { siteUrlFromReq } = require('./_lib/ssr');

module.exports = (req, res) => {
    const siteUrl = siteUrlFromReq(req);
    const body = [
        'User-agent: *',
        'Allow: /',
        'Disallow: /login',
        'Disallow: /access-pending',
        'Disallow: /admin',
        'Disallow: /recipes/',
        'Disallow: /family/',
        '',
        `Sitemap: ${siteUrl}/sitemap.xml`,
        '',
    ].join('\n');

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    res.statusCode = 200;
    res.end(body);
};
