/**
 * Tenant Improvement industry pages (/ti/*): lead capture.
 *
 * 1. Re-checks the ZIP against the Maricopa County rule in area.js.
 * 2. Creates an item on the Leads Board (18405787313): Type of Project =
 *    Tenant Improvement, Industry = the page's industry, Lead Type from the
 *    "I am the..." field, Source = Website, plus a full note.
 * 3. Emails Kris a notification and the lead the industry checklist (Resend).
 *
 * Env vars (already set on this site): MONDAY_API_TOKEN, RESEND_API_KEY,
 * FROM_EMAIL, LEAD_NOTIFY_EMAIL. Optional MONDAY_LEADS_BOARD_ID override.
 */

const AREA = require("../../area.js");
const TI = require("../../ti-data.js");

const MONDAY_API_URL = "https://api.monday.com/v2";
const LEADS_BOARD_ID = "18405787313";
const DEFAULT_FROM = "SOKO Designs <kris@sokodesigns.com>";
const DEFAULT_NOTIFY = "kris@sokodesigns.com";
const PHONE_DISPLAY = "480-660-3133";

const COL = {
  phone: "phone_mkvp1jym", email: "email_mkvpa8za", date: "date4",
  source: "color_mkvp1w7z", projectType: "status", leadType: "color_mm7mcqs9",
  industry: "color_mm7qj94b", business: "text_mm235c85", location: "location_mkvhra73",
  timing: "single_selectvnn8lrm", wantBids: "single_selectnzb6vfz", gcHired: "single_selecttg9ztjp",
};
const INDUSTRIES = ["Restaurant & Bar", "Medical & Dental", "Office", "Retail", "Salon & Spa", "Warehouse & Industrial", "Coffee & QSR", "Brewery & Taproom", "Fitness", "Church / Daycare / School", "Auto", "Vet & Pet", "Other TI"];
const ROLE_TO_LEAD_TYPE = {
  "Owner / operator": "Business Owner", "Landlord / property manager": "Landlord", "Broker": "Broker",
  "General contractor": "Contractor", "Designer / architect": "Designer / Architect", "Other": "Other Pro",
};
const RENT_TO_TIMING = {
  "Already paying rent": "ASAP (ready to start now)", "Within 30 days": "ASAP (ready to start now)",
  "1-3 months": "Within 1–2 months", "3+ months": "3-6 months", "No lease yet": "Just exploring / planning",
};
const CITY_LATLNG = {
  "Phoenix": [33.4484, -112.0740], "Laveen": [33.3628, -112.1660], "Mesa": [33.4152, -111.8315], "Chandler": [33.3062, -111.8413],
  "Gilbert": [33.3528, -111.7890], "Scottsdale": [33.4942, -111.9261], "Tempe": [33.4255, -111.9400], "Glendale": [33.5387, -112.1860],
  "Peoria": [33.5806, -112.2374], "Surprise": [33.6292, -112.3680], "Goodyear": [33.4353, -112.3577], "Avondale": [33.4356, -112.3496],
  "Buckeye": [33.3703, -112.5838], "Queen Creek": [33.2487, -111.6343], "Paradise Valley": [33.5312, -111.9426], "Cave Creek": [33.8334, -111.9507],
  "Fountain Hills": [33.6117, -111.7174], "Litchfield Park": [33.4934, -112.3579], "El Mirage": [33.6131, -112.3246], "Tolleson": [33.4501, -112.2593],
};

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed." });
  let data;
  try { data = JSON.parse(event.body || "{}"); } catch { return json(400, { error: "Invalid submission." }); }
  if (data.company) return json(200, { ok: true });   // honeypot

  const s = (k, max = 500) => String(data[k] || "").trim().slice(0, max);
  const lead = {
    name: s("name", 120), email: s("email", 200), phone: s("phone", 40),
    zip: AREA.clean(s("zip", 10)), address: s("address", 250), city: s("city", 80),
    industry: s("industry", 60), business: s("business", 200), role: s("role", 60),
    lease: s("lease", 60), sqft: s("sqft", 40), prevUse: s("prevUse", 80), concept: s("concept", 80),
    rent: s("rent", 40), drawings: s("drawings", 80), details: s("details", 2000), gcIntro: s("gcIntro", 10),
    source: s("source", 120), leadSource: s("leadSource", 40), gclid: s("gclid", 200),
  };
  if (!lead.name || !lead.email || !lead.phone) return json(400, { error: "Name, email, and phone are required." });
  if (!AREA.inArea(lead.zip)) { console.log("Out-of-area TI submission ignored:", lead.zip); return json(200, { ok: true, outOfArea: true }); }
  if (!lead.city) lead.city = AREA.cityFor(lead.zip);
  lead.jurisdiction = AREA.jurisdictionFor(lead.zip);
  if (!INDUSTRIES.includes(lead.industry)) lead.industry = "Other TI";
  lead.leadType = ROLE_TO_LEAD_TYPE[lead.role] || "Business Owner";

  let mondayOk = false;
  try { mondayOk = await createMondayLead(lead); } catch (err) { console.error("Monday error:", err && err.message); }
  let notified = false;
  try { notified = await notifyKris(lead); } catch (err) { console.error("Notify error:", err && err.message); }
  try { await sendChecklist(lead); } catch (err) { console.error("Checklist email error:", err && err.message); }
  return json(200, { ok: mondayOk || notified, mondayOk, notified });
};

async function createMondayLead(lead) {
  const token = process.env.MONDAY_API_TOKEN;
  if (!token) { console.error("Missing MONDAY_API_TOKEN"); return false; }
  const boardId = process.env.MONDAY_LEADS_BOARD_ID || LEADS_BOARD_ID;
  const today = new Date().toISOString().slice(0, 10);
  const cityName = /^the /.test(lead.city) ? "" : lead.city;

  const cols = {
    [COL.phone]: { phone: lead.phone.replace(/[^\d+]/g, "").slice(0, 20), countryShortName: "US" },
    [COL.email]: { email: lead.email, text: lead.email },
    [COL.date]: { date: today },
    [COL.source]: { label: "Website" },
    [COL.projectType]: { label: "Tenant Improvement" },
    [COL.leadType]: { label: lead.leadType },
    [COL.industry]: { label: lead.industry },
  };
  if (lead.business) cols[COL.business] = lead.business.slice(0, 250);
  if (RENT_TO_TIMING[lead.rent]) cols[COL.timing] = { label: RENT_TO_TIMING[lead.rent] };
  if (lead.gcIntro === "yes") cols[COL.wantBids] = { label: "Yes - I want bids" };
  if (lead.role === "General contractor") cols[COL.gcHired] = { label: "Yes" };

  const itemName = `${lead.business || lead.name} — ${cityName || lead.city} (${lead.industry} TI)`;
  const itemId = await mondayCreateItem(token, boardId, itemName, cols);
  if (!itemId) return false;

  const where = [lead.address, cityName, "AZ", lead.zip].filter(Boolean).join(", ");
  const ll = CITY_LATLNG[cityName] || (lead.city === "the East Valley" ? CITY_LATLNG["Mesa"] : lead.city === "the West Valley" ? CITY_LATLNG["Glendale"] : null);
  if (ll) { try { await mondaySetColumn(token, boardId, itemId, COL.location, { lat: ll[0], lng: ll[1], address: where }); } catch (err) { console.error("Location skipped:", err && err.message); } }

  const notes = [
    `Industry: ${lead.industry}`, `Contact: ${lead.name} (${lead.role || "role not given"})`,
    lead.business ? `Business: ${lead.business}` : null, `Space: ${where}`,
    lead.sqft ? `Size: ${lead.sqft}` : null, lead.lease ? `Lease: ${lead.lease}` : null,
    lead.rent ? `Rent clock: ${lead.rent}` : null, lead.prevUse ? `Previous use: ${lead.prevUse}` : null,
    lead.concept ? `Concept: ${lead.concept}` : null, lead.drawings ? `Drawings: ${lead.drawings}` : null,
    lead.gcIntro === "yes" ? `Wants a GC introduction: yes` : null,
    lead.details ? `Details: ${lead.details}` : null,
    `Came from: ${lead.source}${lead.leadSource ? ` / ${lead.leadSource}` : ""}${lead.gclid ? ` / gclid ${lead.gclid}` : ""}`,
    `Submitted: ${new Date().toISOString()}`,
  ].filter(Boolean).join("\n");
  try { await mondayPostUpdate(token, itemId, notes); } catch (err) { console.error("Update skipped:", err && err.message); }
  return true;
}

async function mondayGraphql(token, query, variables) {
  const res = await fetch(MONDAY_API_URL, { method: "POST", headers: { "Content-Type": "application/json", Authorization: token, "API-Version": "2024-01" }, body: JSON.stringify({ query, variables }) });
  return res.json();
}
async function mondayCreateItem(token, boardId, itemName, columnValues) {
  const out = await mondayGraphql(token,
    `mutation ($boardId: ID!, $group: String!, $itemName: String!, $cols: JSON!) { create_item (board_id: $boardId, group_id: $group, item_name: $itemName, column_values: $cols) { id } }`,
    { boardId: String(boardId), group: "topics", itemName, cols: JSON.stringify(columnValues) });
  const id = out && out.data && out.data.create_item && out.data.create_item.id;
  if (!id) { console.error("Monday create_item error:", JSON.stringify(out.errors || out)); return null; }
  return id;
}
async function mondaySetColumn(token, boardId, itemId, columnId, value) {
  const out = await mondayGraphql(token,
    `mutation ($boardId: ID!, $itemId: ID!, $columnId: String!, $value: JSON!) { change_column_value (board_id: $boardId, item_id: $itemId, column_id: $columnId, value: $value) { id } }`,
    { boardId: String(boardId), itemId: String(itemId), columnId, value: JSON.stringify(value) });
  if (out && out.errors) console.error("Monday column error:", JSON.stringify(out.errors));
}
async function mondayPostUpdate(token, itemId, body) {
  const out = await mondayGraphql(token, `mutation ($itemId: ID!, $body: String!) { create_update (item_id: $itemId, body: $body) { id } }`, { itemId: String(itemId), body });
  if (out && out.errors) console.error("Monday update error:", JSON.stringify(out.errors));
}

async function sendEmail(payload) {
  const key = process.env.RESEND_API_KEY;
  if (!key) { console.error("Missing RESEND_API_KEY, email skipped"); return false; }
  const res = await fetch("https://api.resend.com/emails", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` }, body: JSON.stringify(Object.assign({ from: process.env.FROM_EMAIL || DEFAULT_FROM }, payload)) });
  if (!res.ok) { console.error("Resend error:", res.status, (await res.text()).slice(0, 220)); return false; }
  return true;
}

async function notifyKris(lead) {
  const rows = [
    ["Industry", lead.industry], ["Name", lead.name], ["Role", lead.role], ["Business", lead.business],
    ["Phone", lead.phone], ["Email", lead.email], ["Space", [lead.address, lead.city, lead.zip].filter(Boolean).join(", ")],
    ["Size", lead.sqft], ["Lease", lead.lease], ["Rent clock", lead.rent], ["Previous use", lead.prevUse],
    ["Concept", lead.concept], ["Drawings", lead.drawings], ["GC intro", lead.gcIntro === "yes" ? "Yes" : ""],
    ["Details", lead.details], ["Came from", [lead.source, lead.leadSource].filter(Boolean).join(" / ")],
  ].filter(([, v]) => v).map(([k, v]) => `<tr><td style="padding:6px 14px 6px 0;color:#5B5B57;vertical-align:top">${k}</td><td style="padding:6px 0"><b>${esc(v)}</b></td></tr>`).join("");
  const hot = lead.rent === "Already paying rent" || lead.rent === "Within 30 days";
  return sendEmail({
    to: [process.env.LEAD_NOTIFY_EMAIL || DEFAULT_NOTIFY], reply_to: lead.email,
    subject: `${hot ? "⏰ HOT " : ""}New TI lead — ${lead.industry} — ${lead.business || lead.name} (${lead.city})`,
    html: `<div style="font-family:system-ui,Arial,sans-serif;font-size:15px;color:#1A1A1A"><h2 style="font-size:19px;margin:0 0 14px">New tenant improvement lead</h2>${hot ? `<p style="margin:0 0 12px;color:#B8955A"><b>Rent is already running or starts within 30 days. Call first.</b></p>` : ""}<table style="border-collapse:collapse">${rows}</table><p style="margin-top:16px;color:#5B5B57;font-size:13px">Reply to this email to reach them. The lead is on the Monday Leads Board under New Leads.</p></div>`,
  });
}

async function sendChecklist(lead) {
  const ind = TI.INDUSTRIES[lead.industry];
  const first = lead.name.split(" ")[0];
  const portal = TI.portalFor(lead.city, lead.jurisdiction);
  const items = (ind ? ind.checklist : ["Lease or LOI with the rent-commencement date", "Landlord's shell or as-built drawings", "Your intended layout and equipment, even rough", "Photos of the space as it sits today"]).map((i) => `<li style="margin:6px 0">${esc(i)}</li>`).join("");
  const steps = ind ? ind.steps({ city: lead.city, portal, prevUse: lead.prevUse }).map((st) => `<li style="margin:6px 0"><b>${esc(st.b)}</b> ${esc(st.t)}</li>`).join("") : "";
  return sendEmail({
    to: [lead.email], reply_to: process.env.LEAD_NOTIFY_EMAIL || DEFAULT_NOTIFY,
    subject: `Your ${ind ? ind.title : "tenant improvement"} permit checklist for ${lead.city} — SOKO Designs`,
    html: `<div style="font-family:system-ui,Arial,sans-serif;font-size:16px;line-height:1.6;color:#1A1A1A;max-width:600px">
      <p>Hi ${esc(first)},</p>
      <p>Thanks for reaching out about your ${esc(ind ? ind.title : "space")} in ${esc(lead.city)}. We'll call you within one business day, usually sooner. If rent is already running, call us now at <a href="tel:4806603133" style="color:#3A6365">${PHONE_DISPLAY}</a> and we'll move it up.</p>
      <h3 style="font-size:18px;margin:22px 0 8px">What to have ready (so we can price it fast)</h3>
      <ol style="padding-left:20px;margin:0">${items}</ol>
      ${steps ? `<h3 style="font-size:18px;margin:22px 0 8px">Your permit path in ${esc(lead.city)}</h3><ol style="padding-left:20px;margin:0">${steps}</ol>` : ""}
      <p style="margin-top:22px">Kris Ontiveros<br>SOKO Designs &middot; Plans &amp; Permits &middot; Phoenix, AZ<br><a href="tel:4806603133" style="color:#3A6365">${PHONE_DISPLAY}</a></p>
    </div>`,
  });
}

function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
function json(statusCode, body) { return { statusCode, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }; }
