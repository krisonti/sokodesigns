/**
 * Client portal data (/client/<boardId>-<code>/).
 *
 *   GET /.netlify/functions/portal?t=<boardId>-<code>  ->  client-safe JSON for that project
 *
 * Reads the "Client Portal" group on that project board. The link only works when the
 * group's Portal row has Status "Live" and its Client Link holds exactly this code.
 * Setting Portal to "Create link" again makes a new code, so the old link stops working.
 * Every miss (bad code, wrong board, Portal not Live) returns the same 404.
 *
 * What the page gets is built in clientView() in ../portal-lib.js. That is an allowlist.
 *
 * Env vars: MONDAY_API_TOKEN (required)
 */

const crypto = require("crypto");
const lib = require("../portal-lib.js");

const TOKEN_RE = /^(\d{5,20})-[A-Za-z0-9_-]{43}$/;
const CACHE_MS = 60 * 1000;
const cache = new Map(); // token -> { at, status, body }

exports.handler = async function (event) {
  if (event.httpMethod !== "GET") return send(405, { error: "method_not_allowed" });
  const token = String((event.queryStringParameters || {}).t || "");
  const m = TOKEN_RE.exec(token);
  if (!m) return send(404, { error: "not_found" });

  const hit = cache.get(token);
  if (hit && Date.now() - hit.at < CACHE_MS) return send(hit.status, hit.body);

  try {
    const portal = await lib.readPortal(m[1]);
    let result = { status: 404, body: { error: "not_found" } };
    if (portal) {
      const c = lib.classify(portal);
      const row = c.portalRow;
      const saved = row ? lib.tokenFromLink(row.link) : null;
      const live = row && lib.lower(row.status) === lib.lower(lib.LABELS.live);
      if (live && saved && safeEqual(saved, token)) result = { status: 200, body: lib.clientView(portal, c) };
    }
    remember(token, result);
    return send(result.status, result.body);
  } catch (err) {
    console.error("portal error:", err && err.message);
    return send(502, { error: "unavailable" });
  }
};

function safeEqual(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

function remember(token, result) {
  if (cache.size > 500) cache.clear();
  cache.set(token, { at: Date.now(), ...result });
}

function send(status, body) {
  return {
    statusCode: status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow",
      "Referrer-Policy": "no-referrer",
    },
    body: JSON.stringify(body),
  };
}
