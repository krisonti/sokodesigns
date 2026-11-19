/**
 * Client portal data (/client/<token>/).
 *
 *   GET /.netlify/functions/portal?t=<token>  ->  client-safe JSON for that project
 *
 * Looks up the PROJECTS board item whose "Portal Token" column matches the token and
 * whose "Portal" column is "Live". Returns ONLY the fields built in clientView() below.
 * That function is an allowlist: a field that isn't named there never leaves this file.
 * Any miss (bad token, Portal = Off, replaced token) returns the same 404.
 *
 * Env vars: MONDAY_API_TOKEN (required)
 */

const { STAGES, TYPE_NAMES } = require("../portal-config.js");

const MONDAY_API_URL = "https://api.monday.com/v2";
const BOARD_ID = "18167716329"; // PROJECTS
const COL = {
  portal: "portal_status", token: "portal_token", client: "text_mm2grp52",
  address: "location_mm2grysk", type: "color_mm00kgcd", permit: "permit_no",
  summary: "client_summary", next: "client_next_step", todo: "client_todo", docs: "client_documents",
};
const SUB = { status: "status", target: "date0", actual: "actual_date" };
const UPDATE_PREFIX = /^\s*client update\s*:\s*/i; // only updates that start with this are shown
const TOKEN_RE = /^[A-Za-z0-9_-]{32,64}$/;
const CACHE_MS = 60 * 1000;

const cache = new Map(); // token -> { at, status, body }

exports.handler = async function (event) {
  if (event.httpMethod !== "GET") return send(405, { error: "method_not_allowed" });
  const token = String((event.queryStringParameters || {}).t || "");
  if (!TOKEN_RE.test(token)) return send(404, { error: "not_found" });

  const hit = cache.get(token);
  if (hit && Date.now() - hit.at < CACHE_MS) return send(hit.status, hit.body);

  try {
    const item = await findItem(token);
    const result = item ? { status: 200, body: clientView(item) } : { status: 404, body: { error: "not_found" } };
    remember(token, result);
    return send(result.status, result.body);
  } catch (err) {
    console.error("portal error:", err && err.message);
    return send(502, { error: "unavailable" });
  }
};

// ---------- Monday ----------

async function findItem(token) {
  const out = await mondayGraphql(
    `query ($board: ID!, $col: String!, $val: String!) {
       items_page_by_column_values (board_id: $board, limit: 2,
         columns: [{ column_id: $col, column_values: [$val] }]) {
         items {
           id updated_at
           column_values (ids: ${JSON.stringify(Object.values(COL))}) { id text }
           subitems { name column_values (ids: ${JSON.stringify(Object.values(SUB))}) { id text } }
           updates (limit: 40) { text_body created_at }
         }
       }
     }`,
    { board: BOARD_ID, col: COL.token, val: token });
  if (out.errors) throw new Error("Monday query failed: " + JSON.stringify(out.errors).slice(0, 300));
  const items = (out.data && out.data.items_page_by_column_values && out.data.items_page_by_column_values.items) || [];
  // Exact match only, exactly one item, and the portal must be switched on.
  const matches = items.filter((it) => colText(it, COL.token) === token);
  if (matches.length !== 1) return null;
  const item = matches[0];
  if (colText(item, COL.portal) !== "Live") return null;
  return item;
}

async function mondayGraphql(query, variables) {
  const key = process.env.MONDAY_API_TOKEN;
  if (!key) throw new Error("Missing MONDAY_API_TOKEN");
  const res = await fetch(MONDAY_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: key, "API-Version": "2024-10" },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error("Monday HTTP " + res.status);
  return res.json();
}

// ---------- the allowlist ----------

function clientView(item) {
  const today = phoenixToday();
  const timeline = buildTimeline(item.subitems || [], today);
  const current = timeline.find((s) => s.status === "current") || null;
  const allDone = timeline.length > 0 && !current;
  const stageInfo = current ? STAGES[current.name] : (allDone ? STAGES[timeline[timeline.length - 1].name] : null);

  const updates = (item.updates || [])
    .filter((u) => UPDATE_PREFIX.test(u.text_body || ""))
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .map((u) => ({ date: phoenixDate(u.created_at), text: (u.text_body || "").replace(UPDATE_PREFIX, "").trim() }))
    .filter((u) => u.text)
    .slice(0, 25);

  const typeLabel = colText(item, COL.type);
  const lastChange = [phoenixDate(item.updated_at), ...updates.map((u) => u.date)].filter(Boolean).sort().pop() || null;

  return {
    client: colText(item, COL.client) || null,
    address: colText(item, COL.address) || null,
    projectType: TYPE_NAMES[typeLabel] || null,
    permit: colText(item, COL.permit) || null,
    updated: lastChange,
    stage: current || allDone ? {
      name: current ? current.name : timeline[timeline.length - 1].name,
      complete: allDone,
      summary: colText(item, COL.summary) || (stageInfo && stageInfo.summary) || null,
      next: allDone ? null : (colText(item, COL.next) || (stageInfo && stageInfo.next) || null),
      target: current ? current.target : null,
      flag: current ? current.flag : null,
    } : null,
    todo: parseLines(colText(item, COL.todo), /^https:\/\/\S+$/i).map(([text, url]) => ({ text, url })),
    timeline,
    documents: parseLines(colText(item, COL.docs), /^https:\/\/(drive|docs)\.google\.com\/\S+$/i)
      .filter(([, url]) => url)
      .map(([label, url]) => ({ label, url })),
    updates,
  };
}

// Stages come from the item's subitems, in board order. "Skipped" stages are left out.
// The first stage that isn't Done is the current one.
function buildTimeline(subitems, today) {
  const rows = subitems
    .map((s) => ({
      name: (s.name || "").trim(),
      state: colText(s, SUB.status),
      target: toDate(colText(s, SUB.target)),
      actual: toDate(colText(s, SUB.actual)),
    }))
    .filter((s) => s.name && s.state !== "Skipped");

  let currentFound = false;
  return rows.map((s) => {
    let status;
    if (s.state === "Done") status = "done";
    else if (!currentFound) { status = "current"; currentFound = true; }
    else status = "upcoming";

    let flag = null, daysLate = null;
    if (status === "done" && s.target && s.actual) {
      daysLate = dayDiff(s.target, s.actual);
      flag = daysLate > 0 ? "late" : "on";
    } else if (status === "current" && s.target) {
      flag = today > s.target ? "behind" : "on";
    }
    return {
      name: s.name, status, target: s.target,
      actual: status === "done" ? s.actual : null,
      flag, daysLate: flag === "late" ? daysLate : null,
    };
  });
}

// "Text | https://link" per line. Links that don't match the pattern are dropped (the text stays).
function parseLines(raw, urlPattern) {
  return String(raw || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const bar = line.lastIndexOf("|");
      let text = line, url = null;
      if (bar > -1) {
        const maybe = line.slice(bar + 1).trim();
        text = line.slice(0, bar).trim();
        if (urlPattern.test(maybe)) url = maybe;
      }
      return [text.slice(0, 300), url];
    })
    .filter(([text]) => text);
}

// ---------- helpers ----------

function colText(item, id) {
  const c = (item.column_values || []).find((v) => v.id === id);
  return c && c.text ? String(c.text).trim() : "";
}

function toDate(text) {
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(text || "");
  return m ? m[1] : null;
}

function dayDiff(a, b) {
  return Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86400000);
}

function phoenixDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d)) return null;
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Phoenix", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

function phoenixToday() {
  return phoenixDate(new Date().toISOString());
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

// Exposed for local tests only
exports._test = { clientView, buildTimeline, parseLines };
