/**
 * Generic lead capture for the SOKO Designs landing pages and the homepage form.
 *
 * Unlike qualify.js (which also generates an AI ADU feasibility report), this
 * just captures the lead: Monday item first, then an email notification.
 *
 * Posting bodies may set `destination` to pick the board:
 *   "leads" -> Leads Board 18405787313   (homepage "Start a Project")
 *   default -> ADU Investor 18416938131  (permit-plans, tenant-improvements)
 *
 * Env vars (same ones qualify.js already uses):
 *   MONDAY_API_TOKEN       = required
 *   MONDAY_BOARD_ID        = optional; overrides the default destination only
 *   MONDAY_LEADS_BOARD_ID  = optional; overrides the "leads" destination
 *   RESEND_API_KEY         = optional; skips the notification email if absent
 *   FROM_EMAIL             = optional; defaults below
 *   LEAD_NOTIFY_EMAIL      = optional; defaults below
 */

const MONDAY_API_URL = "https://api.monday.com/v2";
const DEFAULT_BOARD_ID = "18416938131";
const LEADS_BOARD_ID = "18405787313";
const DEFAULT_FROM = "SOKO Designs <kris@sokodesigns.com>";
const DEFAULT_NOTIFY = "kris@sokodesigns.com";

// Board 18416938131 "ADU Investor"
const VALID_PROJECT_TYPES = ["Remodel", "Room Addition", "ADU", "Guest House", "Other"];
const VALID_LEAD_SOURCES = ["CA Investor","Mesa Parent","Direct Mail","Paid Ad - Meta","Paid Ad - Google","Referral","Other"];

// Board 18405787313 "Leads Board" — the homepage form's destination.
//   status = Type of Project, color_mkvp1w7z = Source,
//   phone_mkvp1jym, email_mkvpa8za, text_mm235c85 = Business Name,
//   location_mkvhra73 = Location (written separately; see createMondayLead)
const LEADS_PROJECT_TYPES = [
  "Res Remodel","Res New Build","Res Addition","Patio/Az Room","Garage/Patio","ADU",
  "Tenant Improvement","Commercial NB","Demo Permit","Zoning","Site Plan","Multifamily",
  "Civil","Construction Bid","Group Home","Project Mgt","New Build",
];

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed." });

  let data;
  try { data = JSON.parse(event.body || "{}"); }
  catch { return json(400, { error: "Invalid submission." }); }

  // Honeypot — bots fill this hidden field, humans never see it.
  if (data.company) return json(200, { ok: true });

  const lead = {
    name:        (data.name || "").trim(),
    email:       (data.email || "").trim(),
    phone:       (data.phone || "").trim(),
    address:     (data.address || "").trim(),
    details:     (data.details || "").trim(),
    scope:       (data.scope || "").trim(),
    timing:      (data.timing || "").trim(),
    source:      (data.source || "").trim(),
    projectType: (data.projectType || "").trim(),
    leadSource:  (data.leadSource || "").trim(),
    business:    (data.business || "").trim(),
    destination: data.destination === "leads" ? "leads" : "default",
  };

  if (!lead.name || !lead.email || !lead.phone) {
    return json(400, { error: "Name, email, and phone are required." });
  }

  let mondayOk = false;
  try { mondayOk = await createMondayLead(lead); }
  catch (err) { console.error("Monday error:", err && err.message); }

  let notified = false;
  try { notified = await notify(lead); }
  catch (err) { console.error("Notify error:", err && err.message); }

  return json(200, { ok: mondayOk || notified, mondayOk, notified });
};

async function createMondayLead(lead) {
  const token = process.env.MONDAY_API_TOKEN;
  if (!token) { console.error("Missing MONDAY_API_TOKEN"); return false; }

  const toLeads = lead.destination === "leads";
  const boardId = toLeads
    ? (process.env.MONDAY_LEADS_BOARD_ID || LEADS_BOARD_ID)
    : (process.env.MONDAY_BOARD_ID || DEFAULT_BOARD_ID);

  const today = new Date().toISOString().slice(0, 10);
  const columnValues = toLeads
    ? leadsBoardColumns(lead, today)
    : aduBoardColumns(lead, today);

  const itemId = await mondayCreateItem(token, boardId, `${lead.name} — ${lead.phone}`, columnValues);
  if (!itemId) return false;

  // Monday's location column wants lat/lng alongside the label, and a bare
  // address can fail the whole mutation — which would lose the lead. So it is
  // set after the item exists, best effort, and never blocks the capture.
  if (toLeads && lead.address) {
    try {
      await mondaySetColumn(token, boardId, itemId, "location_mkvhra73", { address: lead.address });
    } catch (err) { console.error("Location column skipped:", err && err.message); }
  }

  // Everything the columns cannot hold goes in an update, so nothing is lost.
  const notes = [
    lead.source ? `Source: ${lead.source}` : null,
    lead.address ? `Location: ${lead.address}` : null,
    lead.business ? `Business: ${lead.business}` : null,
    lead.scope ? `Scope: ${lead.scope}` : null,
    lead.timing ? `Timing: ${lead.timing}` : null,
    lead.details ? `Details: ${lead.details}` : null,
    `Submitted: ${new Date().toISOString()}`,
  ].filter(Boolean).join("\n");
  try { await mondayPostUpdate(token, itemId, notes); }
  catch (err) { console.error("Update skipped:", err && err.message); }

  return true;
}

function leadsBoardColumns(lead, today) {
  const cols = {
    phone_mkvp1jym: { phone: String(lead.phone).replace(/[^\d+]/g, "").slice(0, 20), countryShortName: "US" },
    email_mkvpa8za: { email: String(lead.email).slice(0, 200), text: String(lead.email).slice(0, 200) },
    date4: { date: today },
    color_mkvp1w7z: { label: "Website" },
  };
  if (LEADS_PROJECT_TYPES.includes(lead.projectType)) cols.status = { label: lead.projectType };
  if (lead.business) cols.text_mm235c85 = String(lead.business).slice(0, 250);
  return cols;
}

function aduBoardColumns(lead, today) {
  const type = VALID_PROJECT_TYPES.includes(lead.projectType) ? lead.projectType : "Other";
  const cols = {
    text_mm2h8zc7: String(lead.phone).slice(0, 120),
    email_mm2hny1k: { email: String(lead.email).slice(0, 200), text: String(lead.email).slice(0, 200) },
    date4: { date: today },
    dropdown_mm2hbadt: { labels: [type] },
    text_mm2hg88v: [
      lead.source ? `Source: ${lead.source}` : null,
      lead.scope ? `Scope: ${lead.scope}` : null,
      lead.timing ? `Timing: ${lead.timing}` : null,
      lead.address ? `Address: ${lead.address}` : null,
      lead.details ? `Details: ${lead.details}` : null,
      `Submitted: ${new Date().toISOString()}`,
    ].filter(Boolean).join(" | ").slice(0, 2000),
  };
  if (lead.address) cols.text_mm45qcc4 = String(lead.address).slice(0, 250);
  if (lead.leadSource && VALID_LEAD_SOURCES.includes(lead.leadSource)) {
    cols.dropdown_mm45aggs = { labels: [lead.leadSource] };
  }
  return cols;
}

async function mondayGraphql(token, query, variables) {
  const res = await fetch(MONDAY_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: token, "API-Version": "2024-01" },
    body: JSON.stringify({ query, variables }),
  });
  return res.json();
}

async function mondayCreateItem(token, boardId, itemName, columnValues) {
  const out = await mondayGraphql(token,
    `mutation ($boardId: ID!, $group: String!, $itemName: String!, $cols: JSON!) {
       create_item (board_id: $boardId, group_id: $group, item_name: $itemName, column_values: $cols) { id }
     }`,
    { boardId: String(boardId), group: "topics", itemName, cols: JSON.stringify(columnValues) });
  const id = out && out.data && out.data.create_item && out.data.create_item.id;
  if (!id) { console.error("Monday create_item error:", JSON.stringify(out.errors || out)); return null; }
  return id;
}

async function mondaySetColumn(token, boardId, itemId, columnId, value) {
  const out = await mondayGraphql(token,
    `mutation ($boardId: ID!, $itemId: ID!, $columnId: String!, $value: JSON!) {
       change_column_value (board_id: $boardId, item_id: $itemId, column_id: $columnId, value: $value) { id }
     }`,
    { boardId: String(boardId), itemId: String(itemId), columnId, value: JSON.stringify(value) });
  if (out && out.errors) console.error("Monday column error:", JSON.stringify(out.errors));
}

async function mondayPostUpdate(token, itemId, body) {
  const out = await mondayGraphql(token,
    `mutation ($itemId: ID!, $body: String!) { create_update (item_id: $itemId, body: $body) { id } }`,
    { itemId: String(itemId), body });
  if (out && out.errors) console.error("Monday update error:", JSON.stringify(out.errors));
}

async function notify(lead) {
  const key = process.env.RESEND_API_KEY;
  if (!key) { console.error("Missing RESEND_API_KEY — skipping notification"); return false; }

  const rows = [
    ["Name", lead.name], ["Phone", lead.phone], ["Email", lead.email],
    ["Project type", lead.projectType], ["Location", lead.address],
    ["Business", lead.business], ["Scope", lead.scope], ["Timing", lead.timing],
    ["Details", lead.details], ["Came from", lead.source],
  ].filter(([, v]) => v)
   .map(([k, v]) => `<tr><td style="padding:6px 14px 6px 0;color:#5B5B57">${k}</td><td style="padding:6px 0"><b>${esc(v)}</b></td></tr>`)
   .join("");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      from: process.env.FROM_EMAIL || DEFAULT_FROM,
      to: [process.env.LEAD_NOTIFY_EMAIL || DEFAULT_NOTIFY],
      reply_to: lead.email,
      subject: `New lead — ${lead.name}${lead.projectType ? ` (${lead.projectType})` : ""}`,
      html: `<div style="font-family:system-ui,Arial,sans-serif;font-size:15px;color:#1A1A1A">
        <h2 style="font-size:19px;margin:0 0 14px">New lead from the website</h2>
        <table style="border-collapse:collapse">${rows}</table>
        <p style="margin-top:16px;color:#5B5B57;font-size:13px">Reply to this email to reach them directly.</p>
      </div>`,
    }),
  });
  if (!res.ok) {
    console.error("Resend error:", res.status, (await res.text()).slice(0, 220));
    return false;
  }
  return true;
}

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

function json(statusCode, body) {
  return { statusCode, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}
