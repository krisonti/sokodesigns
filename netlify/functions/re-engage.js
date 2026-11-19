// SOKO Designs — ADU re-engagement drip: SCHEDULED job.
// Runs daily (schedule is set in netlify.toml → 9:00 AM Phoenix). Sends the next email to every
// lead whose Monday "Drip Status" is Active and whose last email was 14+ days ago.
// See lib/re-engage-core.js for the logic and lib/re-engage-emails.js for the copy.

const { runDrip } = require("./lib/re-engage-core");

exports.handler = async function () {
  try {
    const report = await runDrip({});
    return { statusCode: 200, body: JSON.stringify(report.summary) };
  } catch (err) {
    console.error("Scheduled drip failed:", err);
    return { statusCode: 500, body: String(err.message || err) };
  }
};
