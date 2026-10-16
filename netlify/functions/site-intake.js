/**
 * Site Intake — backs the single-page version of the "SOKO Site Intake" Monday
 * form (board 18435809933). The Monday form asks its 28 questions one screen at
 * a time, which is painful to fill out standing in someone's driveway.
 *
 * GET  ?leads=1   -> recent Leads Board items, for the Lead picker
 * POST            -> creates the Site Intake item
 *
 * Env vars:
 *   MONDAY_API_TOKEN  = required
 *   INTAKE_PASSCODE   = optional. When set, both verbs require a matching
 *                       passcode. Unset means the page is open to anyone who
 *                       knows the URL.
 */

const MONDAY_API_URL = "https://api.monday.com/v2";
const INTAKE_BOARD_ID = "18435809933";
const LEADS_BOARD_ID = "18405787313";

// Board 18435809933 "Site Intake" column ids.
const COL = {
  lead: "connect_boards5ovbva",
  address: "locationi4hymkqs",
  projectType: "single_selectd8pjscf",
  projectTypePrice: "numberyo60kjsh",
  scope: "long_text71lrof4n",
  sqft: "numbersuap4cui",
  other: "long_textr501tlbh",
  fee: "long_textg14sn8ng",
  risks: "long_text5hfz16hr",
  photos: "link1atracm7",
  notes: "long_text3q609ay5",
};

// Optional services: checkbox column + its price column.
const SERVICES = [
  { key: "sitePlan",   check: "booleanrcei8yco", price: "number6p8ohi9c",  label: "Site Plan" },
  { key: "asBuilt",    check: "booleany9vzbl8u", price: "numberczyttu6c",  label: "As-Built Measurements" },
  { key: "cds",        check: "booleanl5ou65x3", price: "numberyhutzpnj",  label: "Construction Documents" },
  { key: "structural", check: "booleanwcoxv71a", price: "numberc5gyttmh",  label: "Structural Engineering" },
  { key: "mep",        check: "boolean5izo82y5", price: "numbercw6hxpow",  label: "MEP Engineering" },
  { key: "manualJ",    check: "booleanea7ivnmy", price: "numberhdkeid9u",  label: "Manual J S & D Report" },
  { key: "hoa",        check: "booleanbpgban1a", price: "numberrvn6enyc",  label: "HOA Design Review" },
  { key: "permits",    check: "booleangtit35z7", price: "number07hlgquf",  label: "Permit Services" },
];

const PROJECT_TYPES = [
  "Residential Remodel", "Residential Addition", "Custom New Build SFR", "ADU Design",
  "Tenant Improvement", "Detached Garage", "Patio / AZ Room", "Demolition Permit",
  "Commercial New Build", "Multifamily", "Site Plan Only",
];

exports.handler = async (event) => {
  const token = process.env.MONDAY_API_TOKEN;
  if (!token) return json(500, { error: "Server is missing MONDAY_API_TOKEN." });

  const pass = process.env.INTAKE_PASSCODE;
  const given =
    (event.queryStringParameters && event.queryStringParameters.pass) ||
    (event.headers && (event.headers["x-intake-pass"] || event.headers["X-Intake-Pass"])) ||
    "";
  if (pass && given !== pass) return json(401, { error: "Wrong passcode." });

  if (event.httpMethod === "GET") {
    try { return json(200, { leads: await listLeads(token) }); }
    catch (err) {
      console.error("Leads lookup failed:", err && err.message);
      return json(200, { leads: [], warning: "Could not load leads." });
    }
  }

  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed." });

  let d;
  try { d = JSON.parse(event.body || "{}"); }
  catch { return json(400, { error: "Invalid submission." }); }

  if (d.company) return json(200, { ok: true });            // honeypot

  const jobName = (d.jobName || "").trim();
  if (!jobName) return json(400, { error: "Job name is required." });

  const cols = {};
  if (d.leadId) cols[COL.lead] = { item_ids: [Number(d.leadId)] };
  if (PROJECT_TYPES.includes(d.projectType)) cols[COL.projectType] = { label: d.projectType };
  num(cols, COL.projectTypePrice, d.projectTypePrice);
  num(cols, COL.sqft, d.sqft);
  text(cols, COL.scope, d.scope);
  text(cols, COL.other, d.other);
  text(cols, COL.fee, d.fee);
  text(cols, COL.risks, d.risks);
  text(cols, COL.notes, d.notes);
  if (d.photos) cols[COL.photos] = { url: String(d.photos).slice(0, 500), text: "Google Photos" };

  SERVICES.forEach((s) => {
    const on = !!(d.services && d.services[s.key] && d.services[s.key].on);
    cols[s.check] = { checked: on ? "true" : "false" };
    if (on) num(cols, s.price, d.services[s.key].price);
  });

  let itemId;
  try {
    itemId = await createItem(token, jobName, cols);
  } catch (err) {
    console.error("Monday create failed:", err && err.message);
    return json(502, { error: "Monday rejected the submission. Nothing was saved." });
  }
  if (!itemId) return json(502, { error: "Monday rejected the submission. Nothing was saved." });

  // The location column wants lat/lng alongside the label and rejects a bare
  // address, which would fail the whole create. Set it once the item exists so
  // a bad address can never lose the intake.
  const address = (d.address || "").trim();
  if (address) {
    try { await setColumn(token, itemId, COL.address, { address: address }); }
    catch (err) { console.error("Address column skipped:", err && err.message); }
  }

  return json(200, {
    ok: true,
    itemId: itemId,
    url: "https://sokodesignazs-team.monday.com/boards/" + INTAKE_BOARD_ID + "/pulses/" + itemId,
  });
};

function text(cols, id, v) { const s = (v || "").trim(); if (s) cols[id] = s.slice(0, 4000); }
function num(cols, id, v) {
  if (v === undefined || v === null || v === "") return;
  const n = Number(String(v).replace(/[^0-9.\-]/g, ""));
  if (!isNaN(n)) cols[id] = String(n);
}

async function gql(token, query, variables) {
  const res = await fetch(MONDAY_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: token, "API-Version": "2024-01" },
    body: JSON.stringify({ query, variables }),
  });
  return res.json();
}

async function listLeads(token) {
  const out = await gql(token,
    `query ($board: ID!) {
       boards(ids: [$board]) {
         items_page(limit: 200, query_params: {order_by: [{column_id: "__creation_log__", direction: desc}]}) {
           items { id name }
         }
       }
     }`,
    { board: LEADS_BOARD_ID });
  const b = out && out.data && out.data.boards && out.data.boards[0];
  const items = (b && b.items_page && b.items_page.items) || [];
  if (!items.length && out && out.errors) console.error("Leads query errors:", JSON.stringify(out.errors));
  return items.map((i) => ({ id: i.id, name: i.name }));
}

async function createItem(token, itemName, columnValues) {
  const out = await gql(token,
    `mutation ($board: ID!, $group: String!, $name: String!, $cols: JSON!) {
       create_item (board_id: $board, group_id: $group, item_name: $name, column_values: $cols) { id }
     }`,
    { board: INTAKE_BOARD_ID, group: "topics", name: itemName, cols: JSON.stringify(columnValues) });
  const id = out && out.data && out.data.create_item && out.data.create_item.id;
  if (!id) console.error("create_item error:", JSON.stringify((out && out.errors) || out));
  return id;
}

async function setColumn(token, itemId, columnId, value) {
  const out = await gql(token,
    `mutation ($board: ID!, $item: ID!, $col: String!, $val: JSON!) {
       change_column_value (board_id: $board, item_id: $item, column_id: $col, value: $val) { id }
     }`,
    { board: INTAKE_BOARD_ID, item: String(itemId), col: columnId, val: JSON.stringify(value) });
  if (out && out.errors) console.error("column error:", JSON.stringify(out.errors));
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify(body),
  };
}
