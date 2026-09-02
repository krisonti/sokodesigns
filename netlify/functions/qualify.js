// SOKO Designs — /ADU "Does your property qualify?" handler
// Flow on each submission:
//   1. Create the lead in Monday.com (never lost, even if steps 2–3 fail)
//   2. Ask Claude to write a tailored ADU feasibility report for the address
//   3. Email the report to the homeowner (and BCC the team)
//
// ---- Environment variables (set in Netlify → Site settings → Environment variables) ----
//   MONDAY_API_TOKEN   = your Monday API token            (required for lead capture)
//   MONDAY_BOARD_ID    = 18416938131                       (optional; defaults below)
//   ANTHROPIC_API_KEY  = your Anthropic (Claude) API key   (required for the AI report)
//   RESEND_API_KEY     = your Resend API key               (required to send the email)
//   FROM_EMAIL         = "SOKO Designs <kris@sokodesigns.com>"  (must be a Resend-verified domain)
//   LEAD_NOTIFY_EMAIL  = kris@sokodesigns.com              (optional; gets a copy of every report)
//
// The function degrades gracefully: if the AI/email keys aren't set yet, the lead is
// still captured in Monday and the page still shows the visitor their instant result.

const MONDAY_API_URL = "https://api.monday.com/v2";
const DEFAULT_BOARD_ID = "18416938131"; // ADU Investor Leads board
const CLAUDE_MODEL = "claude-sonnet-5";

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  let data;
  try { data = JSON.parse(event.body || "{}"); }
  catch { return json(400, { error: "Invalid submission." }); }

  // Honeypot — bots fill this hidden field, humans never see it.
  if (data.company) return json(200, { ok: true });

  const name = (data.name || "").trim();
  const email = (data.email || "").trim();
  const phone = (data.phone || "").trim();
  const address = (data.address || "").trim();
  const city = (data.city || "").trim();
  const variant = (data.variant || "").trim().toUpperCase();      // "A" | "B" (A/B test page)
  const leadSource = (data.leadSource || "").trim();              // e.g. "Paid Ad - Google" (from gclid/utm)

  if (!name || !email || !phone || !address) {
    return json(400, { error: "Name, email, phone, and address are required." });
  }

  // ---- 1. Capture the lead in Monday (highest priority) ----
  let mondayOk = false;
  try {
    mondayOk = await createMondayLead({ name, email, phone, address, city, variant, leadSource });
  } catch (err) {
    console.error("Monday capture failed:", err);
  }

  // ---- 2 + 3. Generate the report and email it (best-effort) ----
  let reportSent = false;
  try {
    const reportHtml = await generateReport({ name, address, city });
    if (reportHtml) {
      reportSent = await sendEmail({ name, email, reportHtml });
    }
  } catch (err) {
    console.error("Report/email failed:", err);
  }

  // Always return success to the page if we at least captured the lead.
  return json(200, { ok: mondayOk || reportSent, mondayOk, reportSent });
};

/* ---------------- Monday ---------------- */
// Board 18416938131 column IDs (from board schema):
//   text_mm2h8zc7 = Phone, email_mm2hny1k = Email, date4 = Date,
//   dropdown_mm2hbadt = Project Type, text_mm45qcc4 = Property City/ZIP,
//   dropdown_mm45aggs = Lead Source, color_mm63h9am = Lead Page (status: "A Page"/"B Page"/"None"),
//   text_mm2hg88v = Notes/Comments
const VALID_LEAD_SOURCES = ["CA Investor","Mesa Parent","Direct Mail","Paid Ad - Meta","Paid Ad - Google","Referral","Other"];

async function createMondayLead({ name, email, phone, address, city, variant, leadSource }) {
  const token = process.env.MONDAY_API_TOKEN;
  const boardId = process.env.MONDAY_BOARD_ID || DEFAULT_BOARD_ID;
  if (!token) { console.error("Missing MONDAY_API_TOKEN"); return false; }

  const today = new Date().toISOString().slice(0, 10);
  const leadPage = variant === "A" ? "A Page" : variant === "B" ? "B Page" : "None";

  const columnValues = {
    text_mm2h8zc7: String(phone).slice(0, 120),
    email_mm2hny1k: { email: String(email).slice(0, 200), text: String(email).slice(0, 200) },
    date4: { date: today },
    dropdown_mm2hbadt: { labels: ["ADU"] },
    text_mm45qcc4: String(city || address).slice(0, 250),
    color_mm63h9am: { label: leadPage },
    text_mm2hg88v: [
      `Address: ${address}`,
      city ? `Detected city: ${city}` : null,
      `Lead page: ${leadPage}`,
      `Submitted: ${new Date().toISOString()}`,
    ].filter(Boolean).join(" | ").slice(0, 2000),
  };
  if (leadSource && VALID_LEAD_SOURCES.includes(leadSource)) {
    columnValues.dropdown_mm45aggs = { labels: [leadSource] };
  }

  const itemName = `${name} — ${phone}`;
  const createRes = await fetch(MONDAY_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: token, "API-Version": "2024-01" },
    body: JSON.stringify({
      query: `mutation ($boardId: ID!, $group: String!, $itemName: String!, $cols: JSON!) {
        create_item (board_id: $boardId, group_id: $group, item_name: $itemName, column_values: $cols) { id }
      }`,
      variables: { boardId: String(boardId), group: "topics", itemName, cols: JSON.stringify(columnValues) },
    }),
  });
  const createJson = await createRes.json();
  const itemId = createJson?.data?.create_item?.id;
  if (!itemId) { console.error("Monday create_item error:", JSON.stringify(createJson.errors || createJson)); return false; }

  return true;
}

/* ---------------- Claude report ---------------- */
async function generateReport({ name, address, city }) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) { console.error("Missing ANTHROPIC_API_KEY — skipping AI report"); return null; }

  const prompt = `You are an ADU (accessory dwelling unit) feasibility analyst for SOKO Designs, a turnkey design-permit-build firm serving the Phoenix, Arizona metro.

Write a warm, professional PRELIMINARY feasibility report for a homeowner who just requested it from our website.

Homeowner: ${name}
Property address: ${address}
${city ? `City (detected): ${city}` : ""}

Grounding facts you may rely on:
- Arizona state law (HB 2720 / HB 2928) now requires larger municipalities to permit ADUs on most single-family lots, generally by right (no public hearing or variance), often allowing long-term rental and reduced setbacks. Exact size caps, setbacks, and parcel rules vary by city and lot.
- SOKO Designs offers three pre-designed, permit-ready models: a ~400 sq ft Studio Casita, a ~600 sq ft One-Bedroom, and an ~800 sq ft Two-Level (1 bed). Turnkey build investment typically $99,000–$149,000. Typical long-term rent $1,450–$1,800/month in the metro.
- SOKO handles design, permitting, and construction under one contract, and works with remote/out-of-state owners.

STRICT RULES:
- This is PRELIMINARY guidance, NOT a guarantee that the lot qualifies. Say so clearly.
- Do NOT invent specific municipal code section numbers, exact setback figures, or lot-size minimums you are not certain of. Speak in general, accurate terms and recommend confirming specifics during a free consult.
- Do NOT give a hard "your property does not qualify" verdict. The most cautious framing is "this needs a closer look."
- Keep it encouraging, concrete, and ~350–500 words.

Return ONLY clean HTML for the body of an email (no <html>, <head>, or <body> tags, no markdown fences). Use simple tags: <h2>, <h3>, <p>, <ul>, <li>, <strong>. Structure it as: a short intro, "What Arizona law means for you", "Your likely options" (mention the three models with sizes), "Rough numbers" (cost + rent), and "Your next step" (invite them to book a consult or call 602-878-8087).`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 1600,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const out = await res.json();
  const text = out?.content?.[0]?.text;
  if (!text) { console.error("Claude report error:", JSON.stringify(out)); return null; }
  return text;
}

/* ---------------- Resend email ---------------- */
async function sendEmail({ name, email, reportHtml }) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.FROM_EMAIL || "SOKO Designs <kris@sokodesigns.com>";
  const notify = process.env.LEAD_NOTIFY_EMAIL;
  if (!key) { console.error("Missing RESEND_API_KEY — skipping email"); return false; }

  const html = emailShell(name, reportHtml);
  const payload = {
    from,
    to: [email],
    subject: "Your ADU Feasibility Report — SOKO Designs",
    html,
    reply_to: "kris@sokodesigns.com",
  };
  if (notify) payload.bcc = [notify];

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify(payload),
  });
  if (!res.ok) { console.error("Resend error:", await res.text()); return false; }
  return true;
}

function emailShell(name, inner) {
  return `<div style="font-family:Georgia,'Times New Roman',serif;max-width:600px;margin:0 auto;color:#1A1A1A;line-height:1.6">
    <div style="background:#4A7C7E;color:#fff;padding:22px 26px;border-radius:6px 6px 0 0">
      <div style="font-size:24px;font-weight:700;letter-spacing:.5px">SOKO Designs</div>
      <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;opacity:.85;margin-top:2px">ADU Feasibility Report</div>
    </div>
    <div style="border:1px solid #E3DED3;border-top:none;padding:26px;background:#fff">
      <p>Hi ${escapeHtml(name.split(" ")[0] || name)},</p>
      ${inner}
      <div style="margin:26px 0 6px;text-align:center">
        <a href="tel:6028788087" style="background:#4A7C7E;color:#fff;text-decoration:none;padding:13px 24px;border-radius:4px;font-family:Arial,sans-serif;font-weight:bold;display:inline-block">Call us: 602-878-8087</a>
      </div>
    </div>
    <div style="font-family:Arial,sans-serif;font-size:11px;color:#8A877F;padding:16px 26px;line-height:1.5">
      This report is preliminary guidance based on current Arizona law (HB 2720 / HB 2928) and general city ordinances. It is not a guarantee that your lot qualifies; final eligibility, size limits, and setbacks are confirmed against parcel records and construction documents during design. Cost and rent figures are illustrative market estimates, not financial advice. © SOKO Designs, Phoenix, AZ.
    </div>
  </div>`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function json(statusCode, obj) {
  return { statusCode, headers: { "Content-Type": "application/json" }, body: JSON.stringify(obj) };
}
