/* ---- TI industry data: who reviews what, per city and per industry ----
   Used by ti-form.js to build the "your permit path" panel after submit, and
   by netlify/functions/ti-lead.js for the checklist email. Add an industry by
   adding a key to INDUSTRIES; the page sets window.SOKO_LP.industry to match. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.SOKO_TI = factory();
})(typeof self !== "undefined" ? self : this, function () {

  // Building-permit desk by jurisdiction (keys match area.js cityFor()).
  var PORTAL = {
    "Phoenix": "City of Phoenix Planning & Development, submitted through SHAPE PHX",
    "Laveen": "City of Phoenix Planning & Development, submitted through SHAPE PHX",
    "Mesa": "City of Mesa Development Services, submitted through DIMES",
    "Scottsdale": "City of Scottsdale One Stop Shop / Permit Center",
    "Chandler": "City of Chandler Development Services, submitted through Citizen Access",
    "Gilbert": "Town of Gilbert Development Services online portal",
    "Tempe": "City of Tempe Community Development",
    "Glendale": "City of Glendale Permit Center",
    "Peoria": "City of Peoria Development & Engineering",
    "Surprise": "City of Surprise Community Development",
    "Goodyear": "City of Goodyear Development Services",
    "Avondale": "City of Avondale Development Services",
    "Buckeye": "City of Buckeye Development Services",
    "Queen Creek": "Town of Queen Creek Development Services",
    "Paradise Valley": "Town of Paradise Valley Community Development",
    "Fountain Hills": "Town of Fountain Hills Development Services",
    "Cave Creek": "Town of Cave Creek Planning & Building",
    "Litchfield Park": "City of Litchfield Park Community Development",
    "Tolleson": "City of Tolleson Building Safety",
    "El Mirage": "City of El Mirage Development Services"
  };
  function portalFor(city, jurisdiction) {
    if (PORTAL[city]) return PORTAL[city];
    if (jurisdiction === "Maricopa County") return "Maricopa County Planning & Development (Accela portal)";
    return "your city's building department";
  }

  var INDUSTRIES = {
    "Restaurant & Bar": {
      slug: "restaurants",
      title: "restaurant or bar",
      // Steps shown after submit. {portal} is replaced per city.
      steps: function (ctx) {
        var s = [];
        s.push({ b: "Building permit.", t: "Commercial TI review by " + ctx.portal + ": architectural, mechanical, electrical, plumbing, and structural if the hood or roof changes." });
        s.push({ b: "Health plan review.", t: "Maricopa County Environmental Services Department reviews the kitchen layout, finishes, sinks, and equipment. It runs alongside the city permit, not after it." });
        s.push({ b: "Fire review.", t: "Hood and duct suppression, occupant load, exit widths, and alarm or sprinkler changes." });
        s.push({ b: "Grease interceptor.", t: "Sized and approved through the city's water pretreatment program before plumbing rough-in." });
        if (ctx.prevUse === "Was a restaurant (2nd-generation space)") s.push({ b: "Second-generation shortcut.", t: "Existing hood, interceptor, and restrooms may be reusable. We verify each one before we draw, which is where most 2nd-gen savings come from." });
        else if (ctx.prevUse === "Retail or office") s.push({ b: "Change of occupancy.", t: "Retail or office to assembly means a new occupant load, restroom count, and accessibility check. We design to it from day one so it doesn't come back as a correction." });
        else if (ctx.prevUse === "Vacant shell") s.push({ b: "Full build-out.", t: "Utilities, restrooms, HVAC, and the kitchen from scratch. The landlord's shell drawings are the starting point; we'll ask for them." });
        s.push({ b: "Liquor license and signage.", t: "Arizona DLLC wants a floor plan for the license; the sign permit is separate. Both come from the same set." });
        s.push({ b: "Inspections and Certificate of Occupancy.", t: "Building, fire, and health sign-offs, then you open." });
        return s;
      },
      // Lead-magnet checklist emailed on submit.
      checklist: [
        "Lease or LOI with the rent-commencement date and the landlord's TI allowance",
        "Landlord's shell or as-built drawings (ask the property manager; most have a PDF)",
        "Your menu concept and equipment list, even rough: hood length, fryers, ovens, walk-in",
        "Seat count you want, bar or no bar, patio or no patio",
        "Whether the space was a restaurant before, and when",
        "Utility info: gas service, electrical panel size, water heater, existing grease interceptor",
        "Any liquor license plan (series), since the DLLC floor plan comes from the same set",
        "Photos of the space as it sits today, including the ceiling and the back-of-house"
      ],
      needs: ["Kitchen plan with hood, equipment schedule, and finish schedule", "Plumbing plan with grease interceptor, hand sinks, and floor drains", "Occupant load, exits, restrooms, and accessibility", "Mechanical: hood exhaust, makeup air, and dining HVAC", "Electrical: equipment loads and panel capacity"]
    }
  };

  return { PORTAL: PORTAL, portalFor: portalFor, INDUSTRIES: INDUSTRIES };
});
