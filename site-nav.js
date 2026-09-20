/* ---- SOKO shared mobile navigation ----
   Builds a hamburger menu from the existing desktop nav links, so the
   header stays usable on phones (previously every link was hidden). */
(function () {
  function init() {
    var nav = document.querySelector('header .nav');
    var menu = nav && nav.querySelector('.nav-menu');
    if (!nav || !menu || nav.querySelector('.nav-toggle')) return;

    // Root for the links: prefer the site root so /blog/ and /guides/ pages
    // get the same destinations as the homepage.
    var home = nav.querySelector('.brand-link');
    var base = home ? home.getAttribute('href') : '/';
    if (base === '../index.html') base = '/';
    if (base === 'index.html' || base === './') base = '/';

    var panel = document.createElement('div');
    panel.className = 'mnav';
    panel.id = 'mnav';

    // Rebuild the link list from the desktop menu, resolving in-page
    // anchors (#services) to the homepage when we are on a sub-page.
    Array.prototype.forEach.call(menu.querySelectorAll('a'), function (a) {
      var link = document.createElement('a');
      link.textContent = (a.textContent || '').trim();
      var href = a.getAttribute('href') || '#';
      if (href.charAt(0) === '#' && base !== '/') href = base + href;
      link.setAttribute('href', href);
      if (a.target) { link.target = a.target; link.rel = a.rel || 'noopener'; }
      if (href.indexOf("tel:") === 0) { link.className = "mnav-phone"; link.textContent = "Call " + link.textContent; }
      if (a.classList.contains('btn-teal')) link.className = 'mnav-cta solid';
      else if (a.classList.contains('btn')) link.className = 'mnav-cta ghost';
      panel.appendChild(link);
    });

    // Tap-to-call always available on mobile.
    if (!panel.querySelector('a[href^="tel:"]')) {
      var tel = document.createElement('a');
      tel.className = 'mnav-phone';
      tel.href = 'tel:4806603133';
      tel.textContent = 'Call 480-660-3133';
      panel.insertBefore(tel, panel.querySelector('.mnav-cta') || null);
    }

    var btn = document.createElement('button');
    btn.className = 'nav-toggle';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Menu');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', 'mnav');
    btn.appendChild(document.createElement('span'));

    nav.appendChild(btn);
    nav.parentNode.appendChild(panel);
    if (getComputedStyle(nav.parentNode).position === 'static') {
      nav.parentNode.style.position = 'relative';
    }

    function close() { panel.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); }

    btn.addEventListener('click', function () {
      var open = panel.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    panel.addEventListener('click', function (e) { if (e.target.tagName === 'A') close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    window.addEventListener('resize', function () { if (window.innerWidth > 940) close(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
