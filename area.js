/* ---- Service-area rules, shared by the browser (form.js) and the Netlify
   function (lead.js). Maricopa County, Arizona only.

   Rule: ZIP 85001-85099 (Phoenix), 85201-85299 (East Valley) except
   85217-85220 (Apache Junction, Pinal County), 85301-85399 (West Valley),
   plus 85142 (Queen Creek). Everything else is out of area. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.SOKO_AREA = factory();
})(typeof self !== "undefined" ? self : this, function () {

  var CITY = {
    85253:"Paradise Valley", 85331:"Cave Creek", 85377:"Carefree", 85087:"New River",
    85268:"Fountain Hills", 85269:"Fountain Hills", 85263:"Rio Verde", 85264:"Fort McDowell",
    85250:"Scottsdale",85251:"Scottsdale",85252:"Scottsdale",85254:"Scottsdale",85255:"Scottsdale",85256:"Scottsdale",85257:"Scottsdale",85258:"Scottsdale",85259:"Scottsdale",85260:"Scottsdale",85261:"Scottsdale",85262:"Scottsdale",85266:"Scottsdale",85267:"Scottsdale",85271:"Scottsdale",
    85201:"Mesa",85202:"Mesa",85203:"Mesa",85204:"Mesa",85205:"Mesa",85206:"Mesa",85207:"Mesa",85208:"Mesa",85209:"Mesa",85210:"Mesa",85211:"Mesa",85212:"Mesa",85213:"Mesa",85214:"Mesa",85215:"Mesa",85216:"Mesa",
    85224:"Chandler",85225:"Chandler",85226:"Chandler",85244:"Chandler",85246:"Chandler",85248:"Chandler",85249:"Chandler",
    85233:"Gilbert",85234:"Gilbert",85236:"Gilbert",85295:"Gilbert",85296:"Gilbert",85297:"Gilbert",85298:"Gilbert",85299:"Gilbert",
    85142:"Queen Creek",
    85280:"Tempe",85281:"Tempe",85282:"Tempe",85283:"Tempe",85284:"Tempe",85285:"Tempe",85287:"Tempe",85288:"Tempe",85289:"Tempe",
    85301:"Glendale",85302:"Glendale",85303:"Glendale",85304:"Glendale",85305:"Glendale",85306:"Glendale",85307:"Glendale",85308:"Glendale",85309:"Glendale",85310:"Glendale",85311:"Glendale",85312:"Glendale",85318:"Glendale",
    85345:"Peoria",85380:"Peoria",85381:"Peoria",85382:"Peoria",85383:"Peoria",85385:"Peoria",
    85374:"Surprise",85378:"Surprise",85379:"Surprise",85387:"Surprise",85388:"Surprise",
    85323:"Avondale",85392:"Avondale", 85338:"Goodyear",85395:"Goodyear", 85326:"Buckeye",85396:"Buckeye",
    85340:"Litchfield Park", 85335:"El Mirage", 85353:"Tolleson", 85363:"Youngtown",
    85351:"Sun City",85372:"Sun City",85373:"Sun City", 85375:"Sun City West",85376:"Sun City West",
    85337:"Gila Bend", 85390:"Wickenburg",85358:"Wickenburg", 85361:"Wittmann", 85355:"Waddell",
    85354:"Tonopah", 85320:"Aguila", 85322:"Arlington", 85342:"Morristown", 85343:"Palo Verde", 85329:"Cashion",
    85339:"Laveen"
  };

  // Places that permit through Maricopa County rather than a city.
  var COUNTY = { "New River":1, "Rio Verde":1, "Fort McDowell":1, "Wittmann":1, "Waddell":1, "Tonopah":1,
                 "Aguila":1, "Arlington":1, "Morristown":1, "Palo Verde":1, "Cashion":1, "Sun City":1, "Sun City West":1 };
  var TOWN = { "Gilbert":1, "Queen Creek":1, "Cave Creek":1, "Carefree":1, "Paradise Valley":1,
               "Fountain Hills":1, "Youngtown":1, "Wickenburg":1, "Gila Bend":1 };

  function clean(z) { return String(z || "").trim().slice(0, 5); }

  function inArea(zip) {
    var z = clean(zip);
    if (!/^\d{5}$/.test(z)) return false;
    var n = +z;
    if (n === 85142) return true;
    if (n >= 85001 && n <= 85099) return true;
    if (n >= 85201 && n <= 85299) return !(n >= 85217 && n <= 85220);
    if (n >= 85301 && n <= 85399) return true;
    return false;
  }

  function cityFor(zip) {
    var z = clean(zip);
    if (!inArea(z)) return "";
    var n = +z;
    if (CITY[n]) return CITY[n];
    if (n <= 85099) return "Phoenix";
    if (n <= 85299) return "the East Valley";
    return "the West Valley";
  }

  function jurisdictionFor(zip) {
    var c = cityFor(zip);
    if (!c) return "";
    if (COUNTY[c]) return "Maricopa County";
    if (c === "the East Valley" || c === "the West Valley") return "your city";
    if (c === "Laveen") return "City of Phoenix";
    if (TOWN[c]) return "Town of " + c;
    return "City of " + c;
  }

  return { inArea: inArea, cityFor: cityFor, jurisdictionFor: jurisdictionFor, clean: clean };
});
