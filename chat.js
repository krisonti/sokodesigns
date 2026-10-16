/**
 * Rosie chat widget loader — research pages only.
 *
 * Deliberately NOT on the lead-gen landing pages (/permit-plans,
 * /tenant-improvements, /ti/*, /adu, /casita-rules) or the client tools
 * (/selections, /intake/facility). Two reasons: those pages already have a
 * fixed call bar across the bottom on mobile, and their form submit is the
 * only thing that fires a Google Ads conversion. Rosie exposes no callback
 * when it captures a lead, so a chat lead there would be an untracked lead.
 *
 * Chat leads arrive by email from Rosie; they do not reach the Monday board.
 */
(function () {
  var BUSINESS_ID = "d74fad84-0e5e-4de9-8d74-30e877bdcb2d";

  // Rosie ships a bright turquoise (#2DD4BF) that reads as a different brand
  // next to the site's muted teal. It sets these custom properties inline on
  // the host element, so overriding them needs !important.
  var css = document.createElement("style");
  css.textContent =
    "rosie-widget{" +
    "--rosie-primary:#4A7C7E!important;" +
    "--rosie-primary-dark:#3A6365!important;" +
    "--rosie-primary-text:#FFFFFF!important;" +
    "}";
  document.head.appendChild(css);

  // Rosie pops its greeting open by itself a few seconds in. On a phone that
  // panel covers a third of the screen and sits over the page's own buttons,
  // so ask it to wait for a click. Rosie's remote settings can override this;
  // the matching switch lives in the Rosie dashboard.
  new MutationObserver(function (muts, obs) {
    var el = document.querySelector("rosie-widget");
    if (!el) return;
    el.setAttribute("widget-open-mode", "on_click");
    obs.disconnect();
  }).observe(document.documentElement, { childList: true, subtree: true });

  // Load Rosie's official snippet.
  var s = document.createElement("script");
  s.src = "https://widget.heyrosie.com/widget.js";
  s.async = true;
  s.setAttribute("data-rosie-business-id", BUSINESS_ID);
  document.head.appendChild(s);

  // Rosie fires no events of its own, so engagement is tracked by watching for
  // a click inside its element. Without this there is no way to tell whether
  // anyone uses the thing. Fires once per page view.
  var counted = false;
  document.addEventListener(
    "click",
    function (e) {
      if (counted || typeof gtag !== "function") return;
      var el = e.target;
      // The widget renders as <rosie-widget>; a click anywhere inside it
      // (launcher or panel) counts as engagement.
      var inWidget = false;
      while (el && el !== document.body) {
        var tag = el.tagName && el.tagName.toLowerCase();
        if (tag === "rosie-widget" || (el.id && String(el.id).indexOf("rosie") === 0)) {
          inWidget = true;
          break;
        }
        el = el.parentNode || (el.getRootNode && el.getRootNode().host);
      }
      if (!inWidget) return;
      counted = true;
      gtag("event", "chat_opened", {
        page_path: location.pathname,
        widget: "rosie"
      });
    },
    true // capture, so it still sees clicks the widget stops propagating
  );
})();
