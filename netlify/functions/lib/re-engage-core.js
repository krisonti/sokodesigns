// SOKO Designs — ADU re-engagement drip: core logic (shared by the scheduled job, the manual-run endpoint, and unsubscribe)
//
// HOW IT WORKS
//   • Enrol a lead by setting the Monday column "Drip Status" = Active on the ADU Investor board (18416938131).
//   • Every day the scheduled job looks at every Active lead. If it's been 14+ days since their last drip email
//     (or they've never had one), it sends the next email in lib/re-engage-emails.js, then stamps
//     "Drip Step" and "Drip Last Sent" and posts a note on the Monday item.
//   • After the last email it sets Drip Status = Done. An unsubscribe link in every email sets it to Unsubscribed.
//   • Safety: if the lead's main Status moves to an active sales stage (Site Visit, Bid Sent, Proposal Sent,
//     Bid Accepted) or Bad Lead, the drip pauses itself so we never email someone we're mid-conversation with.
//
// ENV VARS (Netlify → Site configuration → Environment variables)
//   MONDAY_API_TOKEN  (already set)     RESEND_API_KEY (already set)     FROM_EMAIL (already set)
//   DRIP_SECRET       — any long random string. Protects the manual-run endpoint + signs unsubscribe links.
//   DRIP_TEST_EMAIL   — OPTIONAL. If set, EVERY drip email goes to this address instead of the lead. Remove to go live.

const crypto = require("crypto");
const { EMAILS } = require("./re-engage-emails");

const MONDAY_API_URL = "https://api.monday.com/v2";
const BOARD_ID = process.env.MONDAY_BOARD_ID || "18416938131";
const DAYS_BETWEEN = 14;

// Column IDs on board 18416938131
const COL = {
  email: "email_mm2hny1k",
  status: "status",              // main sales status
  dripStatus: "color_mm7mfqge",  // Active / Paused / Done / Unsubscribed
  dripStep: "numeric_mm7mk9qp",  // last email number sent
  dripLastSent: "date_mm7mvfaf", // date of last send
};

// Main-status labels that should PAUSE the drip (we're actively working the lead, or it's dead)
const PAUSE_ON_STATUS = ["Site Visit", "Bid Sent", "Proposal Sent", "Bid Accepted", "Bad Lead"];

/* ───────────────────────── public API ───────────────────────── */

/**
 * Run one pass of the drip.
 * @param {object} opts
 * @param {boolean} opts.dryRun   - report what WOULD happen, send nothing, change nothing
 * @param {string}  opts.onlyItem - restrict to one Monday item id
 * @param {string}  opts.toOverride - send to this address instead of the lead (testing)
 * @param {boolean} opts.force    - ignore the 14-day wait (testing)
 * @param {boolean} opts.record   - default true; false = send but do NOT stamp Monday (testing with ?to=)
 */
async function runDrip(opts = {}) {
  const dryRun = !!opts.dryRun;
  const record = opts.record !== false;
  const testTo = opts.toOverride || process.env.DRIP_TEST_EMAIL || null;
  const today = phoenixToday();
  const report = { ran_at: new Date().toISOString(), today, dryRun, testTo, leads: [] };

  const leads = await fetchActiveLeads();
  for (const lead of leads) {
    if (opts.onlyItem && String(lead.id) !== String(opts.onlyItem)) continue;
    const row = { id: lead.id, name: lead.name, email: lead.email, step: lead.step, lastSent: lead.lastSent, action: "" };
    report.leads.push(row);

    try {
      // 1. Safety pause
      if (PAUSE_ON_STATUS.includes(lead.mainStatus)) {
        row.action = `paused (main status is "${lead.mainStatus}")`;
        if (!dryRun) {
          await setColumns(lead.id, { [COL.dripStatus]: { label: "Paused" } });
          await postUpdate(lead.id, `⏸ Re-engagement drip paused automatically because Status is "${lead.mainStatus}". Set Drip Status back to Active to resume.`);
        }
        continue;
      }
      // 2. No email address
      if (!lead.email) {
        row.action = "skipped (no email on the item)";
        continue;
      }
      // 3. Not due yet
      const days = lead.lastSent ? daysBetween(lead.lastSent, today) : null;
      if (days !== null && days < DAYS_BETWEEN && !opts.force) {
        row.action = `waiting (last sent ${days} day(s) ago, next in ${DAYS_BETWEEN - days})`;
        continue;
      }
      // 4. Pick the next non-draft email
      const nextIdx = EMAILS.findIndex((e, i) => i + 1 > lead.step && !e.draft);
      if (nextIdx === -1) {
        row.action = "done (no more emails)";
        if (!dryRun) {
          await setColumns(lead.id, { [COL.dripStatus]: { label: "Done" } });
          await postUpdate(lead.id, "✅ Re-engagement drip complete — all emails sent.");
        }
        continue;
      }
      const n = nextIdx + 1;
      const email = EMAILS[nextIdx];
      const isLast = !EMAILS.slice(nextIdx + 1).some(e => !e.draft);
      row.action = `${dryRun ? "would send" : "send"} #${n} "${email.subject}"${isLast ? " (final)" : ""}`;

      if (dryRun) continue;

      // 5. Send
      const to = testTo || lead.email;
      const subject = testTo ? `[TEST → ${lead.email}] ${email.subject}` : email.subject;
      const html = renderEmail(lead, email, n);
      await sendResend({ to, subject, html, unsubscribeUrl: unsubscribeUrl(lead.id) });

      // 6. Record it (skipped when testing with an explicit override address)
      if (!record) { row.action += " ✓ (test, Monday not updated)"; await sleep(700); continue; }
      const cols = { [COL.dripStep]: String(n), [COL.dripLastSent]: { date: today } };
      if (isLast) cols[COL.dripStatus] = { label: "Done" };
      await setColumns(lead.id, cols);
      await postUpdate(lead.id, `📧 Re-engagement email #${n} of ${EMAILS.length} sent${testTo ? ` (TEST MODE → ${testTo})` : ""}: "${email.subject}"${isLast ? " — sequence complete." : ""}`);
      row.action += " ✓";
      await sleep(700); // Resend rate limit is ~2 req/s
    } catch (err) {
      row.action += ` ERROR: ${err.message}`;
      console.error(`Drip error on item ${lead.id}:`, err);
    }
  }
  report.summary = summarize(report.leads);
  console.log("Drip run:", JSON.stringify(report.summary));
  return report;
}

async function unsubscribe(itemId) {
  await setColumns(itemId, { [COL.dripStatus]: { label: "Unsubscribed" } });
  await postUpdate(itemId, "🚫 Lead clicked Unsubscribe in a re-engagement email. Drip stopped. Do not re-enrol.");
}

/* ───────────────────────── Monday ───────────────────────── */

async function mondayQuery(query, variables = {}) {
  const token = process.env.MONDAY_API_TOKEN;
  if (!token) throw new Error("Missing MONDAY_API_TOKEN");
  const res = await fetch(MONDAY_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: token, "API-Version": "2024-10" },
    body: JSON.stringify({ query, variables }),
  });
  const out = await res.json();
  if (out.errors) throw new Error("Monday: " + JSON.stringify(out.errors));
  return out.data;
}

async function fetchActiveLeads() {
  const ids = [COL.email, COL.status, COL.dripStatus, COL.dripStep, COL.dripLastSent];
  const data = await mondayQuery(
    `query ($board: ID!, $cols: [ItemsPageByColumnValuesQuery!]!, $ids: [String!]) {
      items_page_by_column_values(board_id: $board, limit: 200, columns: $cols) {
        items { id name column_values(ids: $ids) { id text } }
      }
    }`,
    { board: BOARD_ID, cols: [{ column_id: COL.dripStatus, column_values: ["Active"] }], ids }
  );
  const items = data?.items_page_by_column_values?.items || [];
  return items.map(it => {
    const v = Object.fromEntries((it.column_values || []).map(c => [c.id, (c.text || "").trim()]));
    return {
      id: it.id,
      name: it.name,
      firstName: firstNameOf(it.name),
      email: (v[COL.email] || "").toLowerCase(),
      mainStatus: v[COL.status] || "",
      step: parseInt(v[COL.dripStep], 10) || 0,
      lastSent: v[COL.dripLastSent] || null, // "YYYY-MM-DD"
    };
  });
}

async function setColumns(itemId, values) {
  await mondayQuery(
    `mutation ($board: ID!, $item: ID!, $vals: JSON!) {
      change_multiple_column_values(board_id: $board, item_id: $item, column_values: $vals) { id }
    }`,
    { board: BOARD_ID, item: String(itemId), vals: JSON.stringify(values) }
  );
}

async function postUpdate(itemId, body) {
  try {
    await mondayQuery(`mutation ($item: ID!, $body: String!) { create_update(item_id: $item, body: $body) { id } }`,
      { item: String(itemId), body });
  } catch (e) { console.error("Monday update note failed:", e.message); }
}

/* ───────────────────────── Resend ───────────────────────── */

async function sendResend({ to, subject, html, unsubscribeUrl }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("Missing RESEND_API_KEY");
  const from = process.env.FROM_EMAIL || "SOKO Designs <kris@sokodesigns.com>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      from, to: [to], subject, html,
      reply_to: "kris@sokodesigns.com",
      headers: {
        "List-Unsubscribe": `<${unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    }),
  });
  if (!res.ok) throw new Error("Resend " + res.status + ": " + (await res.text()));
}

/* ───────────────────────── Rendering ───────────────────────── */

function renderEmail(lead, email, n) {
  const first = escapeHtml(lead.firstName || "there");
  const body = String(email.body).replace(/\{\{firstName\}\}/g, first);
  const unsub = unsubscribeUrl(lead.id);
  return `<!doctype html><html><body style="margin:0;padding:0;background:#F6F4EF">
  <span style="display:none;max-height:0;overflow:hidden;color:#F6F4EF">${escapeHtml(email.preview || "")}</span>
  <div style="font-family:Georgia,'Times New Roman',serif;max-width:600px;margin:0 auto;color:#1A1A1A;line-height:1.6;padding:24px 12px">
    <div style="background:#4A7C7E;color:#fff;padding:20px 26px;border-radius:6px 6px 0 0">
      <div style="font-size:22px;font-weight:700;letter-spacing:.5px">SOKO Designs</div>
      <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;opacity:.85;margin-top:2px">Casitas &amp; ADUs · Phoenix Metro</div>
    </div>
    <div style="border:1px solid #E3DED3;border-top:none;padding:26px;background:#fff;font-size:16px">
      <p>Hi ${first},</p>
      ${body}
    </div>
    <div style="font-family:Arial,sans-serif;font-size:11px;color:#8A877F;padding:16px 26px;line-height:1.6">
      You're getting this because you asked SOKO Designs about a casita or ADU. Cost and rent figures are illustrative market estimates, not financial advice; ADU eligibility is subject to city rules and parcel review.
      <br>SOKO Designs · Phoenix, AZ · 602-878-8087 · Construction by SOKO Development LLC, Arizona ROC 369315 · <a href="${unsub}" style="color:#8A877F">Unsubscribe</a>
    </div>
  </div></body></html>`;
}

/* ───────────────────────── Helpers ───────────────────────── */

function secret() { return process.env.DRIP_SECRET || process.env.MONDAY_API_TOKEN || "no-secret"; }
function signItem(itemId) { return crypto.createHmac("sha256", secret()).update(String(itemId)).digest("hex").slice(0, 32); }
function verifyItem(itemId, token) {
  const a = Buffer.from(signItem(itemId)); const b = Buffer.from(String(token || ""));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
function siteUrl() { return (process.env.URL || "https://www.sokodesigns.com").replace(/\/$/, ""); }
function unsubscribeUrl(itemId) { return `${siteUrl()}/.netlify/functions/re-engage-unsubscribe?id=${itemId}&t=${signItem(itemId)}`; }

function phoenixToday() { // Arizona = UTC-7, no DST
  return new Date(Date.now() - 7 * 3600 * 1000).toISOString().slice(0, 10);
}
function daysBetween(fromYmd, toYmd) { return Math.floor((Date.parse(toYmd) - Date.parse(fromYmd)) / 86400000); }
function firstNameOf(itemName) {
  const clean = String(itemName || "").split("—")[0].split(" - ")[0].replace(/^\[[^\]]*\]\s*/, "").trim();
  const first = clean.split(/\s+/)[0] || "";
  return first ? first[0].toUpperCase() + first.slice(1).toLowerCase() : "";
}
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function summarize(rows) {
  const s = { total: rows.length, sent: 0, waiting: 0, paused: 0, skipped: 0, done: 0, errors: 0 };
  for (const r of rows) {
    if (r.action.includes("ERROR")) s.errors++;
    else if (r.action.startsWith("send") || r.action.startsWith("would send")) s.sent++;
    else if (r.action.startsWith("waiting")) s.waiting++;
    else if (r.action.startsWith("paused")) s.paused++;
    else if (r.action.startsWith("done")) s.done++;
    else s.skipped++;
  }
  return s;
}

module.exports = { runDrip, unsubscribe, verifyItem, EMAILS, COL };
