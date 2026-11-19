// SOKO Designs — ADU re-engagement drip: one-click UNSUBSCRIBE.
// Every drip email links here with ?id=<monday item id>&t=<signature>. Valid link → Drip Status = Unsubscribed.

const { unsubscribe, verifyItem } = require("./lib/re-engage-core");

exports.handler = async function (event) {
  const q = event.queryStringParameters || {};
  const id = String(q.id || "").replace(/\D/g, "");
  if (!id || !verifyItem(id, q.t)) return page(400, "That unsubscribe link isn't valid.", "If you'd like to stop receiving emails, just reply to any of them with \"unsubscribe\" and we'll take care of it.");

  try {
    await unsubscribe(id);
    return page(200, "You're unsubscribed.", "You won't get any more emails from this series. If you ever want to talk casitas, we're at 602-878-8087.");
  } catch (err) {
    console.error("Unsubscribe failed:", err);
    return page(500, "Something went wrong.", "Please reply to the email with \"unsubscribe\" and we'll remove you by hand.");
  }
};

function page(statusCode, title, msg) {
  return {
    statusCode,
    headers: { "Content-Type": "text/html; charset=utf-8" },
    body: `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} — SOKO Designs</title></head>
<body style="margin:0;background:#F6F4EF;font-family:Georgia,'Times New Roman',serif;color:#1A1A1A">
<div style="max-width:520px;margin:60px auto;padding:0 20px">
  <div style="background:#4A7C7E;color:#fff;padding:18px 24px;border-radius:6px 6px 0 0;font-size:20px;font-weight:700">SOKO Designs</div>
  <div style="background:#fff;border:1px solid #E3DED3;border-top:none;padding:28px 24px;line-height:1.6">
    <h1 style="font-size:24px;margin:0 0 10px">${title}</h1>
    <p style="margin:0">${msg}</p>
  </div>
</div></body></html>`,
  };
}
