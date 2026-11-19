# Client portal

Every client gets a private status page at `sokodesigns.com/client/<long random code>/`.
The page reads from the Monday **PROJECTS** board. Nobody edits the page itself. Change
Monday and the page catches up within about a minute.

## Give a client a portal

1. Open the project on the PROJECTS board. Make sure these are filled in:
   - **Client Name** and **Address**. The address shows at the top of the page.
   - **Type**. It picks the stage list (HVAC jobs get a shorter list).
2. Set **Portal** to **Create link**.
3. Within a few seconds:
   - **Portal Link** fills in. That's the link you text the client.
   - **Portal** switches to **Live**.
   - One subitem appears for each stage.
4. On the subitems, type a **Target** date for each stage.

## Keep it up to date

| To change this on the page | Do this in Monday |
|---|---|
| Move to the next stage | Set that stage's subitem **Status** to **Done**. **Actual** fills in with today's date by itself. The next stage becomes current. |
| Skip a stage that doesn't apply (e.g. no corrections) | Set its subitem **Status** to **Skipped**. It disappears from the page. |
| Status summary / what's next | Type in **Client Summary** / **Client Next Step**. Leave blank to use the standard wording for the stage. |
| "Needed from you" | **Client To-Do**, one item per line. Add a link after a bar: `Sign the agreement \| https://...`. Empty = the section is hidden. |
| Documents | **Client Documents**, one per line: `Permit set \| https://drive.google.com/...`. Only Google Drive and Docs links show. Set the Drive sharing so the client can open it. |
| Updates | Post an update on the item that starts with **`Client update:`**. Only those show; every other update stays internal. |
| Permit number | **Permit #** |

Nothing else on the item is ever sent to the page: not NOTES, files, the project board link, people, the Phase column or other updates.

"On target" / "Behind target" is worked out from the dates. The current stage is behind when today is past its Target. A finished stage shows how many days late it was, if any.

## Replace a link (or turn a page off)

- **New link:** set **Portal** to **Create link** again. A new code is made and the old link stops working (give it up to a minute). The stages stay as they are.
- **Turn off:** set **Portal** to **Off**. The link shows "This link isn't working". Set it back to **Live** to turn it on again with the same link.

## Edit the stages

Stage names, their standard wording and which project types get which list all live in
**`netlify/portal-config.js`**. Edit, commit, push.

- Changes apply to portals created **after** the edit. Existing projects keep their subitems. Rename, add or reorder a project's subitems in Monday to change just that project.
- A subitem whose name isn't in the config still shows on the timeline. It just has no standard wording, so fill in Client Summary / Next Step for it.
- Never call us architects or designers in the wording.

## How it's built

| Piece | File |
|---|---|
| Page | `client/index.html`, `client/portal.css` (on top of `/lp.css`), `client/portal.js` |
| Data | `netlify/functions/portal.js`. It finds the item by Portal Token and returns only an allowlist of fields. It keeps results for 60 seconds per link. |
| Create / replace link | `netlify/functions/portal-hook.js`, called by a Monday webhook on the Portal column |
| Stages | `netlify/portal-config.js` |
| Routing / privacy | `_redirects` (`/client/*`), `netlify.toml` (noindex, no-referrer, strict content policy), `robots.txt` |

- **Env var:** `MONDAY_API_TOKEN` (already set on Netlify).
- **No analytics or outside scripts.** The content policy blocks them. The only outside request is Google Fonts, and it never sees the link.
- **Layout check without Monday:** open `/client/?demo=1` to see sample data.

**Monday setup this depends on:**
- PROJECTS columns `portal_status`, `portal_token`, `portal_link`, `permit_no`, `client_summary`, `client_next_step`, `client_todo`, `client_documents`.
- Subitem columns: Status (with a **Skipped** label), Target (`date0`), Actual (`actual_date`).
- A subitem automation: Status changes to Done, then set Actual to today.
- A webhook on `portal_status` pointing at `/.netlify/functions/portal-hook`.

---

# Client notifications (plan only, not built)

**Goal:** email the client a link to their portal when something they can see changes:
- the stage moves
- a new to-do
- a new `Client update:` post
- a new document

Internal edits never send anything.

## Options

| | Monday automations | Make.com | Netlify scheduled function |
|---|---|---|---|
| Setup | No code, but one rule per trigger | Visual scenario, another paid account | Code in this repo |
| Only client-facing changes? | **No.** "When column changes" fires on every typo fix. It can't tell a `Client update:` post from a team note. Stage changes happen on subitems, which can't easily email the parent's client. | Yes, with filters, but the filter logic would copy the portal's allowlist in a second place | **Yes.** It compares the exact same allowlisted data the page shows, so it can't trigger on an internal field. |
| Several edits at once | One email per edit | One email per edit unless you build batching | Batched into one email |
| Cost / moving parts | Included in plan | New subscription, another place to break | Free tier. Uses Resend, which the ADU drip already uses. |
| SMS | Twilio integration (paid) | Twilio module | Twilio or CallRail text API |

## Recommendation: Netlify scheduled function + Resend

The drip emails already run this way, so it's the same pattern.

1. **Every 15 minutes:** for each Live portal, build the same client-safe data the page uses and compare it with the copy saved last time (Netlify Blobs).
2. **Wait for edits to settle.** Send only when something changed **and** nothing has changed for 30 minutes. A burst of edits becomes one email.
3. **Send one short email:**
   - Subject: "Update on 1234 E Sample Rd"
   - A line or two on what's new, e.g. "Your project moved to City Review." or "We need one thing from you: sign the design agreement."
   - A button to open the portal.
4. **Guard rails:**
   - Phoenix business hours only (8am to 6pm).
   - At most one email per project per day, unless a new to-do appears.
   - No email when the link is first created, because you text that one yourself.
   - A **Portal Emails** checkbox column to turn emails off per client.
5. **Recipient:** the project's **Email** column. Check it holds the client and not a GC, or add a separate **Client Email** column.
6. **SMS later.** CallRail can send texts from the business number, which keeps replies in one place. Twilio needs A2P 10DLC registration, which takes a few weeks.

**Effort:** about a day to build and test, plus a `PORTAL_NOTIFY` switch so it can be turned off without a deploy.
