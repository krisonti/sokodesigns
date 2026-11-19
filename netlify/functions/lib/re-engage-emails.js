// SOKO Designs — ADU re-engagement sequence (12 emails, one every 14 days)
//
// HOW TO EDIT: change the text below and push to GitHub. Netlify redeploys in ~1 min.
// Each email has: subject, preview (inbox preview line), body (HTML).
// Set  draft: true  on any email you have NOT finished yet — the sender skips it until you remove the flag.
//
// Grounding facts used throughout (keep in sync with sokodevelopmentaz.com/adus):
//   Models: ~400 sf Studio Casita · ~600 sf One-Bedroom · ~800 sf Two-Level (1 bed)
//   Turnkey build investment: $99,000–$149,000 · Typical long-term rent: $1,450–$1,800/mo
//   AZ law: HB 2720 / HB 2928 — ADUs allowed by right on most single-family lots in larger cities
//   Phone: 602-878-8087 · Book a call: https://calendly.com/kris-sokodesigns/30min

const BOOK_URL = "https://calendly.com/kris-sokodesigns/30min";
const PHONE = "602-878-8087";
const QUALIFY_URL = "https://sokodevelopmentaz.com/adus";

const btn = (text, href = BOOK_URL) =>
  `<p style="text-align:center;margin:26px 0 8px"><a href="${href}" style="background:#4A7C7E;color:#fff;text-decoration:none;padding:13px 24px;border-radius:4px;font-family:Arial,sans-serif;font-weight:bold;display:inline-block">${text}</a></p>`;

const sig = `<p>Kris Ontiveros<br>SOKO Designs &middot; ${PHONE}</p>`;

const EMAILS = [
  // ---------------------------------- 1 ----------------------------------
  {
    subject: "The $250k ADU myth (and what one actually costs in Phoenix)",
    preview: "The number most people have in their head is wrong.",
    body: `
<p>When we talk to homeowners about a casita or ADU, the first thing most of them say is some version of: <em>"I looked into it, but it was way more than I expected."</em></p>
<p>Usually what they found was a custom-architect, blank-page project. Those can run $250,000 and up, and most of that money goes to design time, revisions, and a permit process that starts from zero.</p>
<h3>Where the cost actually lands</h3>
<p>Our three pre-designed, permit-ready models are built for Phoenix-area lots:</p>
<ul>
  <li><strong>~400 sq ft Studio Casita</strong> &mdash; guest suite, office, or short-stay rental</li>
  <li><strong>~600 sq ft One-Bedroom</strong> &mdash; true separate bedroom, ideal long-term rental</li>
  <li><strong>~800 sq ft Two-Level</strong> &mdash; maximizes a tight footprint</li>
</ul>
<p>Turnkey, meaning design, permits, and construction under one contract, these typically land between <strong>$99,000 and $149,000</strong>. Not a shell. Not "plus site work." The finished unit.</p>
<h3>The two things that swing the number</h3>
<p>1. <strong>Utility runs.</strong> How far the unit sits from your existing water, sewer, and electrical. Closer is cheaper.<br>
2. <strong>Site conditions.</strong> Slope, existing structures to remove, HOA design review.</p>
<p>Both are things we can read off a site visit in about 30 minutes, which is why we always start there before quoting a firm number.</p>
<p>Over the next few months I'll send an occasional note on the questions we hear most: permits, financing, whether your yard is big enough, and what you can actually do with one of these. No pressure. If it's ever useful to talk, my calendar is below.</p>
${btn("Book a free 30-minute call")}
${sig}`,
  },

  // ---------------------------------- 2 ----------------------------------
  // Swap in a real completed project (name, city, photos) when one is ready.
  {
    subject: "What a casita project actually looks like, start to finish",
    preview: "One typical project, walked through step by step.",
    body: `
<p>People ask what the process really feels like, so here is a typical One-Bedroom casita project on a standard Phoenix-metro lot, walked through in order. Numbers are rounded and illustrative, but this is the shape of almost every project we do.</p>
<h3>Week 0 &mdash; The site visit</h3>
<p>We measure the yard, locate the water, sewer, and electrical, check setbacks, and confirm the lot is eligible under Arizona's ADU law. You get a firm proposal within a few days, not a "starting at" number.</p>
<h3>Weeks 1&ndash;4 &mdash; Design, adapted to your lot</h3>
<p>Because we start from a permit-ready plan set, this stage is about placement, orientation, and finish selections, not months of drawing from scratch. You choose the exterior look, flooring, cabinets, and fixtures from curated packages.</p>
<h3>Permitting</h3>
<p>We submit, respond to city comments, and handle the back-and-forth. You don't visit a counter or decode a correction letter. Timelines vary by city, and we'll tell you the realistic window for yours.</p>
<h3>Construction</h3>
<p>Foundation, framing, roof, mechanical, finishes. One point of contact the whole way. You see a schedule up front and progress updates as we go.</p>
<h3>The result</h3>
<p>A ~600 sq ft one-bedroom with a full kitchen and bath, ready for a family member or a long-term tenant at <strong>$1,450&ndash;$1,800/month</strong> in most metro neighborhoods.</p>
<p>The whole thing runs on a single contract with milestone payments, so there is never a moment where you are hunting for a subcontractor or wondering who is responsible.</p>
${btn("See if your property qualifies", QUALIFY_URL)}
${sig}`,
  },

  // ---------------------------------- 3 ----------------------------------
  {
    subject: "4 ways to use a casita you probably haven't thought of",
    preview: "It's not just a rental or a guest room.",
    body: `
<p>Most people picture one of two things when they think "casita": a place for guests, or a rental. Both are great. But the homeowners who get the most out of theirs usually planned for it to change jobs over time.</p>
<h3>1. The "aging in place" plan, in reverse</h3>
<p>Instead of moving a parent into your house, move <em>yourself</em> into the casita later and rent or gift the main house to your kids. Single-level, no stairs, your own kitchen, and family fifty feet away.</p>
<h3>2. The launch pad</h3>
<p>Adult children saving for a down payment, a nephew starting at ASU, a friend between apartments. A private door and a real kitchen means everyone keeps their sanity.</p>
<h3>3. The business address</h3>
<p>Therapists, accountants, hair stylists, tutors, and consultants use a detached unit as a client-facing office. Clients never walk through your living room, and the space may be deductible as a business expense (ask your CPA).</p>
<h3>4. The house-hack</h3>
<p>Live in the casita for a year while renting out the main house. In many neighborhoods the main house rents for more than the mortgage, and you bank the difference.</p>
<p>The nice part: a ~600 sq ft One-Bedroom does all four of these without changing a thing. It's one of the few home improvements that keeps earning its keep as your life changes.</p>
${btn("Book a free 30-minute call")}
${sig}`,
  },

  // ---------------------------------- 4 ----------------------------------
  {
    subject: "The math on a $120k casita (rent, value, payback)",
    preview: "Simple numbers, no spreadsheet required.",
    body: `
<p>Let's do the arithmetic most people never quite get around to.</p>
<h3>Rental income</h3>
<p>A one-bedroom casita in most Phoenix-metro neighborhoods rents long-term for <strong>$1,450&ndash;$1,800 a month</strong>. Call it $1,600 to keep it simple. That's about <strong>$19,000 a year</strong> before expenses, and a detached unit has very little in the way of expenses beyond insurance and occasional maintenance.</p>
<h3>Payback</h3>
<p>On a $120,000 build, $19,000 a year is a rough <strong>6&ndash;7 year payback</strong> if you paid cash. If you financed it, the rent typically covers the loan payment with room to spare, so the unit pays for itself from month one and you keep the asset.</p>
<h3>Property value</h3>
<p>Appraisers are increasingly treating ADUs as legal, income-producing square footage rather than a "bonus room." The added value varies by neighborhood and appraiser, so we don't promise a multiple. What we can say is that a permitted unit is far more valuable at resale than an unpermitted conversion, which lenders often won't count at all.</p>
<h3>The part people forget</h3>
<p>Rent goes up over time. Your build cost doesn't. A unit you build this year at $120k is still a $120k unit in ten years, while the rent it earns has likely climbed with the market.</p>
<p>None of this is financial advice, and every property is different. But if you'd like us to run these numbers on your actual lot, that's what the free call is for.</p>
${btn("Run the numbers on my property")}
${sig}`,
  },

  // ---------------------------------- 5 ----------------------------------
  {
    subject: "\"Do I even need a permit?\" (and why the answer is good news)",
    preview: "Arizona changed the rules. Here's what that means for your lot.",
    body: `
<p>Permits scare people off more than cost does. So here's the short version.</p>
<h3>Yes, you need one. And that's the good news.</h3>
<p>In 2024 Arizona passed <strong>HB 2720</strong> (updated by HB 2928), which requires larger cities to allow ADUs on most single-family lots <strong>by right</strong>. "By right" means no public hearing, no neighbors voting, no zoning variance to fight for. If your lot meets the basic rules, the city has to issue the permit.</p>
<p>Before this law, getting a casita approved in some cities was a months-long negotiation. Now it's a checklist.</p>
<h3>What the checklist looks like</h3>
<ul>
  <li><strong>Setbacks</strong> &mdash; how far the unit sits from your property lines</li>
  <li><strong>Size</strong> &mdash; each city sets a maximum, and all three of our models are designed to fit under the common caps</li>
  <li><strong>Height</strong> &mdash; usually not an issue for single-story; we design the Two-Level to comply</li>
  <li><strong>Utilities</strong> &mdash; how the unit ties into water, sewer, and power</li>
</ul>
<h3>What we do about it</h3>
<p>We prepare the drawings, submit them, and answer every city comment ourselves. Because our plans are already built to these standards, the review is usually about your specific lot, not the design. You never visit the permit counter.</p>
<h3>One honest caveat</h3>
<p><strong>HOAs</strong> are separate from the city. Most allow ADUs but require a design review. We read your CC&amp;Rs up front so there are no surprises.</p>
${btn("Check if my lot qualifies", QUALIFY_URL)}
${sig}`,
  },

  // ---------------------------------- 6 ----------------------------------
  {
    subject: "5 ways homeowners pay for a casita",
    preview: "Most people don't write a check for the whole thing.",
    body: `
<p>A quick tour of how the projects we build actually get funded. Most homeowners use one of these, and a fair number combine two.</p>
<h3>1. Home equity line of credit (HELOC)</h3>
<p>The most common. You borrow against equity you already have, draw as construction milestones come due, and the rent typically covers the payment. Flexible, and you only pay interest on what you've drawn.</p>
<h3>2. Cash-out refinance</h3>
<p>Replace your mortgage with a larger one and take the difference in cash. Makes sense when your current rate is close to today's rates. Less appealing if you're sitting on a low rate you don't want to give up.</p>
<h3>3. Renovation / construction loan</h3>
<p>Some lenders offer loans that count the <em>future</em> value of the property with the ADU, which helps if you're short on equity today. We can point you to lenders who understand ADUs.</p>
<h3>4. Cash, or cash plus a smaller loan</h3>
<p>Some owners pay the design and permit phase from savings and finance only construction, which shrinks the loan and the interest.</p>
<h3>5. Family partnership</h3>
<p>A parent or adult child who will live in the unit contributes to the build. More common than you'd think, and it keeps everyone's money in the family instead of paying rent to a stranger.</p>
<p>We are not lenders and this isn't financial advice, but we've seen every one of these work. If you tell us which direction you're leaning, we'll structure the milestone schedule to match how the money arrives.</p>
${btn("Talk through my options")}
${sig}`,
  },

  // ---------------------------------- 7 ----------------------------------
  {
    subject: "\"My yard's too small.\" Probably not.",
    preview: "The lot size most people think they need is off by half.",
    body: `
<p>This is the single most common reason people rule themselves out, and it's usually wrong.</p>
<h3>How much space a casita really takes</h3>
<p>Our ~400 sq ft Studio Casita has a footprint about the size of a two-car garage. Our ~800 sq ft Two-Level stacks its space, so it uses roughly the same footprint as the studio. If you can picture parking two cars side by side in your backyard, you very likely have room.</p>
<h3>What actually limits placement</h3>
<p>It's rarely total square footage. It's the setbacks (distance from property lines), plus anything already in the way: a pool, a big tree, a shed, or a septic field on county lots. Those are what we look at on a site visit.</p>
<h3>Tricks for tight lots</h3>
<ul>
  <li><strong>Go up.</strong> The Two-Level gets 800 sq ft of living space out of a studio-sized footprint.</li>
  <li><strong>Use the side yard.</strong> Many Phoenix ranch lots have a wide, unused side yard that's ideal.</li>
  <li><strong>Replace, don't add.</strong> An old shed, carport, or detached garage can often be removed and the casita placed on that spot.</li>
  <li><strong>Attached vs. detached.</strong> An attached unit shares a wall with the house and needs less yard.</li>
</ul>
<p>Rather than guess, send us the address. We'll pull the parcel and tell you honestly whether it's a fit and where the unit would likely sit. It's free and takes us about a day.</p>
${btn("Check my lot", QUALIFY_URL)}
${sig}`,
  },

  // ---------------------------------- 8 ----------------------------------
  {
    subject: "The casita nobody rents out",
    preview: "Some of the happiest owners never collect a dollar of rent.",
    body: `
<p>We talk a lot about rent and payback because that's what people ask about. But some of the happiest casita owners we know never rent theirs out at all.</p>
<h3>The in-laws who stopped staying in the guest room</h3>
<p>Two weeks a year of a parent in the spare bedroom is a lot. Two weeks a year in their own little house across the yard, with their own coffee maker and their own front door, is a vacation for everyone.</p>
<h3>The office with a commute of forty feet</h3>
<p>Working from the kitchen table stops being charming around year two. A detached studio with a real door, real quiet, and no laundry pile in the video call background changes how the whole house feels.</p>
<h3>The teenager who needs space, and so do you</h3>
<p>Seventeen-year-olds and their parents both benefit from a little distance. A casita gives them independence without the rent, and gives it back to you as a guest house when they leave.</p>
<h3>The hobby room that finally fits</h3>
<p>Art studio, music room, home gym, woodshop. Things that don't belong in the house get their own building and their own climate control.</p>
<p>The practical part: every one of these can become a rental later, the day your situation changes. That's the difference between a casita and a room addition. It has options.</p>
${btn("Book a free 30-minute call")}
${sig}`,
  },

  // ---------------------------------- 9 ----------------------------------
  {
    subject: "Why we can move faster than a custom build (behind the scenes)",
    preview: "The blank page is the slowest part of any project. We skip it.",
    body: `
<p>A little peek behind the curtain at why our projects move the way they do.</p>
<h3>We don't start from a blank page</h3>
<p>Each of our three models is a complete, engineered, permit-ready plan set. Structural, electrical, plumbing, energy calcs: done. When you pick a model, the design work left is adapting it to <em>your</em> lot: where it sits, which way it faces, what the exterior looks like, and your finishes. That's weeks, not months.</p>
<h3>We've already had the conversation with the city</h3>
<p>Because the same plans go through review again and again, we know what each city's plan checkers ask for and we submit it up front. Fewer comment rounds means fewer weeks waiting.</p>
<h3>Design and build are the same team</h3>
<p>When the designer and the builder are two different companies, every question becomes an email chain. Ours sit in the same room. A question on site gets answered the same day.</p>
<h3>We order long-lead items early</h3>
<p>Trusses, windows, and HVAC equipment get ordered while the permit is in review, not after, so the crew isn't standing around waiting on a delivery.</p>
<h3>You get one schedule and one contact</h3>
<p>You'll know the milestones before we break ground, and you'll know who to call when you have a question. It's the same person the whole way through.</p>
${btn("Book a free 30-minute call")}
${sig}`,
  },

  // ---------------------------------- 10 ----------------------------------
  {
    subject: "Which casita fits your yard? (a quick look at all three)",
    preview: "Studio, One-Bedroom, or Two-Level. Here's how people choose.",
    body: `
<p>A quick guide to our three models and who tends to pick each one.</p>
<h3>The Studio Casita &mdash; ~400 sq ft</h3>
<p>Open plan with a kitchenette and full bath. The footprint of a two-car garage. Owners choose this for a home office, a guest suite, a short-stay rental, or an adult child's first place. Lowest cost, fastest build, fits the most lots.</p>
<h3>The One-Bedroom &mdash; ~600 sq ft</h3>
<p>A true separate bedroom, full kitchen, full bath, and a living area that feels like a real apartment. This is the workhorse long-term rental and the most popular choice for family members moving in. The extra room is what makes it rentable at the top of the $1,450&ndash;$1,800 range.</p>
<h3>The Two-Level &mdash; ~800 sq ft</h3>
<p>Living, kitchen, and bath downstairs, bedroom upstairs. Uses roughly the same footprint as the Studio but gets you the most living space. The answer for tight lots and for owners who want the unit to feel like a small house.</p>
<h3>Making it yours</h3>
<p>Every model comes with a choice of exterior styles that match Phoenix-area neighborhoods. Inside, you pick from curated finish packages for flooring, cabinets, counters, and fixtures. You get real choices without the blank-page paralysis.</p>
<p>Renderings of all three are on our site, and we're happy to walk you through them on a call.</p>
${btn("See the models", QUALIFY_URL)}
${sig}`,
  },

  // ---------------------------------- 11 ----------------------------------
  // DRAFT: needs 2-3 real client quotes from Kris before it goes out. Remove  draft: true  once filled in.
  {
    draft: true,
    subject: "What our clients wish they'd known sooner",
    preview: "In their words, not ours.",
    body: `
<p>We asked a few recent clients what they'd tell someone who's still on the fence. Their answers had a theme: they all wished they'd started sooner.</p>
<h3>On the decision</h3>
<blockquote style="border-left:3px solid #4A7C7E;margin:0;padding:6px 16px;color:#444"><em>"[CLIENT QUOTE 1 &mdash; about what held them back and what changed their mind]"</em><br>&mdash; [First name, City]</blockquote>
<h3>On the process</h3>
<blockquote style="border-left:3px solid #4A7C7E;margin:0;padding:6px 16px;color:#444"><em>"[CLIENT QUOTE 2 &mdash; about permits/design/communication being easier than expected]"</em><br>&mdash; [First name, City]</blockquote>
<h3>On living with it</h3>
<blockquote style="border-left:3px solid #4A7C7E;margin:0;padding:6px 16px;color:#444"><em>"[CLIENT QUOTE 3 &mdash; about the rent / family / lifestyle result]"</em><br>&mdash; [First name, City]</blockquote>
<p>The common thread: the hardest part was the first phone call. Everything after that had a plan.</p>
${btn("Make the first call easy")}
${sig}`,
  },

  // ---------------------------------- 12 ----------------------------------
  {
    subject: "One last note (and a free offer, no strings)",
    preview: "If the timing is ever right, here's the easiest next step.",
    body: `
<p>This is the last of these notes, so I'll keep it short.</p>
<p>Over the past few months I've sent you what we know about building a casita in the Phoenix area: what it costs, how permits work, how people pay for it, and whether it fits in a normal-sized yard. If any of it was useful, I'm glad.</p>
<h3>A free feasibility chat, whenever you're ready</h3>
<p>If you'd like to know what's actually possible on your property, I'll do a free 30-minute feasibility review. You send the address, I pull the parcel, check the setbacks and city rules, and we talk through which model fits and what it would roughly cost. No proposal unless you ask for one. No follow-up pressure.</p>
<p>It's the same conversation I have with everyone before a site visit, and most people say it answered the questions they didn't know to ask.</p>
${btn("Book my free feasibility chat")}
<p>Or just reply to this email with your address and I'll take a first look.</p>
<p>Either way, thank you for reading. If the timing is ever right, you know where to find me.</p>
${sig}`,
  },
];

module.exports = { EMAILS, BOOK_URL, PHONE };
