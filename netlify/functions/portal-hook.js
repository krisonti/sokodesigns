/**
 * Client portal: Monday webhooks on the PROJECTS board.
 *
 * A) Portal column changed. When someone sets Portal = "Create link":
 *   1. a new random token is made and saved in "Portal Token" (this kills any old link)
 *   2. "Portal Link" gets the client's page URL
 *   3. if the project has no subitems yet, one subitem per stage is created
 *      (stage list comes from netlify/portal-config.js, picked by the Type column)
 *   4. Portal is set to "Live"
 *
 * B) A stage subitem's Status changed. The project's current stage is worked out the same
 *    way the portal page does it (first stage that isn't Done or Skipped) and written to
 *    "Client Stage". It is left untouched when nothing changed. A Monday automation emails
 *    the client when Client Stage changes.
 *
 * The webhook body is never trusted on its own: the item is re-read from Monday and the
 * work only happens if it's on the PROJECTS board (and, for A, Portal really says "Create link").
 *
 * Env vars: MONDAY_API_TOKEN (required)
 */

const crypto = require("crypto");
const { stagesForType } = require("../portal-config.js");

const MONDAY_API_URL = "https://api.monday.com/v2";
const BOARD_ID = "18167716329"; // PROJECTS
const SITE = "https://www.sokodesigns.com";
const COL = { portal: "portal_status", token: "portal_token", link: "portal_link", type: "color_mm00kgcd", stage: "client_stage" };

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") return send(405, { error: "method_not_allowed" });
  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { return send(400, { error: "bad_json" }); }
  if (body.challenge) return send(200, { challenge: body.challenge }); // Monday handshake

  const ev = body.event || {};
  const isSubitem = !!ev.parentItemId;
  const id = String(isSubitem ? ev.parentItemId : (ev.pulseId || ev.itemId || ""));
  if (!/^\d{5,20}$/.test(id)) return send(200, { ignored: true });

  try {
    const item = await getItem(id);
    if (!item || String(item.board.id) !== BOARD_ID) return send(200, { ignored: true });
    if (isSubitem) return await syncStage(item);
    if (colText(item, COL.portal) !== "Create link") return send(200, { ignored: true });

    const token = crypto.randomBytes(32).toString("base64url"); // 43 URL-safe characters
    await setColumns(id, {
      [COL.token]: token,
      [COL.link]: { url: `${SITE}/client/${token}/`, text: "Client portal" },
      [COL.portal]: { label: "Live" },
    });

    if (!item.subitems || item.subitems.length === 0) {
      await createStages(id, stagesForType(colText(item, COL.type)));
    }
    return send(200, { ok: true });
  } catch (err) {
    console.error("portal-hook error:", err && err.message);
    return send(500, { error: "failed" });
  }
};

async function getItem(id) {
  const out = await mondayGraphql(
    `query ($id: [ID!]) { items (ids: $id) { id board { id }
       subitems { id name column_values (ids: ["status"]) { id text } }
       column_values (ids: ["${COL.portal}", "${COL.type}", "${COL.stage}"]) { id text } } }`,
    { id: [id] });
  if (out.errors) throw new Error("Monday read failed: " + JSON.stringify(out.errors).slice(0, 300));
  return (out.data && out.data.items && out.data.items[0]) || null;
}

// Current stage = first subitem that isn't Done or Skipped ("Complete" when all are done).
async function syncStage(item) {
  const stages = (item.subitems || [])
    .map((s) => ({ name: (s.name || "").trim(), state: colText(s, "status") }))
    .filter((s) => s.name && s.state !== "Skipped");
  if (!stages.length) return send(200, { ignored: true });
  const current = stages.find((s) => s.state !== "Done");
  const stage = current ? current.name : "Complete";
  if (stage === colText(item, COL.stage)) return send(200, { unchanged: true });
  await setColumns(item.id, { [COL.stage]: stage });
  return send(200, { ok: true, stage });
}

async function setColumns(id, values) {
  const out = await mondayGraphql(
    `mutation ($board: ID!, $id: ID!, $vals: JSON!) {
       change_multiple_column_values (board_id: $board, item_id: $id, column_values: $vals) { id }
     }`,
    { board: BOARD_ID, id, vals: JSON.stringify(values) });
  if (out.errors) throw new Error("Monday update failed: " + JSON.stringify(out.errors).slice(0, 300));
}

// One request; mutation fields run in order, so the stages keep their order.
async function createStages(parentId, names) {
  const vars = { parent: parentId };
  const fields = names.map((name, i) => {
    vars["n" + i] = name;
    return `s${i}: create_subitem (parent_item_id: $parent, item_name: $n${i}) { id }`;
  });
  const decl = ["$parent: ID!", ...names.map((_, i) => `$n${i}: String!`)].join(", ");
  const out = await mondayGraphql(`mutation (${decl}) { ${fields.join("\n")} }`, vars);
  if (out.errors) throw new Error("Monday subitems failed: " + JSON.stringify(out.errors).slice(0, 300));
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

function colText(item, id) {
  const c = (item.column_values || []).find((v) => v.id === id);
  return c && c.text ? String(c.text).trim() : "";
}

function send(status, body) {
  return { statusCode: status, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}
