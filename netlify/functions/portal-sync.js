/**
 * Client portal: background job, every 5 minutes (schedule is in netlify.toml).
 *
 * For every project board with a "Client Portal" group:
 *   1. Portal row set to "Create link"  ->  makes a new private link, saves it in Client Link,
 *      sets Portal to "Live" and notes it on the Portal row. The old link stops working.
 *   2. A stage row marked Done with no Completion Date  ->  fills in the date it was marked Done.
 *   3. Emails the client (Client Email on the Portal row) when, in the last 5 minutes,
 *        - a stage row was marked Done (the project moved to the next stage),
 *        - a row was set to "Client To-Do", or
 *        - a row was set to "DOCUMENTS".
 *      One email per board per run, only while Portal is "Live". Each email is logged as an
 *      update on the Portal row so the team can see what went out.
 *
 * Env vars: MONDAY_API_TOKEN (required), RESEND_API_KEY (emails skipped without it),
 *           FROM_EMAIL (optional), PORTAL_EMAILS=off (optional: turns emails off)
 */

const crypto = require("crypto");
const lib = require("../portal-lib.js");

const WINDOW_MS = 5 * 60 * 1000;
const DEFAULT_FROM = "SOKO Designs <kris@sokodesigns.com>";
const REPLY_TO = "kris@sokodesigns.com";
const PHONE = "480-660-3133";

exports.handler = async function () {
  const now = Date.now();
  // The 5-minute slot that just ended. Rounding (not flooring) keeps a slightly early or late
  // run from looking at the same slot twice.
  const end = Math.round(now / WINDOW_MS) * WINDOW_MS;
  const start = end - WINDOW_MS;
  const inWindow = (iso) => { const t = Date.parse(iso || ""); return t >= start && t < end; };

  const summary = { boards: 0, links: 0, dates: 0, emails: 0, errors: 0 };
  try {
    const list = await lib.listPortalBoards();
    const portals = await lib.readPortals(list);
    summary.boards = portals.length;
    for (const portal of portals) {
      try {
        await syncBoard(portal, inWindow, summary);
      } catch (err) {
        summary.errors++;
        console.error(`portal-sync board ${portal.boardId}:`, err && err.message);
      }
    }
  } catch (err) {
    console.error("portal-sync failed:", err && err.message);
    return { statusCode: 500 };
  }
  console.log("portal-sync", JSON.stringify(summary));
  return { statusCode: 200 };
};

async function syncBoard(portal, inWindow, summary) {
  const c = lib.classify(portal);
  const row = c.portalRow;
  if (!row) return;
  const L = lib.LABELS;

  // 1. New / replacement link
  if (lib.lower(row.status) === lib.lower(L.create)) {
    const url = lib.linkFor(portal.boardId, crypto.randomBytes(32).toString("base64url"));
    await setColumns(portal.boardId, row.id, {
      [lib.COL.link]: { url, text: "Client portal" },
      [lib.COL.status]: { label: L.live },
    });
    await note(row.id, "New client portal link made. Any older link for this project no longer works.");
    row.status = L.live;
    row.link = url;
    summary.links++;
    row.justCreated = true; // you text the new link yourself, so no email on this run
  }

  // 2. Completion dates on finished stages
  for (const s of c.stages) {
    if (lib.lower(s.status) === lib.lower(L.done) && !s.completion && s.completionCol) {
      const date = lib.phoenixDate(s.statusChangedAt) || lib.phoenixToday();
      await setColumns(portal.boardId, s.id, { [s.completionCol]: { date } });
      summary.dates++;
    }
  }

  // New versions: a subitem under a (not N/A) stage with a Drive link and no "Sent to Client" date yet
  const newVersions = c.stages
    .filter((s) => lib.lower(s.status) !== lib.lower(L.skip))
    .flatMap((s) => lib.versionsOf(s).filter((v) => !v.sent).map((v) => ({ ...v, stage: lib.stageName(s.name) })));
  const stampSent = async () => {
    for (const v of newVersions) {
      if (v.boardId) await setColumns(v.boardId, v.id, { sent_to_client: { date: lib.phoenixToday() } });
    }
  };

  // 3. Client email
  if (row.justCreated) { await stampSent(); return; } // the client sees everything when they open the new link
  if (process.env.PORTAL_EMAILS === "off") return;
  if (lib.lower(row.status) !== lib.lower(L.live) || !c.email || !lib.tokenFromLink(row.link)) return;

  const moved = c.stages.some((s) => lib.lower(s.status) === lib.lower(L.done) && inWindow(s.statusChangedAt));
  // A row created with its status already set has no "changed at" time, so use when it was made.
  const when = (i) => i.statusChangedAt || i.createdAt;
  const todos = c.todos.filter((t) => inWindow(when(t)));
  const docs = c.docs.filter((d) => inWindow(when(d)));
  // Posts on the Client Updates row in the last 5 minutes (oldest first)
  const posts = (c.updatesRow ? c.updatesRow.updates : [])
    .filter((u) => inWindow(u.created_at) && String(u.text_body || "").trim())
    .sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
  if (!moved && !todos.length && !docs.length && !newVersions.length && !posts.length) return;

  const view = lib.clientView(portal, c);
  const lines = [];
  if (moved && view.stage) lines.push(view.stage.complete ? "Every stage of your project is done." : `Your project moved to the next stage: ${view.stage.name}.`);
  if (newVersions.length) lines.push(`${newVersions.length === 1 ? "A new version is" : "New versions are"} ready for your review: ${newVersions.map((v) => `${v.stage} ${v.name}`).join("; ")}.`);
  if (todos.length) lines.push(`We need something from you: ${todos.map((t) => t.name).join("; ")}.`);
  if (docs.length) lines.push(`New on your project page: ${docs.map((d) => d.name).join("; ")}.`);
  for (const p of posts) lines.push(`Update from SOKO: ${String(p.text_body).trim().slice(0, 1000)}`);
  const only = (x) => [moved, newVersions.length, todos.length, docs.length, posts.length].filter(Boolean).length === 1 && x;
  const subject = only(moved) && view.stage ? (view.stage.complete ? "Your project is complete" : `Your project moved to ${view.stage.name}`)
    : only(newVersions.length) ? (newVersions.length === 1 ? `Ready for your review: ${newVersions[0].stage} ${newVersions[0].name}` : "New versions are ready for your review")
    : only(todos.length) ? "We need something from you"
    : only(docs.length) ? "New documents for your project"
    : only(posts.length) ? "New update on your project"
    : "Update on your project";

  const sent = await sendEmail(c.email, view, subject, lines, row.link);
  if (sent) {
    await stampSent();
    await note(row.id, `Emailed the client (${c.email}): ${lines.join(" ").slice(0, 1500)}`);
    summary.emails++;
  }
}

async function sendEmail(to, view, subject, lines, link) {
  const key = process.env.RESEND_API_KEY;
  if (!key) { console.error("portal-sync: no RESEND_API_KEY, email skipped"); return false; }
  const hi = view.client ? `Hi ${view.client},` : "Hi,";
  const where = view.address ? ` for ${view.address}` : "";
  const text = [hi, "", ...lines, "", `See where things stand${where}:`, link, "", `Questions? Call ${PHONE}.`, "SOKO Designs"].join("\n");
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1A1A;max-width:560px">
<p>${esc(hi)}</p>
${lines.map((l) => `<p>${esc(l).replace(/\n/g, "<br>")}</p>`).join("\n")}
<p style="margin:26px 0"><a href="${esc(link)}" style="background:#3A6365;color:#fff;text-decoration:none;font-weight:600;padding:13px 22px;border-radius:3px;display:inline-block">See your project page</a></p>
<p style="color:#5B5B57;font-size:14px">Questions? Call <a href="tel:4806603133" style="color:#3A6365">${PHONE}</a>.<br>SOKO Designs</p>
</div>`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ from: process.env.FROM_EMAIL || DEFAULT_FROM, to: [to], reply_to: REPLY_TO, subject, text, html }),
  });
  if (!res.ok) { console.error("portal-sync email failed:", res.status, (await res.text()).slice(0, 300)); return false; }
  return true;
}

async function setColumns(boardId, itemId, values) {
  await lib.monday(
    `mutation ($b: ID!, $i: ID!, $v: JSON!) { change_multiple_column_values (board_id: $b, item_id: $i, column_values: $v) { id } }`,
    { b: String(boardId), i: String(itemId), v: JSON.stringify(values) });
}

async function note(itemId, body) {
  await lib.monday(`mutation ($i: ID!, $t: String!) { create_update (item_id: $i, body: $t) { id } }`, { i: String(itemId), t: body });
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}

// Exposed for local tests only
exports._test = { syncBoard };
