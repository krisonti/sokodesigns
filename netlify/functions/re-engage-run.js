// SOKO Designs — ADU re-engagement drip: MANUAL run / preview endpoint (for testing and one-off runs).
//
// Protected by the DRIP_SECRET env var. Open in a browser:
//
//   Preview (changes nothing, sends nothing):
//     https://www.sokodesigns.com/.netlify/functions/re-engage-run?key=YOUR_SECRET
//
//   Send a TEST of a lead's next email to yourself (Monday is NOT updated, lead keeps its place in the sequence):
//     ...re-engage-run?key=YOUR_SECRET&send=1&item=ITEM_ID&to=kris@sokodesigns.com&force=1
//
//   Run for real right now (same as the daily job):
//     ...re-engage-run?key=YOUR_SECRET&send=1

const { runDrip } = require("./lib/re-engage-core");

exports.handler = async function (event) {
  const q = event.queryStringParameters || {};
  const secret = process.env.DRIP_SECRET;
  if (!secret) return text(500, "DRIP_SECRET is not set in Netlify environment variables.");
  if (!q.key || q.key !== secret) return text(403, "Forbidden");

  const send = q.send === "1";
  try {
    const report = await runDrip({
      dryRun: !send,
      onlyItem: q.item || null,
      toOverride: q.to || null,
      force: q.force === "1",
      record: !q.to,
    });
    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify(report, null, 2) };
  } catch (err) {
    return text(500, "Error: " + (err.message || err));
  }
};

function text(statusCode, body) {
  return { statusCode, headers: { "Content-Type": "text/plain; charset=utf-8" }, body };
}
