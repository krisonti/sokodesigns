/**
 * Generic lead capture for the SOKO Designs plans-and-permits landing pages.
 *
 * Unlike qualify.js (which also generates an AI ADU feasibility report), this
 * just captures the lead: Monday item first, then an email notification.
 *
 * Env vars (same ones qualify.js already uses):
 *   MONDAY_API_TOKEN   = required
 *   MONDAY_BOARD_ID    = optional; defaults below
 *   RESEND_API_KEY     = optional; skips the notification email if absent
 *   FROM_EMAIL         = optional; defaults below
 *   LEAD_NOTIFY_EMAIL  = optional; defaults below
 */

const MONDAY_API_URL = "https://api.monday.com/v2";
const DEFAULT_BOARD_ID = "18416938131";
const DEFAULT_FROM = "SOKO Designs <kris@sokodesigns.com>";
const DEFAULT_NOTIFY = "kris@sokodesigns.com";

// Board column ids (board 18416938131 "ADU Investor"):
//   text_mm2h8zc7 = Phone, email_mm2hny1k = Email, date4 = Date,
//   dropdown_mm2hbadt = Project Type, text_mm45qcc4 = Property City/ZIP,
//   dropdown_mm45aggs = Lead Source, text_mm2hg88v = Notes/Comments,
//   location1ej8reiy = Property Address
const VALID_PROJECT_TYPES = ["Remodel", "Room Addition", "ADU", "Guest House", "Other"];
const VALID_LEAD_SOURCES = ["CA Investor","Mesa Parent","Direct Mail","Paid Ad - Meta","Paid Ad - Google","Referral","Other"];

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed." });

  let data;
  try { data = JSON.parse(event.body || "{}"); }
  catch { return json(400, { error: "Invalid submission." }); }

  // Honeypot — bots fill this hidden field, humans never see it.
  if (data.company) return json(200, { ok: true });

  const name    = (data.name || "").trim();
  const email   = (data.email || "").trim();
  const phone   = (data.phone || "").trim();
  const address = (data.address || "").trim();
  const details = (data.details || "").trim();
  const scope   = (data.scope || "").trim();        // free-text scope picked on the page
  const timing  = (data.timing || "").trim();
  const source  = (data.source || "").trim();       // which landing page
  const projectType = (data.projectType || "").trim();
  const leadSource  = (data.leadSource || "").trim();

  if (!name || !email || !phone) {
    return json(400, { error: "Name, email, and phone are required." });
  }

  let mondayOk = false;
  try {
    mondayOk = await createMondayLead({
      name, email, phone, address, details, scope, timing, source, projectType, leadSource,
    });
  } catch (err) {
    console.error("Monday error:", err && err.message);
  }

  let notified = false;
  try {
    notified = await notify({ name, email, phone, address, details, scope, timing, source, projectType });
  } catch (err) {
    console.error("Notify error:", err && err.message);
  }

  return json(200, { ok: mondayOk || notified, mondayOk, notified });
};

async function createMondayLead({ name, email, phone, address, details, scope, timing, source, projectType, leadSource }) {
  const token = process.env.MONDAY_API_TOKEN;
  const boardId = process.env.MONDAY_BOARD_ID || DEFAULT_BOARD_ID;
  if (!token) { console.error("Missing MONDAY_API_TOKEN"); return false; }

  const today = new Date().toISOString().slice(0, 10);
  const type = VALID_PROJECT_TYPES.includes(projectType) ? projectType : "Other";

  const columnValues = {
    text_mm2h8zc7: String(phone).slice(0, 120),
    email_mm2hny1k: { email: String(email).slice(0, 200), text: String(email).slice(0, 200) },
    date4: { date: today },
    dropdown_mm2hbadt: { labels: [type] },
    text_mm2hg88v: [
      source ? `Source: ${source}` : null,
      scope ? `Scope: ${scope}` : null,
      timing ? `Timing: ${timing}` : null,
      address ? `Address: ${address}` : null,
      details ? `Details: ${details}` : null,
      `Submitted: ${new Date().toISOString()}`,
    ].filter(Boolean).join(" | ").slice(0, 2000),
  };
  if (address) {
    columnValues.text_mm45qcc4 = String(address).slice(0, 250);
    columnValues.location1ej8reiy = { address: String(address).slice(0, 250) };
  }
  if (leadSource && VALID_LEAD_SOURCES.includes(leadSource)) {
    columnValues.dropdown_mm45aggs = { labels: [leadSource] };
  }

  const res = await fetch(MONDAY_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: token, "API-Version": "2024-01" },
    body: JSON.stringify({
      query: `mutation ($boardId: ID!, $group: String!, $itemName: String!, $cols: JSON!) {
        create_item (board_id: $boardId, group_id: $group, item_name: $itemName, column_values: $cols) { id }
      }`,
      variables: {
        boardId: String(boardId),
        group: "topics",
        itemName: `${name} — ${phone}`,
        cols: JSON.stringify(columnValues),
      },
    }),
  });
  const out = await res.json();
  const id = out && out.data && out.data.create_item && out.data.create_item.id;
  if (!id) { console.error("Monday create_item error:", JSON.stringify(out.errors || out)); return false; }
  return true;
}

async function notify({ name, email, phone, address, details, scope, timing, source, projectType }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) { console.error("Missing RESEND_API_KEY — skipping notification"); return false; }

  const rows = [
    ["Name", name], ["Phone", phone], ["Email", email],
    ["Project type", projectType], ["Scope", scope], ["Timing", timing],
    ["Address", address], ["Details", details], ["Landing page", source],
  ].filter(([, v]) => v)
   .map(([k, v]) => `<tr><td style="padding:6px 14px 6px 0;color:#5B5B57">${k}</td><td style="padding:6px 0"><b>${esc(v)}</b></td></tr>`)
   .join("");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      from: process.env.FROM_EMAIL || DEFAULT_FROM,
      to: [process.env.LEAD_NOTIFY_EMAIL || DEFAULT_NOTIFY],
      reply_to: email,
      subject: `New lead — ${name} (${projectType || "Plans & Permits"})`,
      html: `<div style="font-family:system-ui,Arial,sans-serif;font-size:15px;color:#1A1A1A">
        <h2 style="font-size:19px;margin:0 0 14px">New plans &amp; permits lead</h2>
        <table style="border-collapse:collapse">${rows}</table>
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
