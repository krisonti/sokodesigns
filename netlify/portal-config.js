/**
 * Client portal settings. EDIT THIS FILE to change stage wording or add a stage name.
 *
 * Every project board has a "Client Portal" group (it comes from the RR / TI / RNB / VAR
 * templates). The page reads that group:
 *   - "Portal" row ............ Client Email, and Client Link (the private link, made for you)
 *   - (client name, address, email and permit # come from the "Client Information" row under Sales)
 *   - stage rows .............. any row whose name is listed in STAGES below, in board order
 *   - to-do rows .............. Status = "Client To-Do" (hidden again once marked Done)
 *   - document rows ........... Status = "DOCUMENTS", with a Google Drive link in Client Link
 *   - "Client Updates" row .... every update posted on it shows on the page
 *
 * A stage row: Status Done = finished, N/A = hidden, anything else = not done yet.
 * Target date = end of its Timeline. Completion Date fills in by itself when marked Done.
 *
 * "summary" and "next" are what the page says while that stage is the current one.
 * Keep it short and plain. Never call us architects or designers.
 */

const STAGES = {
  "Billing": {
    summary: "We're getting the paperwork in place: estimate, agreement and deposit.",
    next: "Once the agreement is signed and the deposit is in, we schedule your site visit.",
  },
  "Site Visit": {
    summary: "We're visiting your property to measure and document what's there.",
    next: "We use the measurements to draw your concept.",
  },
  "Concept": {
    summary: "We're drawing the concept layout. You'll get it to review before we go further.",
    next: "Once you approve the concept, we start the building plans.",
  },
  "Building Plans": {
    summary: "We're drawing the full set of building plans.",
    next: "Engineering gets added next, then the set goes to the city.",
  },
  "Engineering": {
    summary: "Engineers are working on the structural and other drawings the city requires.",
    next: "When engineering is back, we submit for permits.",
  },
  "Permits": {
    summary: "Your plans are with the city for permit review. We handle the back and forth.",
    next: "Once the city approves, your permit is issued.",
  },
};

// Names and labels the page and sync job look for (match Monday exactly, case-insensitive)
const NAMES = {
  group: "Client Portal",
  portal: "Portal",
  updates: "Client Updates",
  info: "Client Information", // row under Sales: Client Name, Project Address, Client Email, Permit #
};
const LABELS = {
  done: "Done",
  skip: "N/A",
  todo: "Client To-Do",
  doc: "DOCUMENTS",
  create: "Create link",
  live: "Live",
};

// Board name prefix ("RR - 123 Main - Smith") -> what the client sees
const TYPE_NAMES = {
  RR: "Residential remodel",
  RNB: "Residential new build",
  NB: "New build",
  CNB: "Commercial new build",
  MF: "Multifamily",
  MFNB: "Multifamily new build",
  ADD: "Addition",
  ADU: "ADU",
  TI: "Tenant improvement",
  SP: "Site plan",
  VAR: "Variance",
  HVAC: "HVAC energy report",
};

module.exports = { STAGES, NAMES, LABELS, TYPE_NAMES };
