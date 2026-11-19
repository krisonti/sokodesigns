/**
 * Client portal: shared code for reading the "Client Portal" group on project boards.
 * Used by functions/portal.js (the page data) and functions/portal-sync.js (links, dates, emails).
 */

const { STAGES, NAMES, LABELS, TYPE_NAMES } = require("./portal-config.js");

const MONDAY_API_URL = "https://api.monday.com/v2";
const WORKSPACE_ID = 12225021; // Main workspace (the project boards live here)
const SITE = "https://www.sokodesigns.com";
const COL = {
  status: "status", link: "client_link", email: "client_email",
  clientName: "client_name", address: "project_address", permit: "permit_no", // on the Client Information row
};

const STAGE_KEYS = Object.keys(STAGES);
const lower = (s) => String(s || "").trim().toLowerCase();
const isStageName = (name) => STAGE_KEYS.some((k) => lower(k) === lower(name));
const stageKey = (name) => STAGE_KEYS.find((k) => lower(k) === lower(name));

// ---------- Monday ----------

async function monday(query, variables) {
  const key = process.env.MONDAY_API_TOKEN;
  if (!key) throw new Error("Missing MONDAY_API_TOKEN");
  const res = await fetch(MONDAY_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: key, "API-Version": "2024-10" },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error("Monday HTTP " + res.status);
  const out = await res.json();
  if (out.errors) throw new Error("Monday: " + JSON.stringify(out.errors).slice(0, 300));
  return out.data;
}

const ITEM_FIELDS = `id name created_at updated_at
  column_values { id type text value column { title } }
  updates (limit: 25) { text_body created_at }
  subitems { id name board { id } column_values (ids: ["status", "client_link", "sent_to_client"]) { id type text value } }`;

const isDriveUrl = (u) => /^https:\/\/(drive|docs)\.google\.com\/\S+$/i.test(u || "");

// Every board in the workspace that has a "Client Portal" group (templates left out).
async function listPortalBoards() {
  const found = [];
  for (let page = 1; page <= 10; page++) {
    const data = await monday(
      `query ($ws: [ID!], $page: Int!) { boards (workspace_ids: $ws, state: active, limit: 100, page: $page) {
         id name type groups { id title } } }`,
      { ws: [WORKSPACE_ID], page });
    const boards = (data.boards || []).filter((b) => b.type === "board");
    for (const b of boards) {
      if (/template/i.test(b.name)) continue;
      const g = (b.groups || []).find((x) => lower(x.title) === lower(NAMES.group));
      if (g) found.push({ boardId: String(b.id), boardName: b.name, groupId: g.id });
    }
    if ((data.boards || []).length < 100) break;
  }
  return found;
}

// Reads the Client Portal group of one board. Returns null when the board has none.
async function readPortal(boardId) {
  const meta = await monday(
    `query ($id: [ID!]) { boards (ids: $id) { id name groups { id title } } }`, { id: [String(boardId)] });
  const board = meta.boards && meta.boards[0];
  if (!board) return null;
  const group = (board.groups || []).find((g) => lower(g.title) === lower(NAMES.group));
  if (!group) return null;
  const data = await monday(
    `query ($id: [ID!], $g: [String], $info: CompareValue!) { boards (ids: $id) { groups (ids: $g) {
       items_page (limit: 200) { items { ${ITEM_FIELDS} } } } ${INFO_PAGE} } }`,
    { id: [String(boardId)], g: [group.id], info: [NAMES.info] });
  const b = data.boards[0] || {};
  const items = ((b.groups || [])[0] || {}).items_page;
  return { boardId: String(board.id), boardName: board.name, groupId: group.id, items: ((items && items.items) || []).map(parseItem), info: pickInfo(b) };
}

// Reads the Client Portal groups of many boards at once (from listPortalBoards()).
async function readPortals(list) {
  const out = [];
  for (let i = 0; i < list.length; i += 25) {
    const chunk = list.slice(i, i + 25);
    const data = await monday(
      `query ($ids: [ID!], $g: [String], $info: CompareValue!) { boards (ids: $ids) { id name groups (ids: $g) {
         id title items_page (limit: 200) { items { ${ITEM_FIELDS} } } } ${INFO_PAGE} } }`,
      { ids: chunk.map((b) => b.boardId), g: chunk.map((b) => b.groupId), info: [NAMES.info] });
    for (const b of data.boards || []) {
      const want = chunk.find((x) => x.boardId === String(b.id));
      const g = (b.groups || []).find((x) => want && x.id === want.groupId);
      if (!g) continue;
      out.push({ boardId: String(b.id), boardName: b.name, groupId: g.id, items: ((g.items_page && g.items_page.items) || []).map(parseItem), info: pickInfo(b) });
    }
  }
  return out;
}

// The "Client Information" row (under Sales) holds the client's name, address, email and permit #.
const INFO_PAGE = `info: items_page (limit: 5, query_params: { rules: [{ column_id: "name", compare_value: $info, operator: contains_text }] }) {
  items { id name created_at updated_at column_values (ids: ["${COL.clientName}", "${COL.address}", "${COL.permit}", "${COL.email}"]) { id type text value column { title } } } }`;

function pickInfo(board) {
  const rows = (board.info && board.info.items) || [];
  const row = rows.find((r) => lower(r.name) === lower(NAMES.info));
  return row ? parseItem(row) : null;
}

function parseItem(it) {
  const cv = it.column_values || [];
  const byId = (id) => cv.find((c) => c.id === id);
  const status = byId(COL.status);
  let statusChangedAt = null;
  try { statusChangedAt = status && status.value ? JSON.parse(status.value).changed_at || null : null; } catch { /* ignore */ }
  const completion = cv.find((c) => c.type === "date" && (c.id === "date" || lower(c.column && c.column.title) === "completion date"));
  const timeline = cv.find((c) => c.type === "timeline");
  let timelineTo = null;
  try { timelineTo = timeline && timeline.value ? JSON.parse(timeline.value).to || null : null; } catch { /* ignore */ }
  let link = null;
  try { const v = JSON.parse((byId(COL.link) || {}).value || "null"); link = v && v.url ? String(v.url).trim() : null; } catch { /* ignore */ }
  let email = null;
  try { const v = JSON.parse((byId(COL.email) || {}).value || "null"); email = v && v.email ? String(v.email).trim() : null; } catch { /* ignore */ }
  return {
    id: String(it.id),
    name: (it.name || "").trim(),
    createdAt: it.created_at,
    updatedAt: it.updated_at,
    status: status && status.text ? status.text.trim() : "",
    statusChangedAt,
    completionCol: completion ? completion.id : null,
    completion: toDate(completion && completion.text),
    target: toDate(timelineTo),
    link,
    email,
    clientName: ((byId(COL.clientName) || {}).text || "").trim(),
    address: ((byId(COL.address) || {}).text || "").trim(),
    permit: ((byId(COL.permit) || {}).text || "").trim(),
    updates: it.updates || [],
    subitems: (it.subitems || []).map(parseSubitem),
  };
}

// A version under a stage row (e.g. "v2" under Concept, "60CD" under Building Plans)
function parseSubitem(s) {
  const cv = s.column_values || [];
  const byId = (id) => cv.find((c) => c.id === id) || {};
  let link = null;
  try { const v = JSON.parse(byId("client_link").value || "null"); link = v && v.url ? String(v.url).trim() : null; } catch { /* ignore */ }
  return {
    id: String(s.id),
    boardId: s.board ? String(s.board.id) : null,
    name: (s.name || "").trim(),
    status: (byId("status").text || "").trim(),
    link,
    sent: toDate(byId("sent_to_client").text),
  };
}

// Versions the client can see: subitems of a stage row that have a Google Drive link
function versionsOf(stageRow) {
  return (stageRow.subitems || []).filter((v) => v.name && isDriveUrl(v.link));
}

// ---------- understanding the group ----------

function classify(portal) {
  const items = portal.items;
  const portalRow = items.find((i) => lower(i.name) === lower(NAMES.portal)) || null;
  const updatesRow = items.find((i) => lower(i.name) === lower(NAMES.updates)) || null;
  const special = new Set([portalRow, updatesRow].filter(Boolean).map((i) => i.id));
  const stages = items.filter((i) => !special.has(i.id) && isStageName(i.name));
  const others = items.filter((i) => !special.has(i.id) && !isStageName(i.name));
  return {
    portalRow, updatesRow, stages,
    // Where portal emails go: Client Email on the Client Information row (Portal row as a fallback)
    email: (portal.info && portal.info.email) || (portalRow && portalRow.email) || null,
    todos: others.filter((i) => lower(i.status) === lower(LABELS.todo)),
    docs: others.filter((i) => lower(i.status) === lower(LABELS.doc)),
  };
}

// The token in a Portal row's Client Link: /client/<boardId>-<random>/
function tokenFromLink(url) {
  const m = /\/client\/(\d{5,20}-[A-Za-z0-9_-]{43})\/?$/.exec(String(url || ""));
  return m ? m[1] : null;
}

function linkFor(boardId, random) {
  return `${SITE}/client/${boardId}-${random}/`;
}

// Stage list in board order. N/A rows are left out. First stage not Done is the current one.
function timeline(c, today) {
  const rows = c.stages.filter((s) => lower(s.status) !== lower(LABELS.skip));
  let currentFound = false;
  return rows.map((s) => {
    const done = lower(s.status) === lower(LABELS.done);
    let status;
    if (done) status = "done";
    else if (!currentFound) { status = "current"; currentFound = true; }
    else status = "upcoming";
    const actual = done ? (s.completion || phoenixDate(s.statusChangedAt)) : null;
    let flag = null, daysLate = null;
    if (done && s.target && actual) { daysLate = dayDiff(s.target, actual); flag = daysLate > 0 ? "late" : "on"; }
    else if (status === "current" && s.target) flag = today > s.target ? "behind" : "on";
    const versions = versionsOf(s).map((v) => ({
      name: v.name.slice(0, 120), url: v.link, date: v.sent, done: lower(v.status) === lower(LABELS.done),
    }));
    return { name: stageKey(s.name) || s.name, status, target: s.target, actual, flag, daysLate: flag === "late" ? daysLate : null, versions };
  });
}

// What the page gets. This is the allowlist: nothing else from Monday leaves the server.
function clientView(portal, c) {
  const today = phoenixToday();
  const tl = timeline(c, today);
  const current = tl.find((s) => s.status === "current") || null;
  const allDone = tl.length > 0 && !current;
  const info = current ? STAGES[current.name] : (allDone ? STAGES[tl[tl.length - 1].name] : null);
  const names = parseBoardName(portal.boardName);
  const ci = portal.info || {}; // Client Information row

  const updates = (c.updatesRow ? c.updatesRow.updates : [])
    .slice()
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .map((u) => ({ date: phoenixDate(u.created_at), text: String(u.text_body || "").trim() }))
    .filter((u) => u.text)
    .slice(0, 25);

  const touched = portal.items.map((i) => phoenixDate(i.updatedAt)).concat(updates.map((u) => u.date)).filter(Boolean).sort();

  return {
    // The Client Information row (under Sales) wins; the board name ("RR - 123 Main - Smith") is the fallback
    client: ci.clientName || names.client,
    address: ci.address || names.address,
    projectType: typeName(names.type),
    permit: ci.permit || null,
    // Target date of the last stage that has one, until every stage is done
    estimatedCompletion: allDone ? null : (tl.map((s) => s.target).filter(Boolean).pop() || null),
    updated: touched.pop() || null,
    stage: current || allDone ? {
      name: current ? current.name : tl[tl.length - 1].name,
      complete: allDone,
      summary: info ? info.summary : null,
      next: allDone ? null : (info ? info.next : null),
      target: current ? current.target : null,
      flag: current ? current.flag : null,
    } : null,
    // Versions not yet marked Done are waiting on the client's review, then the regular to-dos
    todo: tl.flatMap((s) => s.versions.filter((v) => !v.done).map((v) => ({ text: `Review ${s.name}: ${v.name}`, url: v.url })))
      .concat(c.todos.map((t) => ({ text: t.name.slice(0, 300), url: /^https:\/\/\S+$/i.test(t.link || "") ? t.link : null }))),
    timeline: tl,
    documents: c.docs
      .filter((d) => isDriveUrl(d.link))
      .map((d) => ({ label: d.name.slice(0, 200), url: d.link })),
    updates,
  };
}

// "TI - 745 W Baseline - Josh" -> { type: "TI", address: "745 W Baseline", client: "Josh" }
function parseBoardName(name) {
  let rest = String(name || "").trim();
  let type = null;
  // Type code, possibly combined: "RR", "RR/ADU"
  const m = /^([A-Z]{2,5}(?:\s*\/\s*[A-Z]{2,5})*)\s*-\s*/.exec(rest);
  if (m) { type = m[1].replace(/\s+/g, ""); rest = rest.slice(m[0].length); }
  const parts = rest.split(/\s+-\s*|\s*-\s+/).map((s) => s.trim()).filter(Boolean);
  return {
    type,
    address: parts[0] || null,
    client: parts.length > 1 ? parts[parts.length - 1] : null,
  };
}

// "RR/ADU" -> "Residential remodel and ADU". Unknown codes are left off.
function typeName(code) {
  if (!code) return null;
  const names = code.split("/").map((c) => TYPE_NAMES[c]).filter(Boolean);
  if (!names.length) return null;
  return names.map((n, i) => (i === 0 || n === "ADU" ? n : n.toLowerCase())).join(" and ");
}

// ---------- dates ----------

function toDate(text) {
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(String(text || ""));
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
function phoenixToday() { return phoenixDate(new Date().toISOString()); }

module.exports = {
  SITE, COL, LABELS, NAMES, STAGES,
  monday, listPortalBoards, readPortal, readPortals, parseItem, classify, timeline, clientView, versionsOf, stageName: (n) => stageKey(n) || n,
  tokenFromLink, linkFor, parseBoardName, phoenixDate, phoenixToday, lower,
};
