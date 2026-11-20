# Client portal

Every client can get a private status page at `sokodesigns.com/client/<code>/`.

The page reads the **Client Portal** group at the top of that project's own Monday board. Nobody edits the page itself: change the group and the page catches up within about a minute.

The group comes from the **RR, TI, RNB and VAR templates** (Main workspace > Templates). Any project board made from a template already has it.

## Client info: the Client Information row (under Sales)

Client details live in one place: the **Client Information** row in the **Sales** group. The portal reads four columns from it:

| Column | Used for |
|---|---|
| **Client Name** | The name at the top of the client's page. Blank = taken from the board name. |
| **Project Address** | The address on the page. Blank = taken from the board name. |
| **Client Email** | Where portal emails go. |
| **Permit #** | Shown on the page once filled in. |

Everything else on that row stays internal: the Text column, phones, GC and landlord info, and its updates.

## The Client Portal group

| Row | What it does |
|---|---|
| **Portal** | Set Status to **Create link**. Within 5 minutes the private link appears in **Client Link** and Status turns **Live**. Text that link to the client. Fill in Client Email on the Client Information row first. |
| **Billing, Site Visit, Concept, Building Plans, Engineering, Permits** | The stages on the timeline, in this order. **Done** = finished. **N/A** = hidden from the client. Anything else = not done yet. The **end date of the Timeline** is the target date. **Completion Date** fills in by itself when you mark a stage Done. |
| **Versions** (subitems under a stage) | Under the stage row, add a subitem named the way the client should see it ("v1", "v2", "30CD", "60CD", "100CD"). Paste its link (Google Drive, DocuSign, Dropbox and so on) into the subitem's **Client Link**. Within 5 minutes the version shows under that stage and under "Needed from you" as "Review Concept: v2", and the client gets an email. **Sent to Client** fills in with the date. Mark the subitem **Done** once the client has signed off: it moves to "Reviewed" and leaves "Needed from you". Subitems without a link stay internal. To email a version again, clear its Sent to Client date. |
| **To-dos** (add your own rows) | Name the row after what you need (e.g. "Sign the design agreement") and set Status to **Client To-Do**. It shows under "Needed from you" until you mark it Done. You can put a link in **Client Link**. |
| **Documents** (add your own rows) | Name the row (e.g. "Permit set"), set Status to **DOCUMENTS** and put its link in **Client Link**. Check the sharing so the client can open it. |
| **Client Updates** | **Every update posted on this row shows on the client's page.** Post internal notes on any other row. |

Links must start with https. Monday links are never shown, because they are internal and need a login.

Nothing else on the board ever reaches the page. That includes:
- the other groups,
- team rows inside the Client Portal group that aren't a stage, to-do or document,
- people, files and notes.

The page shows "On target" or "Behind target" from the dates. The current stage is behind when today is past its target date. A finished stage shows how many days late it was, if any.

The project type comes from the board name: `RR - 123 Main St - Smith` shows "Residential remodel". So do the name and address when those columns are blank.


## Client emails

A background job runs every 5 minutes. It emails the client at **Client Email** when one of these happens:

| What you do | What the client gets |
|---|---|
| Mark a stage **Done** | "Your project moved to [next stage]" |
| Paste a link into a version subitem's **Client Link** | "Ready for your review: Concept v2" (sent once per version; Sent to Client is stamped) |
| Set a row to **Client To-Do** | "We need something from you" |
| Set a row to **DOCUMENTS** | "New documents for your project" |
| Post an update on the **Client Updates** row | "New update on your project", with the update text in the email |

- Several changes in the same 5 minutes go out as one email.
- Every email links to the client's page and gives 480-660-3133.
- Emails come from kris@sokodesigns.com, and replies go to you.
- Each email is logged as an update on the **Portal** row, so the team can see what went out.
- Emails only go out while Portal is **Live** and Client Email is filled in.
- No email goes out on the run that creates the link, because you text that one yourself.
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
- columns `client_name` (Client Name), `project_address` (Project Address) and `permit_no` (Permit #), filled in on the **Client Information** row. RNB uses its existing "Client Name" and "Client Email" columns instead (the portal also reads any column titled exactly that).
- Status labels **Create link**, **Live** and **Client To-Do**;
- on its subitems: columns `client_link` (Client Link) and `sent_to_client` (Sent to Client).

Boards made before 2026-11-19 don't have the subitem columns, so versions won't work on them unless the two columns are added with those exact ids.

The job finds every board in the Main workspace with a group named exactly **Client Portal**. Boards with "Template" in the name are skipped.
