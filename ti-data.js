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
    },

    "Office": {
      slug: "office",
      title: "office",
      steps: function (ctx) {
        var s = [];
        s.push({ b: "Building permit.", t: "Commercial TI review by " + ctx.portal + ": floor plan, demising walls, reflected ceiling, finishes, and the MEP sheets for what moves." });
        s.push({ b: "Fire review.", t: "Occupant load and exits, sprinkler head relocation if walls move under existing heads, and alarm device coverage in new rooms." });
        s.push({ b: "Accessibility.", t: "Accessible route from the entry, restrooms, door hardware, and counter heights. The reviewer checks it on every office TI, new or old building." });
        if (ctx.prevUse === "Retail, medical, or other use") s.push({ b: "Change of occupancy.", t: "Moving to office from retail or medical means a new occupant load and a restroom count check. We design to it so it isn't a correction." });
        else if (ctx.prevUse === "Vacant shell") s.push({ b: "Shell build-out.", t: "Restrooms, HVAC distribution, lighting, and power from the landlord's shell. Their shell drawings are the starting point; we'll ask for them." });
        else if (ctx.prevUse === "Was an office") s.push({ b: "Second-generation office.", t: "Existing restrooms, HVAC zones, and sprinklers may carry over. We confirm each one, which is where most 2nd-gen savings come from." });
        if (ctx.headcount === "51-100" || ctx.headcount === "100+") s.push({ b: "Larger occupant load.", t: "Above 49 occupants the space needs two exits and the restroom count climbs. We plan the layout around that from the first sketch." });
        s.push({ b: "Landlord sign-off.", t: "Most leases require the landlord's approval of the drawings before submittal. We format the set so that review is quick." });
        s.push({ b: "Inspections and Certificate of Occupancy.", t: "Building and fire sign-offs, then you move in." });
        return s;
      },
      checklist: [
        "Lease or LOI with the rent-commencement date, the landlord's TI allowance, and the work-letter (what the landlord delivers vs. what you build)",
        "Landlord's space plan, shell drawings, or the previous tenant's as-builts (property managers almost always have a PDF)",
        "Headcount today and in two years, and how many private offices vs. open seats",
        "Rooms you need: conference, phone booths, break room, server/IT closet, storage, reception",
        "IT and power needs: server room cooling, dedicated circuits, standing desks",
        "Any landlord rules on finishes, ceiling, lighting, or after-hours work",
        "Photos of the space as it sits today, including the ceiling and the electrical room"
      ],
      needs: ["Floor plan with demising walls, offices, and furniture layout", "Reflected ceiling plan with lighting and sprinkler heads", "Power and data plan", "HVAC zoning for new rooms", "Accessibility and egress"]
    },

    "Salon & Spa": {
      slug: "salons",
      title: "salon, spa, or barbershop",
      steps: function (ctx) {
        var s = [];
        s.push({ b: "Building permit.", t: "Commercial TI review by " + ctx.portal + ": station layout, plumbing for every bowl and sink, electrical for hot tools and dryers, finishes, and accessibility." });
        s.push({ b: "Plumbing and water heater.", t: "Shampoo bowls, pedicure chairs, hand sinks, and a water heater sized for them. This is the most common salon correction and we size it before submittal." });
        s.push({ b: "Ventilation.", t: "Nail services need source-capture exhaust under the mechanical code; hair and spa need makeup air for the dryers and steam. Drawn in the mechanical sheet." });
        s.push({ b: "Accessibility.", t: "Accessible route, restroom, and at least one accessible station and shampoo position. Reviewers look for it every time." });
        if (ctx.prevUse === "Was a salon or barbershop") s.push({ b: "Second-generation salon.", t: "Existing plumbing stubs, water heater, and restrooms may carry over. We verify each one, which is where 2nd-gen savings come from." });
        else if (ctx.prevUse === "Retail or office") s.push({ b: "New plumbing runs.", t: "Retail and office rarely have the drains where a salon needs them. We lay out stations around the existing sanitary line where we can, to limit saw-cutting." });
        s.push({ b: "Arizona State Board inspection.", t: "After the city signs off, the Arizona Board of Barbering & Cosmetology inspects and issues the salon license. Our layout is drawn to pass it." });
        s.push({ b: "Inspections and Certificate of Occupancy.", t: "Building and fire sign-offs, then the Board visit, then you open." });
        return s;
      },
      checklist: [
        "Lease or LOI with the rent-commencement date and the landlord's TI allowance",
        "Landlord's space plan or the previous tenant's drawings",
        "Station count by service: cutting chairs, shampoo bowls, color bar, pedicure, manicure, treatment rooms",
        "Equipment list and specs: dryers, pedicure chairs (piped or pipeless), steamers, sterilizers, washer and dryer",
        "Whether you'll rent suites to independent stylists (affects demising and licensing)",
        "Where the existing water heater, electrical panel, and sanitary line are, if you know",
        "Photos of the space today, including the restroom and any existing plumbing"
      ],
      needs: ["Station layout with clearances and an accessible station", "Plumbing plan: bowls, sinks, pedicure chairs, water heater", "Mechanical: nail-salon source capture, makeup air", "Electrical: dryer and hot-tool circuits", "Accessibility and State Board layout rules"]
    },

    "Warehouse & Industrial": {
      slug: "warehouse",
      title: "warehouse or industrial space",
      steps: function (ctx) {
        var s = [];
        s.push({ b: "Building permit.", t: "Commercial TI review by " + ctx.portal + ": floor plan, any office build-out, restrooms, electrical for equipment, and the MEP sheets." });
        if (ctx.racking === "12 ft or taller") s.push({ b: "High-piled storage permit.", t: "Racking over 12 feet triggers a separate high-piled storage review by the fire department: commodity class, aisle widths, sprinkler density, smoke venting. We prepare it alongside the building set." });
        else if (ctx.racking === "Under 12 ft") s.push({ b: "Racking permit.", t: "Even under 12 feet, most cities want engineered racking drawings and anchor details. Short, but it has to be filed." });
        if (ctx.mezzanine === "Yes" || ctx.mezzanine === "Maybe") s.push({ b: "Mezzanine.", t: "Structural engineering, stair and guard details, egress from the platform, and the one-third floor-area rule. Drawn as part of the same set." });
        if (ctx.use === "Office build-out inside a warehouse" || ctx.use === "Showroom + warehouse") s.push({ b: "Office inside the warehouse.", t: "Business occupancy inside storage or factory space: separation, restroom count for the office headcount, HVAC for the conditioned area, and an accessible route from the parking lot." });
        s.push({ b: "Fire review.", t: "Occupancy classification, exits across the floor, exit signage, extinguishers, and any sprinkler changes for racking or new rooms." });
        if (ctx.use === "Light manufacturing" || ctx.use === "Auto, fabrication, or shop") s.push({ b: "Process and hazardous materials.", t: "Paint, solvents, compressed gas, or welding move the space from storage to factory occupancy and bring maximum-allowable-quantity rules. We classify it correctly up front." });
        s.push({ b: "Inspections and Certificate of Occupancy.", t: "Building and fire sign-offs, then the forklifts roll." });
        return s;
      },
      checklist: [
        "Lease or LOI with the rent-commencement date and the landlord's TI allowance",
        "Landlord's shell or as-built drawings, including the fire sprinkler drawings if the building has them",
        "What you store or make, roughly: commodity type, pallet heights, any flammables, paints, gases, or batteries",
        "Racking plan or the vendor's quote with rack heights and aisle widths",
        "Mezzanine wishes: size, what goes on it, stairs",
        "Office headcount and rooms needed inside the warehouse",
        "Dock and door needs, forklift charging, compressed air, 3-phase power",
        "Photos of the floor, the ceiling and sprinkler heads, the electrical room, and the docks"
      ],
      needs: ["Floor plan with racking, aisles, and exits", "High-piled storage package when racks exceed 12 ft", "Mezzanine structural and egress", "Office build-out, restrooms, HVAC", "Electrical for equipment and charging"]
    },

    "Church / Daycare / School": {
      slug: "churches",
      title: "church, daycare, or school",
      steps: function (ctx) {
        var s = [];
        s.push({ b: "Zoning first.", t: "Many Valley cities require a use permit for churches, daycares, and schools in commercial or industrial zones. We confirm it before drawing, because it's the one step that can't be fixed with a correction." });
        s.push({ b: "Building permit.", t: "Commercial TI review by " + ctx.portal + ": assembly layout, exits, restrooms, classrooms, and the MEP sheets." });
        if (ctx.prevUse === "Retail, office, or warehouse") s.push({ b: "Change of occupancy.", t: "Retail, office, or warehouse to assembly or educational means a new occupant load, more exits, more restroom fixtures, and often sprinklers. We design to it from the start." });
        else if (ctx.prevUse === "Was a church or assembly space") s.push({ b: "Second-generation assembly.", t: "Existing exits, restrooms, and sprinklers may carry over if the occupant load doesn't grow. We verify each one." });
        s.push({ b: "Fire review.", t: "Occupant load, exits with panic hardware, exit signage, alarms, and sprinklers. Assembly spaces over about 300 occupants, and most daycares and schools, bring sprinkler and alarm requirements." });
        if (ctx.use === "Daycare or preschool" || ctx.use === "Private school or tutoring" || ctx.use === "Mixed") s.push({ b: "Classrooms and licensing.", t: "Daycare and school rooms have their own occupancy, separation, and exit rules, and Arizona DHS licenses childcare after the building passes. We draw to both." });
        s.push({ b: "Accessibility.", t: "Accessible route, seating, restrooms, and the platform or stage. Reviewers check it on every assembly TI." });
        s.push({ b: "Inspections and Certificate of Occupancy.", t: "Building and fire sign-offs, then any state licensing visit, then doors open." });
        return s;
      },
      checklist: [
        "Lease, LOI, or deed, and the date you need to be in",
        "Landlord's shell or as-built drawings, including fire sprinkler drawings if the building has them",
        "Seat count for the main room, and whether seating is fixed or movable",
        "Rooms you need: classrooms, nursery, offices, kitchen or fellowship hall, stage, baptistry, storage",
        "Daycare or school plans, with ages and head counts per room",
        "Parking count on the site and the zoning of the property, if you know it",
        "Photos of the space today, including exits, restrooms, and the ceiling"
      ],
      needs: ["Assembly layout with occupant load and exits", "Restroom counts for assembly and classrooms", "Sprinkler and alarm scope", "Classroom and daycare rooms to Arizona DHS rules", "Zoning use-permit exhibits when required"]
    }
  };

  return { PORTAL: PORTAL, portalFor: portalFor, INDUSTRIES: INDUSTRIES };
});
