/* ---- TI industry pages: two-step lead form + motion ----
   Step 1: ZIP, lease status, size, previous use. Out-of-area ZIPs stop politely.
   Step 2: contact and business details. Posts to /.netlify/functions/ti-lead
   and then shows the permit path for that industry and city.

   Each page sets window.SOKO_LP before this loads:
     window.SOKO_LP = { source, industry, conversionLabel, endpoint }
   Needs area.js and ti-data.js loaded first. */
(function () {
  var A = window.SOKO_AREA, T = window.SOKO_TI;

  function init() {
    var cfg  = window.SOKO_LP || {};
    var card = document.querySelector('.lp-form');
    var form = document.getElementById('lead-form');
    if (!form || !card || !A || !T) return;

    var status = form.querySelector('.lp-status');
    var btn    = form.querySelector('.lp-submit[type=submit]');
    var nextBtn= form.querySelector('.lp-next');
    var backBtn= form.querySelector('.lp-back-2');
    var fields = form.querySelector('.lp-fields');
    var done   = card.querySelector('.lp-done');
    var out    = card.querySelector('.lp-out');
    var zipEl  = form.querySelector('[name=zip]');
    var hint   = form.querySelector('.zip-hint');
    var steps  = card.querySelectorAll('.steps span');

    var params = new URLSearchParams(location.search);
    var leadSource = '';
    if (params.get('gclid') || (params.get('utm_source') || '').toLowerCase() === 'google') leadSource = 'Paid Ad - Google';
    else if ((params.get('utm_source') || '').toLowerCase() === 'facebook') leadSource = 'Paid Ad - Meta';

    function fail(el, msg) {
      var f = el.closest('.field'); if (!f) return;
      f.classList.add('err');
      var m = f.querySelector('.msg');
      if (m && msg) m.textContent = msg;
      ['input', 'change'].forEach(function (ev) {
        el.addEventListener(ev, function once() { f.classList.remove('err'); el.removeEventListener(ev, once); });
      });
    }
    function setStep(n) {
      card.classList.toggle('on-2', n === 2);
      for (var i = 0; i < steps.length; i++) steps[i].classList.toggle('on', i < n);
      var first = form.querySelector(n === 2 ? '.step-2 input' : '.step-1 input');
      if (first) setTimeout(function () { first.focus(); }, 50);
    }

    if (zipEl && hint) {
      zipEl.addEventListener('input', function () {
        var z = zipEl.value.replace(/\D/g, '').slice(0, 5);
        zipEl.value = z;
        if (z.length < 5) { hint.textContent = ''; return; }
        hint.textContent = A.inArea(z) ? 'Great, ' + A.cityFor(z) + ' is in our service area.' : '';
      });
    }

    function checkStep1() {
      var z = zipEl ? zipEl.value.trim() : '';
      if (!/^\d{5}$/.test(z)) { fail(zipEl, 'Enter the 5-digit ZIP of the space'); zipEl.focus(); return; }
      var bad = null;
      form.querySelectorAll('.step-1 select[required]').forEach(function (s) { if (!s.value && !bad) { fail(s, 'Pick one'); bad = s; } });
      if (bad) { bad.focus(); return; }
      if (!A.inArea(z)) {
        if (fields) fields.style.display = 'none';
        if (out) out.classList.add('show');
        if (typeof gtag === 'function') gtag('event', 'out_of_area', { zip: z });
        return;
      }
      setStep(2);
    }
    if (nextBtn) nextBtn.addEventListener('click', checkStep1);
    form.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !card.classList.contains('on-2') && e.target.tagName !== 'TEXTAREA') { e.preventDefault(); checkStep1(); }
    });
    card.querySelectorAll('.lp-out .lp-back').forEach(function (b) {
      b.addEventListener('click', function () {
        out.classList.remove('show');
        if (fields) fields.style.display = '';
        setStep(1);
        if (zipEl) { zipEl.value = ''; if (hint) hint.textContent = ''; zipEl.focus(); }
      });
    });
    if (backBtn) backBtn.addEventListener('click', function () { setStep(1); });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!card.classList.contains('on-2')) { checkStep1(); return; }
      form.querySelectorAll('.field.err').forEach(function (f) { f.classList.remove('err'); });

      var data = {};
      new FormData(form).forEach(function (v, k) { data[k] = String(v).trim(); });
      data.gcIntro = form.querySelector('[name=gcIntro]') && form.querySelector('[name=gcIntro]').checked ? 'yes' : '';

      var bad = null;
      ['name', 'phone', 'email'].forEach(function (k) {
        var el = form.querySelector('[name=' + k + ']');
        if (el && !data[k]) { fail(el, 'Required'); bad = bad || el; }
      });
      var em = form.querySelector('[name=email]');
      if (em && data.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email)) { fail(em, 'Check this email address'); bad = bad || em; }
      var ph = form.querySelector('[name=phone]');
      if (ph && data.phone && data.phone.replace(/\D/g, '').length < 10) { fail(ph, 'Enter a 10-digit phone number'); bad = bad || ph; }
      if (bad) { bad.focus(); return; }
      if (!A.inArea(data.zip)) { setStep(1); return; }

      data.source   = cfg.source || document.title;
      data.industry = cfg.industry || data.industry || 'Other TI';
      data.city     = A.cityFor(data.zip);
      data.jurisdiction = A.jurisdictionFor(data.zip);
      if (leadSource) data.leadSource = leadSource;
      if (params.get('gclid')) data.gclid = params.get('gclid');

      btn.disabled = true;
      status.textContent = 'Sending…';

      fetch(cfg.endpoint || '/.netlify/functions/ti-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      .then(function (r) { return r.json().catch(function () { return {}; }); })
      .catch(function () { return {}; })
      .then(function () {
        if (typeof gtag === 'function') {
          if (cfg.conversionLabel) gtag('event', 'conversion', { send_to: cfg.conversionLabel });
          gtag('event', 'generate_lead', { lead_type: 'TI', industry: data.industry });
        }
        if (typeof fbq === 'function') fbq('track', 'Lead', { content_name: cfg.source, content_category: data.industry });
        showDone(data);
      });
    });

    function showDone(data) {
      if (fields) fields.style.display = 'none';
      status.textContent = '';
      if (!done) return;
      var first = (data.name || '').split(' ')[0];
      var h = done.querySelector('h2');
      if (h && first) h.textContent = 'Got it, ' + first + '. Thank you.';
      var ind = T.INDUSTRIES[data.industry];
      var ol = done.querySelector('.path ol');
      var title = done.querySelector('.path h3');
      if (ind && ol) {
        var ctx = Object.assign({}, data, { portal: T.portalFor(data.city, data.jurisdiction) });
        if (title) title.textContent = 'Your ' + ind.title + ' in ' + data.city;
        ol.innerHTML = '';
        ind.steps(ctx).forEach(function (s) {
          var li = document.createElement('li');
          li.innerHTML = '<span><b>' + s.b + '</b> ' + s.t + '</span>';
          ol.appendChild(li);
        });
      }
      done.classList.add('show');
      if (done.scrollIntoView) done.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }

  /* ---- Motion: FAQ, reveal, parallax, counters, rent clock, permit path ---- */
  function extras() {
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    document.querySelectorAll('.faq-q').forEach(function (q) {
      q.addEventListener('click', function () { q.closest('.faq-item').classList.toggle('open'); });
    });

    // Scroll reveal (same geometry check as lead-form.js so it never leaves a blank page).
    var els = [].slice.call(document.querySelectorAll('.reveal'));
    var ticking = false;
    function check() {
      ticking = false;
      var h = window.innerHeight || document.documentElement.clientHeight;
      for (var i = els.length - 1; i >= 0; i--) {
        var r = els[i].getBoundingClientRect();
        if (r.top < h * 0.92 && r.bottom > 0) { els[i].classList.add('in'); els.splice(i, 1); }
      }
      var strip = document.querySelector('.ti-path:not(.in)');
      if (strip) { var rs = strip.getBoundingClientRect(); if (rs.top < h * 0.85) strip.classList.add('in'); }
      parallax();
    }
    function onScroll() { if (ticking) return; ticking = true; (window.requestAnimationFrame || function (f) { setTimeout(f, 16); })(check); }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    var pEls = [].slice.call(document.querySelectorAll('[data-parallax]'));
    function parallax() {
      if (reduce || !pEls.length) return;
      var vh = window.innerHeight || 800;
      pEls.forEach(function (el) {
        var r = (el.parentElement || el).getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        var speed = parseFloat(el.getAttribute('data-parallax')) || 0.2;
        var centre = r.top + r.height / 2 - vh / 2;
        el.style.transform = 'translate3d(0,' + (-centre * speed).toFixed(1) + 'px,0)';
      });
    }
    check();

    // Counters
    var cEls = [].slice.call(document.querySelectorAll('[data-count]'));
    function runCount(el) {
      var target = parseFloat(el.getAttribute('data-count')) || 0, suffix = el.getAttribute('data-suffix') || '', prefix = el.getAttribute('data-prefix') || '';
      if (reduce) { el.textContent = prefix + target + suffix; return; }
      var start = null, dur = 1400;
      function frame(t) { if (!start) start = t; var p = Math.min(1, (t - start) / dur); var e = 1 - Math.pow(1 - p, 3); el.textContent = prefix + Math.round(target * e) + suffix; if (p < 1) requestAnimationFrame(frame); }
      requestAnimationFrame(frame);
    }
    if ('IntersectionObserver' in window && cEls.length) {
      var io = new IntersectionObserver(function (entries) { entries.forEach(function (e) { if (e.isIntersecting) { runCount(e.target); io.unobserve(e.target); } }); }, { threshold: 0.4 });
      cEls.forEach(function (el) { io.observe(el); });
    } else cEls.forEach(runCount);

    // Rent clock: monthly rent slider -> cost per week / day of plan-review delay.
    var slider = document.getElementById('rent-slider');
    if (slider) {
      var outRent = document.getElementById('rent-out'), day = document.getElementById('rent-day'), week = document.getElementById('rent-week'), month = document.getElementById('rent-month');
      var fmt = function (n) { return '$' + Math.round(n).toLocaleString('en-US'); };
      var shown = { d: 0, w: 0, m: 0 };
      function render(animate) {
        var m = +slider.value, w = m * 12 / 52, d = m * 12 / 365;
        if (outRent) outRent.textContent = fmt(m);
        var targets = { d: d, w: w, m: m };
        if (reduce || !animate) { day.textContent = fmt(d); week.textContent = fmt(w); month.textContent = fmt(m); shown = targets; return; }
        var from = { d: shown.d, w: shown.w, m: shown.m }, start = null, dur = 500;
        function frame(t) {
          if (!start) start = t;
          var p = Math.min(1, (t - start) / dur), e = 1 - Math.pow(1 - p, 3);
          day.textContent = fmt(from.d + (targets.d - from.d) * e);
          week.textContent = fmt(from.w + (targets.w - from.w) * e);
          month.textContent = fmt(from.m + (targets.m - from.m) * e);
          if (p < 1) requestAnimationFrame(frame); else shown = targets;
        }
        requestAnimationFrame(frame);
      }
      slider.addEventListener('input', function () { render(true); });
      render(false);
    }

    // Hero image drifts toward the cursor on desktop.
    var media = document.querySelector('.ti-hero__media'), img = media && media.querySelector('img');
    if (img && !reduce && window.matchMedia('(pointer:fine)').matches) {
      var hero = document.querySelector('.ti-hero');
      hero.addEventListener('mousemove', function (e) {
        var r = hero.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        img.style.objectPosition = (55 + x * 4).toFixed(2) + '% ' + (50 + y * 4).toFixed(2) + '%';
      });
    }
  }

  function boot() { window.__sokoLP = true; init(); extras(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
