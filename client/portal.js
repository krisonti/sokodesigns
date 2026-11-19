/* SOKO client portal: loads /client/<token>/ data and renders it.
   All project text is inserted with textContent, never as HTML. */
(function () {
  "use strict";

  var API = "/.netlify/functions/portal?t=";
  var PHONE = "480-660-3133";
  var $ = function (id) { return document.getElementById(id); };

  var token = (location.pathname.match(/^\/client\/([A-Za-z0-9_-]{32,64})\/?$/) || [])[1];
  // Demo: /client/?demo=1 renders sample data so the layout can be checked without Monday.
  var demo = /[?&]demo=1\b/.test(location.search);

  if (demo) { render(sample()); return; }
  if (!token) { notFound(); return; }

  fetch(API + encodeURIComponent(token), { credentials: "omit", cache: "no-store" })
    .then(function (res) {
      if (res.status === 404) { notFound(); return null; }
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    })
    .then(function (data) { if (data) render(data); })
    .catch(function () {
      message("We couldn't load your project", "Something went wrong on our end. Try again in a minute, or call " + PHONE + ".");
    });

  // ---------- states ----------

  function notFound() {
    message("This link isn't working",
      "It may have been replaced with a new one. Call " + PHONE + " and we'll send you the current link.");
  }

  function message(title, text) {
    var box = $("msg");
    box.textContent = "";
    box.appendChild(el("h1", null, title));
    box.appendChild(el("p", null, text));
    document.title = title + " | SOKO Designs";
  }

  // ---------- render ----------

  function render(d) {
    $("msg").hidden = true;
    $("portal").hidden = false;

    // 1. intro
    $("client-name").textContent = d.client || "Your project";
    setText("address", d.address);
    var facts = $("facts");
    addFact(facts, "Project", d.projectType);
    addFact(facts, "Permit", d.permit);
    addFact(facts, "Last updated", d.updated ? fmt(d.updated) : null);
    if (d.address) document.title = d.address + " | SOKO Designs";

    // 2. current status
    var s = d.stage;
    if (s) {
      $("stage-name").textContent = s.complete ? "Complete" : s.name;
      var flag = $("stage-flag");
      if (s.complete) flag.textContent = "Every stage is done.";
      else if (s.flag === "behind") { flag.appendChild(el("strong", null, "Behind target.")); flag.appendChild(document.createTextNode(" Target was " + fmt(s.target) + ".")); }
      else if (s.flag === "on") flag.textContent = "On target for " + fmt(s.target) + ".";
      else flag.hidden = true;
      setText("stage-summary", s.summary);
      if (s.next) $("stage-next").textContent = s.next; else $("stage-next-wrap").hidden = true;
    } else {
      $("stage-name").textContent = "Getting started";
      $("stage-flag").hidden = true;
      $("stage-summary").textContent = "We're setting up your project. This page will fill in as work moves along.";
      $("stage-next-wrap").hidden = true;
    }

    // 3. needed from you (only when there's something)
    if (d.todo && d.todo.length) {
      var todo = $("todo");
      d.todo.forEach(function (t) {
        var li = el("li");
        li.appendChild(el("span", null, t.text));
        if (t.url) li.appendChild(extLink(t.url, "Open", "btn"));
        todo.appendChild(li);
      });
      $("needed").hidden = false;
    }

    // 4. timeline
    if (d.timeline && d.timeline.length) {
      var ol = $("timeline");
      d.timeline.forEach(function (t) {
        var li = el("li", t.status);
        if (t.status === "current") li.setAttribute("aria-current", "step");
        var mark = el("span", "mark");
        mark.setAttribute("aria-hidden", "true");
        if (t.status === "done") mark.innerHTML = '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2"><path d="M2.5 6.2l2.3 2.3 4.7-5"/></svg>';
        li.appendChild(mark);

        var name = el("div", "t-name", t.name);
        name.appendChild(el("span", "sr", t.status === "done" ? ", complete" : t.status === "current" ? ", current stage" : ", upcoming"));
        if (t.status === "current") name.appendChild(el("span", "t-now", "Current"));
        li.appendChild(name);

        var dates = el("div", "t-dates");
        var addDate = function (node) {
          if (dates.childNodes.length) dates.appendChild(document.createTextNode(" ")); // keeps screen readers from running them together
          dates.appendChild(node);
        };
        if (t.status === "done" && t.actual) addDate(el("span", null, "Done " + fmt(t.actual)));
        if (t.target) addDate(el("span", null, "Target " + fmt(t.target)));
        var flagText = t.flag === "late" ? plural(t.daysLate, "day") + " late"
          : t.flag === "behind" ? "Behind target"
          : t.flag === "on" ? "On target" : null;
        if (flagText) addDate(el("span", "t-flag " + t.flag, flagText));
        if (dates.childNodes.length) li.appendChild(dates);
        ol.appendChild(li);
      });
      $("timeline-sec").hidden = false;
    }

    // 5. documents
    if (d.documents && d.documents.length) {
      var docs = $("docs");
      d.documents.forEach(function (doc) {
        var a = extLink(doc.url, doc.label);
        a.appendChild(el("small", null, "Google Drive"));
        var li = el("li"); li.appendChild(a); docs.appendChild(li);
      });
      $("docs-sec").hidden = false;
    }

    // 6. updates
    if (d.updates && d.updates.length) {
      var ups = $("updates");
      d.updates.forEach(function (u) {
        var li = el("li");
        var time = el("time", null, fmt(u.date));
        time.setAttribute("datetime", u.date);
        li.appendChild(time);
        var body = el("div");
        u.text.split(/\n\s*\n|\n/).forEach(function (para) { if (para.trim()) body.appendChild(el("p", null, para.trim())); });
        li.appendChild(body);
        ups.appendChild(li);
      });
      $("updates-sec").hidden = false;
    }
  }

  // ---------- helpers ----------

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function extLink(url, text, cls) {
    var a = el("a", cls, text);
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    return a;
  }

  function setText(id, value) {
    var n = $(id);
    if (value) n.textContent = value; else n.hidden = true;
  }

  function addFact(dl, label, value) {
    if (!value) return;
    var wrap = el("div");
    wrap.appendChild(el("dt", null, label));
    wrap.appendChild(el("dd", null, value));
    dl.appendChild(wrap);
  }

  function fmt(ymd) {
    var p = String(ymd || "").split("-");
    if (p.length !== 3) return ymd || "";
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  function plural(n, word) { return n + " " + word + (n === 1 ? "" : "s"); }

  function sample() {
    return {
      client: "Jordan Rivera", address: "1234 E Sample Rd, Phoenix, AZ 85016",
      projectType: "ADU", permit: "ADU-2026-01234", updated: "2026-11-18",
      stage: { name: "City Review", complete: false, target: "2026-12-12", flag: "on",
        summary: "The city is reviewing your plans. Nothing is needed from you right now.",
        next: "The city will either approve the plans or send comments for us to address." },
      todo: [{ text: "Sign the design agreement", url: "https://example.com" }, { text: "Pick your exterior paint color", url: null }],
      timeline: [
        { name: "Discovery & Site Review", status: "done", target: "2026-09-12", actual: "2026-09-10", flag: "on" },
        { name: "Design", status: "done", target: "2026-10-03", actual: "2026-10-08", flag: "late", daysLate: 5 },
        { name: "Construction Documents", status: "done", target: "2026-11-01", actual: "2026-10-30", flag: "on" },
        { name: "Permit Submittal", status: "done", target: "2026-11-05", actual: "2026-11-04", flag: "on" },
        { name: "City Review", status: "current", target: "2026-12-12", actual: null, flag: "on" },
        { name: "Corrections & Resubmittal", status: "upcoming", target: "2027-01-09", actual: null, flag: null },
        { name: "Permit Issued", status: "upcoming", target: "2027-01-23", actual: null, flag: null },
        { name: "Construction", status: "upcoming", target: null, actual: null, flag: null },
      ],
      documents: [{ label: "Permit set", url: "https://drive.google.com/" }, { label: "Signed agreement", url: "https://drive.google.com/" }],
      updates: [
        { date: "2026-11-18", text: "Plans are in with the City of Phoenix. First review usually takes 3 to 4 weeks." },
        { date: "2026-10-30", text: "Permit set is done. Thanks for signing off so fast." },
      ],
    };
  }
})();
