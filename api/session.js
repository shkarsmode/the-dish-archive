// Keeps a copy of the sign-in token in a first-party, httpOnly cookie of this site.
// The SPA keeps the token in localStorage and the API sets its own cookie, but Safari
// erases localStorage after 7 days without a visit and never sends the API's cookie
// (the API is a different site). A cookie set by this site's own server survives
// both, so the SPA restores the session from here instead of showing the login page.
// GET returns the copy, POST {token} saves it, DELETE forgets it.

'use strict';

const TOKEN_COOKIE = 'dish_token';
// Readable flag next to the httpOnly copy, so only signed-in visitors ask for it.
const FLAG_COOKIE = 'dish_signed_in';
// Same lifetime as the API's session (SESSION_TTL_DAYS in the backend).
const MAX_AGE_SECONDS = 180 * 24 * 60 * 60;
const JWT = /^[\w-]+\.[\w-]+\.[\w-]+$/;

function readCookie(req, name) {
    for (const part of String(req.headers.cookie || '').split(';')) {
        const index = part.indexOf('=');
        if (index > 0 && part.slice(0, index).trim() === name) return part.slice(index + 1).trim();
    }
    return null;
}

function sessionCookies(token) {
    const maxAge = token ? MAX_AGE_SECONDS : 0;
    return [
        `${TOKEN_COOKIE}=${token || ''}; Path=/api/session; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Strict`,
        `${FLAG_COOKIE}=${token ? '1' : ''}; Path=/; Max-Age=${maxAge}; Secure; SameSite=Lax`,
    ];
}

// Only the SPA itself may read or replace the copy: no cross-site reads, no login CSRF.
function fromThisSite(req) {
    const site = req.headers['sec-fetch-site'];
    if (site) return site === 'same-origin';
    const origin = req.headers.origin;
    return !origin || origin === `https://${req.headers.host}`;
}

async function readToken(req) {
    try {
        let body = req.body;
        if (body === undefined) {
            const chunks = [];
            for await (const chunk of req) chunks.push(chunk);
            body = Buffer.concat(chunks).toString('utf8');
        }
        if (Buffer.isBuffer(body)) body = body.toString('utf8');
        if (typeof body === 'string') body = JSON.parse(body || '{}');
        const token = body && typeof body.token === 'string' ? body.token : '';
        return token.length <= 4096 && JWT.test(token) ? token : null;
    } catch {
        return null;
    }
}

module.exports = async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    if (!fromThisSite(req)) {
        res.statusCode = 403;
        return res.end();
    }

    if (req.method === 'GET') {
        const token = readCookie(req, TOKEN_COOKIE);
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.statusCode = 200;
        return res.end(JSON.stringify({ token: token && JWT.test(token) ? token : null }));
    }
    if (req.method === 'POST') {
        const token = await readToken(req);
        if (!token) {
            res.statusCode = 400;
            return res.end();
        }
        res.setHeader('Set-Cookie', sessionCookies(token));
        res.statusCode = 204;
        return res.end();
    }
    if (req.method === 'DELETE') {
        res.setHeader('Set-Cookie', sessionCookies(null));
        res.statusCode = 204;
        return res.end();
    }

    res.setHeader('Allow', 'GET, POST, DELETE');
    res.statusCode = 405;
    return res.end();
};
