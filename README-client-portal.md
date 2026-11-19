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
| Current stage (for the team, and it triggers the stage email) | **Client Stage**, filled in automatically. Don't type in it. |

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
- Two webhooks pointing at `/.netlify/functions/portal-hook`: one on the `portal_status` column, one on subitem column changes.
- Column `client_stage` (Client Stage).
- The three email automations below.

---

# Client emails (Monday automations)

Emails go out from Monday, through the Gmail integration, to the project's **Email** column.
Each one links to the client's portal page. All three only send when **Portal is Live** and the column isn't empty.

| When | Monday rule (PROJECTS board, Automations) | Subject |
|---|---|---|
| A stage moves | **Client Stage** changes | Your project moved to the next stage |
| A to-do is added or edited | **Client To-Do** changes | Something is needed for your project |
| A document is added or edited | **Client Documents** changes | New documents for your project |

**How a stage move reaches Monday:**
1. You mark a stage subitem **Done** or **Skipped**.
2. The `portal-hook` function, via a webhook on subitem status changes, writes the new current stage into **Client Stage**.
3. That change fires the email. The column only changes when the stage really moves, so re-saving the same status sends nothing.

**Things to know:**
- **Any edit counts.** Fixing a typo in Client To-Do or Client Documents sends another email. Make the edit in one go.
- **No email when the link is first created.** You text that one yourself. Client Stage stays blank until the first stage is marked Done.
- **Check the Email column holds the client, not a GC,** before turning a portal on.
- **To pause emails for one client,** set Portal to Off. Their page goes dark too.
- **To change the wording,** edit the three rules in Monday (Automations, then "Send email").
- **`Client update:` posts don't send an email.** Monday can't filter updates by their text.

## Column group

Keep all the portal columns in one collapsible **Client Portal** column group on the PROJECTS board:
- Portal, Portal Link, Portal Token, Client Stage, Permit #, Client Summary, Client Next Step, Client To-Do, Client Documents.

The Monday API can't build column groups, so this is done by hand:
1. Open the first column's header menu (the three dots) and pick the grouping option. Monday labels it something like **Group columns** or **Add to group**. Make a new group called **Client Portal**.
2. Do the same for each of the other columns, adding them to that group.
