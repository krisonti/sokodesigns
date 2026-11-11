/**
 * Emails Kris when an intake form finishes uploading to Drive.
 *
 * The intake pages post their files to a Google Apps Script, which drops them
 * in a Drive folder and returns that folder's URL. Nothing in that chain tells
 * anyone a submission arrived — so the page calls this straight afterwards with
 * the folder link and a summary of the answers.
 *
 * Fire-and-forget by design: the client has already submitted successfully by
 * the time this runs, so a failure here must never surface to them.
 *
 * Env vars (shared with the other forms):
 *   RESEND_API_KEY    = required, or nothing is sent
 *   FROM_EMAIL        = optional
 *   LEAD_NOTIFY_EMAIL = optional
 */

const DEFAULT_FROM = "SOKO Designs <kris@sokodesigns.com>";
const DEFAULT_NOTIFY = "kris@sokodesigns.com";

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed." });

  let d;
  try { d = JSON.parse(event.body || "{}"); }
  catch { return json(400, { error: "Invalid payload." }); }

  const key = process.env.RESEND_API_KEY;
  if (!key) { console.error("No RESEND_API_KEY — intake notification skipped"); return json(200, { ok: false }); }

  const form = (d.form || "Intake").toString().slice(0, 80);
  const who = (d.name || "").toString().slice(0, 120);
  const company = (d.company || "").toString().slice(0, 120);
  const sid = (d.sid || "").toString().slice(0, 40);
  const folderUrl = String(d.folderUrl || "");
  const safeFolder = /^https:\/\/(drive|docs)\.google\.com\//.test(folderUrl) ? folderUrl : "";

  const facts = [
    ["Name", who],
    ["Business", company],
    ["Email", d.email],
    ["Phone", d.phone],
    ["Files uploaded", d.fileCount],
    ["Equipment rows", d.eqCount],
    ["Reference", sid],
  ];

  const sections = Array.isArray(d.sections) ? d.sections.slice(0, 30) : [];

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      from: process.env.FROM_EMAIL || DEFAULT_FROM,
      to: [process.env.LEAD_NOTIFY_EMAIL || DEFAULT_NOTIFY],
      reply_to: typeof d.email === "string" && d.email.includes("@") ? d.email : undefined,
      subject: `${form} submitted — ${who || company || "no name given"}`,
      html: `<div style="font-family:system-ui,Arial,sans-serif;font-size:15px;color:#1A1A1A;max-width:720px">
        <h2 style="font-size:20px;margin:0 0 6px">${esc(form)} submitted</h2>
        <p style="color:#5B5B57;margin:0 0 18px">The files are already in Drive. This is just the heads-up.</p>
        ${safeFolder ? `<p style="margin:0 0 20px"><a href="${esc(safeFolder)}"
            style="background:#4A7C7E;color:#fff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:5px;display:inline-block">Open the Drive folder</a></p>` : ""}
        <table style="border-collapse:collapse;margin-bottom:22px">${rows(facts)}</table>
        ${sections.map((s) => `
          <h3 style="font-size:15px;margin:18px 0 6px;color:#3A6365">${esc(s.title || "")}</h3>
          <table style="border-collapse:collapse">${rows((s.items || []).slice(0, 40).map((i) => [i.q, i.a]))}</table>
        `).join("")}
      </div>`,
    }),
  });

  if (!res.ok) {
    console.error("Resend error:", res.status, (await res.text()).slice(0, 220));
    return json(200, { ok: false });
  }
  return json(200, { ok: true });
};

function rows(pairs) {
  return pairs
    .filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== "")
    .map(([k, v]) =>
      `<tr><td style="padding:5px 16px 5px 0;color:#5B5B57;vertical-align:top;white-space:nowrap">${esc(k)}</td>` +
      `<td style="padding:5px 0"><b>${esc(v)}</b></td></tr>`)
    .join("");
}

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

function json(statusCode, body) {
  return { statusCode, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}
