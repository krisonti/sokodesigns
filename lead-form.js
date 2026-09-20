/* ---- SOKO Designs — landing page lead form ----
   Posts to /.netlify/functions/lead, shows the thank-you state, and fires the
   Google Ads conversion. Each page sets window.SOKO_LP before loading this:

     window.SOKO_LP = {
       source: "Permit Plans page",       // shows up in the Monday note
       projectType: "Remodel",            // must match the board's Project Type labels
       conversionLabel: ""                // "AW-18011803346/xxxx" once created in Google Ads
     };
*/
(function () {
  function init() {
    var cfg  = window.SOKO_LP || {};
    var form = document.getElementById('lead-form');
    if (!form) return;

    var status = form.querySelector('.lp-status');
    var btn    = form.querySelector('.lp-submit');
    var fields = form.querySelector('.lp-fields');
    var done   = document.querySelector('.lp-done');

    // Tag the lead as paid traffic when the ad sends us a gclid.
    var params = new URLSearchParams(location.search);
    var leadSource = '';
    if (params.get('gclid') || (params.get('utm_source') || '').toLowerCase() === 'google') {
      leadSource = 'Paid Ad - Google';
    } else if ((params.get('utm_source') || '').toLowerCase() === 'facebook') {
      leadSource = 'Paid Ad - Meta';
    }

    function fail(el, msg) {
      var f = el.closest('.field');
      f.classList.add('err');
      var m = f.querySelector('.msg');
      if (m && msg) m.textContent = msg;
      el.addEventListener('input', function once() { f.classList.remove('err'); el.removeEventListener('input', once); });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      form.querySelectorAll('.field.err').forEach(function (f) { f.classList.remove('err'); });

      var data = {};
      new FormData(form).forEach(function (v, k) { data[k] = String(v).trim(); });

      var bad = null;
      ['name', 'phone', 'email'].forEach(function (k) {
        var el = form.querySelector('[name=' + k + ']');
        if (!el || !data[k]) { if (el) { fail(el, 'Required'); bad = bad || el; } }
      });
      var em = form.querySelector('[name=email]');
      if (em && data.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email)) {
        fail(em, 'Check this email address'); bad = bad || em;
      }
      if (bad) { bad.focus(); return; }

      data.source = cfg.source || document.title;
      data.projectType = data.projectType || cfg.projectType || 'Other';
      if (leadSource) data.leadSource = leadSource;

      // The board's Project Type list is short, so several choices collapse to
      // "Other". Keep the exact wording the person picked in the note.
      var sel = form.querySelector('select[name=projectType]');
      if (sel && sel.selectedIndex >= 0 && !data.scope) {
        data.scope = sel.options[sel.selectedIndex].textContent.trim();
      }

      btn.disabled = true;
      status.textContent = 'Sending…';

      fetch('/.netlify/functions/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      .then(function (r) { return r.json().catch(function () { return {}; }); })
      .catch(function () { return {}; })
      .then(function () {
        // The lead is captured either way; count the conversion.
        if (typeof gtag === 'function') {
          if (cfg.conversionLabel) gtag('event', 'conversion', { send_to: cfg.conversionLabel });
          gtag('event', 'generate_lead');
        }
        if (fields) fields.style.display = 'none';
        if (done) done.classList.add('show');
        status.textContent = '';
        if (done && done.scrollIntoView) done.scrollIntoView({ block: 'center', behavior: 'smooth' });
      });
    });
  }

  // FAQ accordion + scroll reveal, shared by the landing pages.
  function extras() {
    document.querySelectorAll('.faq-q').forEach(function (q) {
      q.addEventListener('click', function () { q.closest('.faq-item').classList.toggle('open'); });
    });
    var els = document.querySelectorAll('.reveal');
    if (!els.length) return;
    if (!('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    els.forEach(function (el) { io.observe(el); });
  }

  function boot() { init(); extras(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
