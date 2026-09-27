/**
 * Client finish selections (/selections) — backend.
 *
 * Every client is one row on the Monday "Client Selections" board. Their private link is
 *   https://www.sokodesigns.com/selections/?id=<monday item id>&k=<key>
 * where key = HMAC(item id). Nobody can open another client's page without the key.
 *
 * Actions:
 *   GET  ?action=catalog              -> the three catalog tabs (CSV text) from the Google Sheet
 *   GET  ?action=load&id=&k=          -> client name/address/type + saved picks
 *   POST {action:"save",   id,k,state}
 *   POST {action:"submit", id,k,state,signature,summary:[{section,title,choice,note}]}
 *   POST from a Monday webhook (item created) -> writes the Client Link onto the new row
 *
 * Env vars:
 *   MONDAY_API_TOKEN     = required
 *   SELECTIONS_SECRET    = optional; key for the link signature (falls back to the Monday token)
 *   RESEND_API_KEY       = optional; skips the confirmation emails if absent
 *   FROM_EMAIL           = optional
 *   LEAD_NOTIFY_EMAIL    = optional; gets a copy of every submission
 */

const crypto = require("crypto");

const MONDAY_API_URL = "https://api.monday.com/v2";
const BOARD_ID = "18432870755"; // "Client Selections"
// New client links point at the SOKO Development site. The same link also works on
// www.sokodesigns.com/selections (same page, same key).
const SITE = "https://sokodevelopmentaz.com";
const ALLOWED_ORIGINS = ["https://sokodevelopmentaz.com", "https://www.sokodevelopmentaz.com", "https://www.sokodesigns.com", "https://sokodesigns.com"];
let corsOrigin = ""; // set per request
const DEFAULT_FROM = "SOKO Designs <kris@sokodesigns.com>";
const DEFAULT_NOTIFY = "kris@sokodesigns.com";

// Google Sheet the catalog is edited in. Must be shared "Anyone with the link can view".
// Leave blank to use the copy in /selections/data/.
const SHEET_ID = "1PGV17oz6L6XyXOCu5GNY3E6_45dghybXSfSHeDnJom8";
const SHEET_TABS = ["Categories", "Options", "Packages"];

const COL = {
  address: "address", email: "client_email", type: "project_type2", status: "sel_status",
  link: "client_link", signed: "signed_by", submitted: "submitted_on", summary: "summary",
  data: ["data_1", "data_2", "data_3"],
};
const CHUNK = 1900; // Monday long-text columns cap out around 2,000 characters

exports.handler = async function (event) {
  const origin = (event.headers && (event.headers.origin || event.headers.Origin)) || "";
  corsOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : "";
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors({}), body: "" };
  try {
    if (event.httpMethod === "GET") {
      const q = event.queryStringParameters || {};
      if (q.action === "catalog") return await catalog();
      if (q.action === "load") return await load(q.id, q.k);
      return json(400, { error: "Unknown action" });
    }
    if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

    let body;
    try { body = JSON.parse(event.body || "{}"); } catch { return json(400, { error: "Bad JSON" }); }

    if (body.challenge) return json(200, { challenge: body.challenge }); // Monday webhook handshake
    if (body.event) return await onMondayEvent(body.event);
    if (body.action === "save") return await save(body);
    if (body.action === "submit") return await submit(body);
    return json(400, { error: "Unknown action" });
  } catch (err) {
    console.error("selections error:", err);
    return json(500, { error: "Something went wrong" });
  }
};

// ---------- catalog ----------

async function catalog() {
  if (!SHEET_ID) return json(404, { error: "No sheet configured" });
  const tabs = {};
  for (const tab of SHEET_TABS) {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tab)}`;
    const res = await fetch(url);
    const text = await res.text();
    if (!res.ok || text.trim().startsWith("<")) return json(502, { error: `Could not read the ${tab} tab` });
    tabs[tab] = text;
  }
  return { statusCode: 200, headers: cors({ "Content-Type": "application/json", "Cache-Control": "public, max-age=60" }), body: JSON.stringify(tabs) };
}

// ---------- client page ----------

async function load(id, k) {
  if (!validKey(id, k)) return json(403, { error: "This link isn't valid. Please check with SOKO Designs." });
  const item = await getItem(id);
  if (!item) return json(404, { error: "We couldn't find your selections. Please check with SOKO Designs." });
  return json(200, clientView(item));
}

async function save({ id, k, state }) {
  if (!validKey(id, k)) return json(403, { error: "Invalid link" });
  const item = await getItem(id);
  if (!item) return json(404, { error: "Not found" });
  if (item.status === "Submitted") return json(409, { error: "Your selections were already submitted.", locked: true });

  const cols = dataColumns(state);
  if (!cols) return json(413, { error: "Your notes are too long to save. Please shorten them." });
  if (item.status !== "In Progress") cols[COL.status] = { label: "In Progress" };
  await setColumns(id, cols);
  return json(200, { ok: true });
}

async function submit({ id, k, state, signature, summary, site }) {
  if (!validKey(id, k)) return json(403, { error: "Invalid link" });
  const name = String(signature || "").trim().slice(0, 120);
  if (!name) return json(400, { error: "Please type your name to sign." });
  const item = await getItem(id);
  if (!item) return json(404, { error: "Not found" });
  if (item.status === "Submitted") return json(409, { error: "Your selections were already submitted.", locked: true });

  const cols = dataColumns({ ...state, signedBy: name, submittedAt: new Date().toISOString() });
  if (!cols) return json(413, { error: "Your notes are too long to save. Please shorten them." });
  const rows = Array.isArray(summary) ? summary.slice(0, 80) : [];
  const text = rows.map((r) => `${r.title}: ${r.choice}${r.note ? ` (${r.note})` : ""}`).join("\n");

  cols[COL.status] = { label: "Submitted" };
  cols[COL.signed] = name;
  cols[COL.submitted] = { date: new Date().toLocaleDateString("en-CA", { timeZone: "America/Phoenix" }) };
  cols[COL.summary] = { text: text.slice(0, CHUNK) };
  await setColumns(id, cols);

  // The full list also goes in as an update, so nothing is cut off by the column limit.
  await mondayGraphql(
    `mutation ($id: ID!, $body: String!) { create_update (item_id: $id, body: $body) { id } }`,
    { id: String(id), body: `<p><b>Selections submitted and signed by ${esc(name)}</b></p>${summaryHtml(rows)}` });

  await emailConfirmation(item, name, rows, site === "development" ? "SOKO Development" : "SOKO Designs");
  return json(200, { ok: true });
}

// ---------- Monday webhook: new row -> fill in the client's private link ----------

async function onMondayEvent(ev) {
  if (String(ev.boardId) !== BOARD_ID || !ev.pulseId) return json(200, { ignored: true });
  if (ev.type !== "create_pulse" && ev.type !== "create_item") return json(200, { ignored: true });
  await setColumns(ev.pulseId, {
    [COL.link]: { url: linkFor(ev.pulseId), text: "Open selections" },
    [COL.status]: { label: "Not Started" },
  });
  return json(200, { ok: true });
}

// ---------- helpers ----------

function keyFor(id) {
  const secret = process.env.SELECTIONS_SECRET || process.env.MONDAY_API_TOKEN || "";
  return crypto.createHmac("sha256", secret).update(`selections:${id}`).digest("hex").slice(0, 16);
}

function validKey(id, k) {
  if (!/^\d{5,20}$/.test(String(id || "")) || typeof k !== "string" || k.length !== 16) return false;
  return crypto.timingSafeEqual(Buffer.from(keyFor(id)), Buffer.from(k));
}

function linkFor(id) {
  return `${SITE}/selections/?id=${id}&k=${keyFor(id)}`;
}

async function getItem(id) {
  const out = await mondayGraphql(
    `query ($id: [ID!]) { items (ids: $id) { id name board { id } column_values { id text } } }`,
    { id: [String(id)] });
  const item = out && out.data && out.data.items && out.data.items[0];
  if (!item || String(item.board.id) !== BOARD_ID) return null;
  const v = Object.fromEntries(item.column_values.map((c) => [c.id, c.text || ""]));
  let state = null;
  const raw = COL.data.map((c) => v[c] || "").join("");
  if (raw) { try { state = JSON.parse(raw); } catch { state = null; } }
  return {
    id: item.id, name: item.name, address: v[COL.address], email: v[COL.email],
    projectType: v[COL.type], status: v[COL.status], state,
  };
}

function clientView(item) {
  return {
    name: item.name, address: item.address, projectType: item.projectType || "New Build",
    locked: item.status === "Submitted", state: item.state,
  };
}

// Spread the saved picks across the three data columns. Returns null if it won't fit.
function dataColumns(state) {
  const raw = JSON.stringify(state || {});
  if (raw.length > CHUNK * COL.data.length) return null;
  const cols = {};
  COL.data.forEach((c, i) => { cols[c] = { text: raw.slice(i * CHUNK, (i + 1) * CHUNK) }; });
  return cols;
}

async function setColumns(id, values) {
  const out = await mondayGraphql(
    `mutation ($board: ID!, $id: ID!, $vals: JSON!) {
       change_multiple_column_values (board_id: $board, item_id: $id, column_values: $vals) { id }
     }`,
    { board: BOARD_ID, id: String(id), vals: JSON.stringify(values) });
  if (out && out.errors) throw new Error("Monday update failed: " + JSON.stringify(out.errors).slice(0, 300));
}

async function mondayGraphql(query, variables) {
  const token = process.env.MONDAY_API_TOKEN;
  if (!token) throw new Error("Missing MONDAY_API_TOKEN");
  const res = await fetch(MONDAY_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: token, "API-Version": "2024-10" },
    body: JSON.stringify({ query, variables }),
  });
  return res.json();
}

function summaryHtml(rows) {
  let html = "", section = "";
  for (const r of rows) {
    if (r.section !== section) { section = r.section; html += `<h3 style="font-size:15px;margin:18px 0 6px;color:#4A7C7E">${esc(section)}</h3>`; }
    html += `<p style="margin:3px 0"><b>${esc(r.title)}:</b> ${esc(r.choice)}${r.note ? ` <i style="color:#5B5B57">(${esc(r.note)})</i>` : ""}</p>`;
  }
  return html;
}

async function emailConfirmation(item, name, rows, brand) {
  const key = process.env.RESEND_API_KEY;
  if (!key) { console.error("Missing RESEND_API_KEY — skipping selections email"); return; }
  const to = [process.env.LEAD_NOTIFY_EMAIL || DEFAULT_NOTIFY];
  if (item.email) to.push(item.email);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      from: (process.env.FROM_EMAIL || DEFAULT_FROM).replace(/^[^<]*</, `${brand} <`),
      to,
      subject: `Finish selections — ${item.name}${item.address ? `, ${item.address}` : ""}`,
      html: `<div style="font-family:system-ui,Arial,sans-serif;font-size:15px;color:#1A1A1A;max-width:620px">
        <h2 style="font-family:Georgia,serif;font-size:24px;margin:0 0 6px">Your finish selections</h2>
        <p style="margin:0 0 4px;color:#5B5B57">${esc(item.name)}${item.address ? ` · ${esc(item.address)}` : ""}</p>
        <p style="margin:0 0 16px;color:#5B5B57">Signed by ${esc(name)} on ${new Date().toLocaleDateString("en-US", { timeZone: "America/Phoenix" })}</p>
        ${summaryHtml(rows)}
        <p style="margin-top:22px;color:#5B5B57;font-size:13px">Need to change something? Just reply to this email. Changes after submitting may be handled as a change order.</p>
      </div>`,
    }),
  });
  if (!res.ok) console.error("Resend error:", res.status, (await res.text()).slice(0, 220));
}

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

function cors(headers) {
  if (!corsOrigin) return headers;
  return { ...headers, "Access-Control-Allow-Origin": corsOrigin, "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", Vary: "Origin" };
}

function json(statusCode, body) {
  return { statusCode, headers: cors({ "Content-Type": "application/json" }), body: JSON.stringify(body) };
}
