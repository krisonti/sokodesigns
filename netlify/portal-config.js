/**
 * Client portal settings: stage lists, default wording, and project type names.
 *
 * EDIT THIS FILE to change the stages. Then commit and push.
 *
 * How stages work:
 * - When someone sets a project's Portal column to "Create link", one subitem is made
 *   for each stage in that project's list (below). From then on the subitems ARE the
 *   timeline for that project. Editing this file only changes projects that get a
 *   portal later. Existing ones keep their subitems (rename or add subitems by hand).
 * - "summary" and "next" are the default wording shown for the current stage. Anything
 *   typed into the Client Summary / Client Next Step columns in Monday replaces them.
 *   Keep it short and plain. Never call us architects or designers.
 */

const STAGES = {
  "Discovery & Site Review": {
    summary: "We're collecting what we need to start: site measurements, property records and the rules that apply to your lot.",
    next: "Once we have the site information, we start laying out your plans.",
  },
  "Design": {
    summary: "We're working out the layout. You'll get a draft to review before we go further.",
    next: "After you approve the layout, we start the full permit drawings.",
  },
  "Construction Documents": {
    summary: "We're drawing the full permit set: plans, structural and the details the city needs to see.",
    next: "When the set is done and you've signed off, we submit it to the city.",
  },
  "Permit Submittal": {
    summary: "Your plans are going in to the city. We handle the application.",
    next: "The city assigns reviewers and starts its review.",
  },
  "City Review": {
    summary: "The city is reviewing your plans. Nothing is needed from you right now.",
    next: "The city will either approve the plans or send comments for us to address.",
  },
  "Corrections & Resubmittal": {
    summary: "The city sent back comments. We're making the changes and resubmitting.",
    next: "Once the city accepts the changes, the permit can be issued.",
  },
  "Permit Issued": {
    summary: "Your permit is issued.",
    next: "Pay any remaining city fees and line up your build.",
  },
  "Construction": {
    summary: "Your project is under construction.",
    next: "We'll post updates here as the work moves along.",
  },

  // Stages used only by the HVAC list below
  "Project Info Received": {
    summary: "We have your project information and are reviewing it.",
    next: "We start the load calculations.",
  },
  "Calculations": {
    summary: "We're running the calculations for your report.",
    next: "We send you the finished report.",
  },
  "Report Delivered": {
    summary: "Your report is done and delivered.",
    next: "Nothing else is needed. Call us if the city has questions.",
  },
};

// Stage lists. "default" is used for any project type not listed in TYPE_LIST.
const LISTS = {
  default: [
    "Discovery & Site Review",
    "Design",
    "Construction Documents",
    "Permit Submittal",
    "City Review",
    "Corrections & Resubmittal",
    "Permit Issued",
    "Construction",
  ],
  hvac: ["Project Info Received", "Calculations", "Report Delivered"],
};

// Monday "Type" label -> which list above to use
const TYPE_LIST = {
  HVAC: "hvac",
};

// Monday "Type" label -> what the client sees
const TYPE_NAMES = {
  MFNB: "Multifamily new build",
  RNB: "Residential new build",
  CNB: "Commercial new build",
  RR: "Residential remodel",
  ADD: "Addition",
  ADU: "ADU",
  TI: "Tenant improvement",
  SP: "Site plan",
  VAR: "Variance",
  HVAC: "HVAC energy report",
  "Gazebo/Patio": "Gazebo / patio",
};

function stagesForType(typeLabel) {
  return LISTS[TYPE_LIST[typeLabel] || "default"];
}

module.exports = { STAGES, LISTS, TYPE_LIST, TYPE_NAMES, stagesForType };
