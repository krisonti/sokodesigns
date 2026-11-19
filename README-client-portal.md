# Client portal

Every client can get a private status page at `sokodesigns.com/client/<code>/`.

The page reads the **Client Portal** group at the top of that project's own Monday board. Nobody edits the page itself: change the group and the page catches up within about a minute.

The group comes from the **RR, TI, RNB and VAR templates** (Main workspace > Templates). Any project board made from a template already has it.

## The Client Portal group

| Row | What it does |
|---|---|
| **Portal** | Put the client's email in **Client Email**. Set Status to **Create link**. Within 5 minutes the private link appears in **Client Link** and Status turns **Live**. Text that link to the client. |
| **Permit #** | Rename the row to include the number, e.g. `Permit # ADU-2026-01234`. Leave it as `Permit #` to hide it. |
| **Billing, Site Visit, Concept, Building Plans, Engineering, Permits** | The stages on the timeline, in this order. **Done** = finished. **N/A** = hidden from the client. Anything else = not done yet. The **end date of the Timeline** is the target date. **Completion Date** fills in by itself when you mark a stage Done. |
| **To-dos** (add your own rows) | Name the row after what you need (e.g. "Sign the design agreement") and set Status to **Client To-Do**. It shows under "Needed from you" until you mark it Done. You can put a link in **Client Link**. |
| **Documents** (add your own rows) | Name the row (e.g. "Permit set"), set Status to **DOCUMENTS** and put the Google Drive link in **Client Link**. Only Google Drive and Docs links show. Check the Drive sharing so the client can open it. |
| **Client Updates** | **Every update posted on this row shows on the client's page.** Post internal notes on any other row. |

Nothing else on the board ever reaches the page. That includes:
- the other groups,
- team rows inside the Client Portal group that aren't a stage, to-do or document,
- people, files and notes.

The page shows "On target" or "Behind target" from the dates. The current stage is behind when today is past its target date. A finished stage shows how many days late it was, if any.

The heading comes from the board name: `RR - 123 Main St - Smith` shows "Smith", "123 Main St" and "Residential remodel".

## Client emails

A background job runs every 5 minutes. It emails the client at **Client Email** when one of these happens:

| What you do | What the client gets |
|---|---|
| Mark a stage **Done** | "Your project moved to [next stage]" |
| Set a row to **Client To-Do** | "We need something from you" |
| Set a row to **DOCUMENTS** | "New documents for your project" |

- Several changes in the same 5 minutes go out as one email.
- Every email links to the client's page and gives 480-660-3133.
- Emails come from kris@sokodesigns.com, and replies go to you.
- Each email is logged as an update on the **Portal** row, so the team can see what went out.
- Emails only go out while Portal is **Live** and Client Email is filled in.
- No email goes out on the run that creates the link, because you text that one yourself.
- `Client Updates` posts don't send an email. Mention them in a to-do or call if they matter.
- To stop all portal emails at once, set the Netlify environment variable `PORTAL_EMAILS` to `off`.

## Replace or turn off a link

- **New link:** set Portal to **Create link** again. A new code is made within 5 minutes, and the old link stops working within about a minute after that.
- **Turn off:** set Portal to anything other than Live, e.g. ON HOLD. The link shows "This link isn't working". Set it back to **Live** to turn the same link on again.

## Change the stages

Stage names and the wording the client sees for each stage are in **`netlify/portal-config.js`**. Edit, commit, push.

- **Rename a stage:** change it in that file and on the rows in the templates (and any live boards).
- **Add a stage:** add it to that file, then add a row with the same name to the Client Portal group.
- Rows are shown in board order. A row whose name isn't in the config file isn't treated as a stage.
- Never call us architects or designers in the wording.

## How it's built

| Piece | File |
|---|---|
| Page | `client/index.html`, `client/portal.css` (on top of `/lp.css`), `client/portal.js` |
| Page data | `netlify/functions/portal.js`. It checks the code against the board's Portal row and returns only an allowlist of fields (`clientView` in `netlify/portal-lib.js`). It keeps results for 60 seconds. |
| Links, completion dates, emails | `netlify/functions/portal-sync.js`, every 5 minutes (schedule in `netlify.toml`) |
| Shared Monday reading | `netlify/portal-lib.js` |
| Stages and labels | `netlify/portal-config.js` |
| Routing / privacy | `_redirects` (`/client/*`), `netlify.toml` (noindex, no-referrer, strict content policy), `robots.txt` |

- **Links:** `/client/<boardId>-<43 random characters>/`. The board number alone opens nothing.
- **Env vars:** `MONDAY_API_TOKEN` and `RESEND_API_KEY` (both already set on Netlify). `FROM_EMAIL` and `PORTAL_EMAILS` are optional.
- **No analytics or outside scripts** on portal pages.
- **Layout check without Monday:** open `/client/?demo=1` to see sample data.

**Monday setup on each template:**
- a **Client Portal** group at the top;
- columns `client_link` (Client Link) and `client_email` (Client Email);
- Status labels **Create link**, **Live** and **Client To-Do**.

The job finds every board in the Main workspace with a group named exactly **Client Portal**. Boards with "Template" in the name are skipped.
