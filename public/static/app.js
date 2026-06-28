// DealSpot frontend JS
(function () {
  'use strict';

  // ============================================================
  // FIRST-PARTY ATTRIBUTION (UTM + landing page)
  // ------------------------------------------------------------
  // Third-party cookies are dying, so we capture campaign attribution as
  // first-party data. On the user's FIRST visit we record any utm_* params and
  // the landing page into a first-party cookie (ds_attr) + localStorage. We
  // keep it for the whole session so that when the user finally clicks an
  // outbound /go/ link, the server reads the cookie and appends the UTMs to the
  // destination — telling us exactly which article/campaign drove the click.
  // We also preserve utm_* across internal navigation so they aren't lost.
  (function attribution() {
    var UTM = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
    var STORE = 'ds_attr';
    function readCookie(name) {
      var m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
      return m ? decodeURIComponent(m[1]) : '';
    }
    function writeCookie(name, value, days) {
      var exp = new Date(Date.now() + days * 864e5).toUTCString();
      // SameSite=Lax so it rides along on top-level navigations (incl. /go/).
      document.cookie = name + '=' + encodeURIComponent(value) + '; expires=' + exp + '; path=/; SameSite=Lax';
    }
    var params = new URLSearchParams(window.location.search);
    var incoming = {};
    var hasUtm = false;
    UTM.forEach(function (k) { var v = params.get(k); if (v) { incoming[k] = v; hasUtm = true; } });

    // Load any stored attribution (first-touch wins — don't overwrite).
    var stored = {};
    try {
      var raw = localStorage.getItem(STORE) || readCookie(STORE);
      if (raw) new URLSearchParams(raw).forEach(function (v, k) { stored[k] = v; });
    } catch (e) {}

    // First touch: only persist if we don't already have attribution stored.
    if (hasUtm && !stored.utm_source && !stored.utm_campaign) {
      incoming.landing = window.location.pathname;
      var qs = new URLSearchParams(incoming).toString();
      try { localStorage.setItem(STORE, qs); } catch (e) {}
      writeCookie(STORE, qs, 30);
      stored = incoming;
    } else if (Object.keys(stored).length) {
      // refresh the cookie from storage so the server can always read it
      writeCookie(STORE, new URLSearchParams(stored).toString(), 30);
    }

    // Preserve utm_* across internal links so navigation never drops them.
    if (stored.utm_source || stored.utm_campaign) {
      var carry = {};
      UTM.forEach(function (k) { if (stored[k]) carry[k] = stored[k]; });
      document.addEventListener('click', function (e) {
        var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
        if (!a) return;
        var href = a.getAttribute('href') || '';
        // only internal, non-/go, non-anchor links
        if (!href || href[0] === '#' || /^https?:\/\//.test(href) || href.indexOf('/go/') === 0 || href.indexOf('mailto:') === 0) return;
        try {
          var u = new URL(href, window.location.origin);
          if (u.origin !== window.location.origin) return;
          Object.keys(carry).forEach(function (k) { if (!u.searchParams.has(k)) u.searchParams.set(k, carry[k]); });
          a.setAttribute('href', u.pathname + u.search + u.hash);
        } catch (err) {}
      }, true);
    }
  })();

  // ============================================================
  // LIVE SEARCH SUGGESTIONS (Amazon/Flipkart-style typeahead)
  // ------------------------------------------------------------
  // Any <form data-search-suggest> with an <input name="q"> + a
  // .search-suggest container gets a live dropdown of matching products,
  // brands and categories as the user types. Debounced, keyboard-navigable,
  // and falls back gracefully to the normal /search submit.
  (function searchSuggest() {
    var forms = document.querySelectorAll('form[data-search-suggest]');
    if (!forms.length) return;

    function esc(s) {
      return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
    function highlight(text, q) {
      var t = esc(text);
      if (!q) return t;
      try {
        var re = new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig');
        return t.replace(re, '<mark>$1</mark>');
      } catch (e) { return t; }
    }

    forms.forEach(function (form) {
      var input = form.querySelector('input[name="q"]');
      var menu = form.querySelector('.search-suggest');
      if (!input || !menu) return;
      var items = [], active = -1, t = null, lastQ = null, open = false;

      function close() { menu.classList.remove('open'); open = false; active = -1; }
      function show() { menu.classList.add('open'); open = true; }

      function render(list, q) {
        items = list || [];
        if (!q) { close(); return; }
        if (!items.length) {
          menu.innerHTML = '<div class="ss-empty">No matches — press Enter to search “' + esc(q) + '”</div>';
          show(); active = -1; return;
        }
        menu.innerHTML = items.map(function (s, i) {
          var href, icon, tag;
          if (s.type === 'product') {
            href = '/reviews/' + s.slug;
            icon = s.image
              ? '<img class="ss-item__thumb" src="' + esc(s.image) + '" alt="" referrerpolicy="no-referrer" onerror="this.outerHTML=\'<span class=&quot;ss-item__ico&quot;><i class=&quot;fas fa-box&quot;></i></span>\'" />'
              : '<span class="ss-item__ico"><i class="fas fa-box"></i></span>';
            tag = 'Product';
          } else if (s.type === 'category') {
            href = '/category/' + s.slug;
            icon = '<span class="ss-item__ico"><i class="fas fa-layer-group"></i></span>';
            tag = 'Category';
          } else {
            href = '/search?q=' + encodeURIComponent(s.text);
            icon = '<span class="ss-item__ico"><i class="fas fa-tag"></i></span>';
            tag = 'Brand';
          }
          return '<a class="ss-item" href="' + href + '" data-i="' + i + '" role="option">' +
            icon +
            '<span class="ss-item__text">' + highlight(s.text, q) + '</span>' +
            '<span class="ss-item__tag">' + tag + '</span>' +
            '</a>';
        }).join('');
        show(); active = -1;
        // Prevent blur-close from cancelling the click.
        [].forEach.call(menu.querySelectorAll('.ss-item'), function (el) {
          el.addEventListener('mousedown', function (e) { e.preventDefault(); window.location.href = el.getAttribute('href'); });
        });
      }

      function fetchSuggest() {
        var q = input.value.trim();
        if (q === lastQ) return; lastQ = q;
        if (q.length < 1) { close(); return; }
        fetch('/api/search-suggest?q=' + encodeURIComponent(q))
          .then(function (r) { return r.json(); })
          .then(function (d) {
            // Ignore stale responses if the user kept typing.
            if (input.value.trim() !== q) return;
            render(d.suggestions || [], q);
          })
          .catch(function () { close(); });
      }

      function hi() {
        [].forEach.call(menu.querySelectorAll('.ss-item'), function (el, i) {
          el.classList.toggle('active', i === active);
        });
      }

      input.addEventListener('input', function () { clearTimeout(t); t = setTimeout(fetchSuggest, 150); });
      input.addEventListener('focus', function () { if (input.value.trim()) { clearTimeout(t); t = setTimeout(fetchSuggest, 80); } });
      input.addEventListener('blur', function () { setTimeout(close, 180); });
      input.addEventListener('keydown', function (e) {
        if (!open) return;
        var links = menu.querySelectorAll('.ss-item');
        if (e.key === 'ArrowDown') { e.preventDefault(); active = Math.min(active + 1, links.length - 1); hi(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(active - 1, 0); hi(); }
        else if (e.key === 'Enter') {
          if (active >= 0 && links[active]) { e.preventDefault(); window.location.href = links[active].getAttribute('href'); }
          // else: let the form submit normally to /search
        } else if (e.key === 'Escape') { close(); }
      });
    });
  })();

  // ---- Theme toggle ----
  var root = document.documentElement;
  var toggle = document.getElementById('theme-toggle');
  var themeMeta = document.querySelector('meta[name="theme-color"]');
  function applyTheme(t) {
    root.setAttribute('data-theme', t);
    try { localStorage.setItem('theme', t); } catch (e) {}
    if (toggle) toggle.setAttribute('aria-checked', t === 'dark' ? 'true' : 'false');
    if (themeMeta) themeMeta.setAttribute('content', t === 'dark' ? '#14100E' : '#F2ECDE');
  }
  // sync meta to whatever the no-flash script already set (default dark)
  applyTheme(root.getAttribute('data-theme') || 'dark');
  if (toggle) {
    toggle.addEventListener('click', function () {
      applyTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    });
  }

  // ---- Mobile menu toggle (animated burger + slide panel) ----
  var btn = document.getElementById('mobile-menu-btn');
  var menu = document.getElementById('mobile-menu');
  if (btn && menu) {
    function closeMenu() { menu.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); }
    btn.addEventListener('click', function () {
      var open = menu.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    // close on link tap or Escape
    menu.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', closeMenu); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });
  }

  // ---- Header: shadow on scroll ----
  var header = document.querySelector('.site-header');
  if (header) {
    var onScroll = function () { header.classList.toggle('scrolled', window.scrollY > 8); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // ---- Active nav highlight (match current path) ----
  try {
    var path = location.pathname;
    document.querySelectorAll('.nav-link, .mobile-link').forEach(function (a) {
      var href = a.getAttribute('href');
      if (!href || href === '/') return;
      if (path === href || path.indexOf(href + '/') === 0) a.classList.add('active');
    });
  } catch (e) {}

  // Cookie consent banner
  var banner = document.getElementById('cookie-banner');
  if (banner && !localStorage.getItem('cookie-consent')) {
    setTimeout(function () { banner.classList.remove('hidden'); }, 800);
  }
  function setConsent(val) {
    localStorage.setItem('cookie-consent', val);
    if (banner) banner.classList.add('hidden');
  }
  var accept = document.getElementById('cookie-accept');
  var decline = document.getElementById('cookie-decline');
  if (accept) accept.addEventListener('click', function () { setConsent('accepted'); });
  if (decline) decline.addEventListener('click', function () { setConsent('declined'); });

  // Newsletter form (AJAX)
  var form = document.getElementById('newsletter-form');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var msg = document.getElementById('newsletter-msg');
      var email = form.querySelector('input[name="email"]').value;
      if (msg) msg.textContent = 'Subscribing…';
      fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, from: location.pathname })
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (msg) msg.textContent = data.ok ? data.message : (data.error || 'Something went wrong.');
          if (data.ok) form.reset();
        })
        .catch(function () {
          if (msg) msg.textContent = 'Network error. Please try again.';
        });
    });
  }

  // ============================================================
  // Faceted filtering (instant, client-side, no reload)
  // ============================================================
  (function () {
    var page = document.getElementById('facet-page');
    if (!page) return;
    var results = document.getElementById('facet-results');
    var sidebar = document.getElementById('facet-sidebar');
    if (!results || !sidebar) return;

    var cards = Array.prototype.slice.call(results.querySelectorAll('.deal-card'));
    var priceInput = document.getElementById('facet-price');
    var priceVal = document.getElementById('facet-price-val');
    var countEl = document.getElementById('facet-count');
    var emptyEl = document.getElementById('facet-empty');

    function fmt(n) { return '₹' + Number(n).toLocaleString('en-IN'); }

    function activeBrands() {
      return Array.prototype.slice.call(sidebar.querySelectorAll('.facet-brand:checked')).map(function (c) { return c.value; });
    }
    function activeFeatures() {
      return Array.prototype.slice.call(sidebar.querySelectorAll('.facet-feature.active')).map(function (c) { return c.getAttribute('data-feature'); });
    }
    function activeRating() {
      var r = sidebar.querySelector('input[name="facet-rating"]:checked');
      return r ? parseFloat(r.value) : 0;
    }

    function apply() {
      var maxPrice = priceInput ? parseFloat(priceInput.value) : Infinity;
      var brands = activeBrands();
      var feats = activeFeatures();
      var minRating = activeRating();
      var shown = 0;

      cards.forEach(function (card) {
        var price = parseFloat(card.getAttribute('data-price'));
        var brand = card.getAttribute('data-brand') || '';
        var rating = parseFloat(card.getAttribute('data-rating')) || 0;
        var cardFeats = (card.getAttribute('data-features') || '').split(',').map(function (s) { return s.trim(); });

        var ok = true;
        if (priceInput && !isNaN(price) && price > maxPrice) ok = false;
        if (ok && minRating && rating < minRating) ok = false;
        if (ok && brands.length && brands.indexOf(brand) === -1) ok = false;
        if (ok && feats.length) {
          for (var i = 0; i < feats.length; i++) {
            if (cardFeats.indexOf(feats[i]) === -1) { ok = false; break; }
          }
        }
        // hide whole grid item (parent wrapper is the card itself)
        card.style.display = ok ? '' : 'none';
        if (ok) shown++;
      });

      if (countEl) countEl.textContent = shown;
      if (emptyEl) emptyEl.classList.toggle('is-hidden', shown !== 0);
      if (results) results.classList.toggle('is-hidden', shown === 0);
    }

    if (priceInput) {
      priceInput.addEventListener('input', function () { if (priceVal) priceVal.textContent = fmt(priceInput.value); apply(); });
    }
    sidebar.addEventListener('change', function (e) {
      if (e.target.matches('.facet-brand, input[name="facet-rating"]')) apply();
    });
    sidebar.addEventListener('click', function (e) {
      var chip = e.target.closest('.facet-feature');
      if (chip) { chip.classList.toggle('active'); apply(); }
    });

    function reset() {
      if (priceInput) { priceInput.value = priceInput.max; if (priceVal) priceVal.textContent = fmt(priceInput.max); }
      sidebar.querySelectorAll('.facet-brand').forEach(function (c) { c.checked = false; });
      sidebar.querySelectorAll('input[name="facet-rating"]').forEach(function (r) { r.checked = false; });
      sidebar.querySelectorAll('.facet-feature.active').forEach(function (c) { c.classList.remove('active'); });
      apply();
    }
    var resetBtn = document.getElementById('facet-reset');
    var resetBtn2 = document.getElementById('facet-reset-2');
    if (resetBtn) resetBtn.addEventListener('click', reset);
    if (resetBtn2) resetBtn2.addEventListener('click', reset);

    var mobBtn = document.getElementById('facet-toggle-mobile');
    if (mobBtn) mobBtn.addEventListener('click', function () { sidebar.scrollIntoView({ behavior: 'smooth' }); });
  })();

  // ============================================================
  // Compare tray + checkboxes (localStorage state, max 4)
  // ============================================================
  (function () {
    var KEY = 'compare-ids';
    var MAX = 4;
    var tray = document.getElementById('compare-tray');

    function load() {
      try { return JSON.parse(localStorage.getItem(KEY) || '[]').filter(function (n) { return !!n; }).slice(0, MAX); }
      catch (e) { return []; }
    }
    function save(ids) { try { localStorage.setItem(KEY, JSON.stringify(ids)); } catch (e) {} }

    var ids = load();

    function cardData(id) {
      var card = document.querySelector('.deal-card[data-id="' + id + '"]');
      if (!card) return { id: id, title: 'Product', img: '' };
      var imgEl = card.querySelector('img');
      return { id: id, title: card.getAttribute('data-title') || 'Product', img: imgEl ? imgEl.getAttribute('src') : '' };
    }

    function renderTray() {
      if (!tray) return;
      var thumbs = document.getElementById('compare-thumbs');
      var countEl = document.getElementById('compare-count');
      var go = document.getElementById('compare-go');
      if (countEl) countEl.textContent = ids.length;
      if (go) go.href = '/compare?ids=' + ids.join(',');
      if (thumbs) {
        thumbs.innerHTML = ids.map(function (id) {
          var d = cardData(id);
          return '<span class="compare-thumb" title="' + d.title.replace(/"/g, '&quot;') + '">' +
            (d.img ? '<img src="' + d.img + '" alt="" />' : '<i class="fas fa-box-open text-ink-faint" style="display:flex;align-items:center;justify-content:center;height:100%"></i>') +
            '<span class="rm" data-rm="' + id + '">&times;</span></span>';
        }).join('');
      }
      tray.classList.toggle('show', ids.length > 0);
    }

    function syncChecks() {
      document.querySelectorAll('[data-compare]').forEach(function (btn) {
        var id = parseInt(btn.getAttribute('data-compare'), 10);
        var on = ids.indexOf(id) !== -1;
        btn.classList.toggle('checked', on);
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
        var icon = btn.querySelector('i');
        if (icon) icon.className = on ? 'fas fa-check text-[0.62rem]' : 'fas fa-plus text-[0.62rem]';
        btn.lastChild && (btn.childNodes.length > 1) && (btn.childNodes[btn.childNodes.length - 1].textContent = on ? ' Added' : ' Compare');
      });
    }

    function toggle(id) {
      var i = ids.indexOf(id);
      if (i !== -1) { ids.splice(i, 1); }
      else {
        if (ids.length >= MAX) { flash(); return; }
        ids.push(id);
      }
      save(ids); renderTray(); syncChecks();
    }

    function flash() {
      if (!tray) return;
      tray.style.outline = '2px solid var(--accent)';
      setTimeout(function () { tray.style.outline = ''; }, 600);
    }

    // delegate clicks for compare buttons + thumb removal
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-compare]');
      if (btn) { e.preventDefault(); toggle(parseInt(btn.getAttribute('data-compare'), 10)); return; }
      var rm = e.target.closest('[data-rm]');
      if (rm) { toggle(parseInt(rm.getAttribute('data-rm'), 10)); return; }
    });

    var trayClear = document.getElementById('compare-tray-clear');
    if (trayClear) trayClear.addEventListener('click', function () { ids = []; save(ids); renderTray(); syncChecks(); });

    // /compare page clear
    var pageClear = document.getElementById('compare-clear');
    if (pageClear) pageClear.addEventListener('click', function () { ids = []; save(ids); location.href = '/compare'; });

    renderTray();
    syncChecks();
  })();

  // ============================================================
  // Lazy-reveal heavy comparison matrix on scroll (IntersectionObserver)
  // ============================================================
  (function () {
    var blocks = document.querySelectorAll('[data-lazy-matrix]');
    if (!blocks.length) return;
    function reveal(block) {
      var ph = block.querySelector('.matrix-placeholder');
      var real = block.querySelector('.matrix-real');
      if (real) real.classList.remove('is-hidden');
      if (ph) ph.remove();
    }
    if (!('IntersectionObserver' in window)) {
      blocks.forEach(reveal);
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { reveal(entry.target); io.unobserve(entry.target); }
      });
    }, { rootMargin: '200px' });
    blocks.forEach(function (b) { io.observe(b); });
  })();

  // ---- Hero product carousel ----
  (function () {
    var root = document.getElementById('hero-carousel');
    if (!root) return;
    var track = document.getElementById('hero-track');
    var slides = track ? track.querySelectorAll('.hero-slide') : [];
    var dots = root.querySelectorAll('.hero-dot');
    var prev = document.getElementById('hero-prev');
    var next = document.getElementById('hero-next');
    var count = slides.length;
    if (!track || count === 0) return;

    var index = 0;
    var delay = parseInt(root.getAttribute('data-autoplay'), 10) || 6000;
    var timer = null;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // expose autoplay duration to CSS so the active-dot fill bar matches it
    root.style.setProperty('--hero-autoplay', delay + 'ms');

    function setX(percent) {
      track.style.transform = 'translateX(' + percent + '%)';
    }

    function go(n, fromUser) {
      index = (n + count) % count;
      setX(-index * 100);
      for (var i = 0; i < dots.length; i++) {
        dots[i].classList.toggle('is-active', i === index);
      }
      for (var s = 0; s < slides.length; s++) {
        slides[s].classList.toggle('is-active', s === index);
      }
      reflowActiveDot();
      if (fromUser) restart();
    }

    function nextSlide() { go(index + 1); }
    function prevSlide() { go(index - 1); }

    function start() {
      if (count < 2) return;
      stop();
      timer = setInterval(nextSlide, delay);
    }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    function restart() { stop(); start(); }

    // Re-trigger the active-dot fill animation on each change by reflowing it
    function reflowActiveDot() {
      var a = root.querySelector('.hero-dot.is-active .hero-dot__fill');
      if (!a) return;
      a.style.animation = 'none';
      // force reflow
      void a.offsetWidth;
      a.style.animation = '';
    }

    if (next) next.addEventListener('click', function () { nextSlide(); restart(); });
    if (prev) prev.addEventListener('click', function () { prevSlide(); restart(); });
    for (var d = 0; d < dots.length; d++) {
      (function (i) {
        dots[i].addEventListener('click', function () { go(i, true); });
      })(d);
    }

    // NOTE: Autoplay must NEVER stop (per product requirement) — so we do NOT
    // pause on hover or focus. We only pause when the browser tab is hidden
    // (otherwise the queued ticks fire in a burst when the tab regains focus),
    // and resume the moment it's visible again.
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop(); else restart();
    });

    // ---- Drag / swipe support (Amazon/Flipkart-style) ----
    // The strip follows the finger 1:1 while dragging, then snaps to the nearest
    // slide on release with the CSS glide. Works for touch AND mouse-drag.
    var startX = 0, startY = 0, dx = 0, dy = 0;
    var dragging = false, decidedAxis = false, horizontal = false;
    var vpWidth = 1; // viewport width in px (for px → % conversion)

    function dragStart(x, y) {
      startX = x; startY = y; dx = 0; dy = 0;
      dragging = true; decidedAxis = false; horizontal = false;
      vpWidth = track.getBoundingClientRect().width || window.innerWidth || 1;
      stop(); // pause autoplay while the user is in control
    }
    function dragMove(x, y) {
      if (!dragging) return false;
      dx = x - startX; dy = y - startY;
      // Decide gesture axis once movement is meaningful
      if (!decidedAxis && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
        decidedAxis = true;
        horizontal = Math.abs(dx) > Math.abs(dy);
        if (horizontal) track.classList.add('is-dragging');
      }
      if (horizontal) {
        // follow the finger; add light rubber-band resistance at the ends
        var base = -index * 100;
        var deltaPct = (dx / vpWidth) * 100;
        var atStart = index === 0 && dx > 0;
        var atEnd = index === count - 1 && dx < 0;
        if (atStart || atEnd) deltaPct *= 0.35;
        setX(base + deltaPct);
        return true; // signal caller to preventDefault (block page scroll)
      }
      return false;
    }
    function dragEnd() {
      if (!dragging) return; dragging = false;
      track.classList.remove('is-dragging');
      if (horizontal) {
        // commit to a neighbour if dragged far/fast enough, else snap back
        var threshold = Math.max(40, vpWidth * 0.12);
        if (dx <= -threshold) go(index + 1);
        else if (dx >= threshold) go(index - 1);
        else go(index); // snap back
      }
      restart(); // resume autoplay, full interval away
    }

    // Touch
    track.addEventListener('touchstart', function (e) {
      dragStart(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });
    track.addEventListener('touchmove', function (e) {
      var blocked = dragMove(e.touches[0].clientX, e.touches[0].clientY);
      if (blocked && e.cancelable) e.preventDefault();
    }, { passive: false });
    track.addEventListener('touchend', dragEnd);
    track.addEventListener('touchcancel', dragEnd);

    // Mouse drag (desktop) — only the primary button
    track.addEventListener('mousedown', function (e) {
      if (e.button !== 0) return;
      dragStart(e.clientX, e.clientY);
    });
    document.addEventListener('mousemove', function (e) {
      if (!dragging) return;
      if (dragMove(e.clientX, e.clientY)) e.preventDefault();
    });
    document.addEventListener('mouseup', dragEnd);
    // Prevent the click that follows a real drag from triggering link nav
    track.addEventListener('click', function (e) {
      if (Math.abs(dx) > 8) { e.preventDefault(); e.stopPropagation(); }
    }, true);

    // Keyboard arrows when carousel focused
    root.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { nextSlide(); restart(); }
      else if (e.key === 'ArrowLeft') { prevSlide(); restart(); }
    });

    go(0);
    start();
  })();

  // ============================================================
  // PRODUCT CATALOGUE — filter → sort → paginate (instant, client-side)
  // Desktop (>=1024px): 20 per page (5 cols × 4 rows)
  // Mobile  (<1024px) : 16 per page (2 cols × 8 rows)
  // Filters (price range, rating, availability, category, brand, features)
  // live on the LEFT. Sort By + grid + numbered pagination on the right.
  // Pipeline: filter the master list → sort the survivors → paginate the
  // result so every page is an exact 5×4 / 2×8 block of matching products.
  // ============================================================
  (function () {
    var section = document.getElementById('catalogue');
    var grid = document.getElementById('catalogue-grid');
    var pager = document.getElementById('catalogue-pager');
    if (!section || !grid || !pager) return;

    var allCards = Array.prototype.slice.call(grid.querySelectorAll('.cat-card'));
    if (!allCards.length) return;
    allCards.forEach(function (c, i) { c.__order = i; });

    var filters = document.getElementById('catalogue-filters');
    var emptyEl = document.getElementById('catalogue-empty');
    var countEl = document.getElementById('catalogue-count');
    var countWord = document.getElementById('catalogue-count-word');

    var perDesktop = parseInt(section.getAttribute('data-per-desktop'), 10) || 20;
    var perMobile = parseInt(section.getAttribute('data-per-mobile'), 10) || 16;
    var DESKTOP_MQ = window.matchMedia('(min-width: 1024px)');

    var current = 1;
    var perPage = DESKTOP_MQ.matches ? perDesktop : perMobile;
    var visible = allCards.slice();   // cards passing the current filters, in sort order

    function num(card, attr) {
      var v = card.getAttribute(attr);
      if (v === null || v === '') return NaN;
      var n = parseFloat(v);
      return isNaN(n) ? NaN : n;
    }
    function rupee(n) { return '₹' + Number(n).toLocaleString('en-IN'); }

    // ---------- FILTERING ----------
    var fMin = filters && parseFloat(filters.getAttribute('data-min')) || 0;
    var fMax = filters && parseFloat(filters.getAttribute('data-max')) || Infinity;

    var priceMin = document.getElementById('cat-price-min');
    var priceMax = document.getElementById('cat-price-max');
    var priceMinVal = document.getElementById('cat-price-min-val');
    var priceMaxVal = document.getElementById('cat-price-max-val');
    var rangeFill = document.getElementById('cat-range-fill');

    function syncRangeFill() {
      if (!priceMin || !priceMax || !rangeFill) return;
      var lo = parseFloat(priceMin.value), hi = parseFloat(priceMax.value);
      var span = (fMax - fMin) || 1;
      var l = ((lo - fMin) / span) * 100;
      var r = ((hi - fMin) / span) * 100;
      rangeFill.style.left = l + '%';
      rangeFill.style.right = (100 - r) + '%';
    }
    function clampRange(changed) {
      if (!priceMin || !priceMax) return;
      var lo = parseFloat(priceMin.value), hi = parseFloat(priceMax.value);
      var gap = ((fMax - fMin) || 1) * 0.02;     // keep a small gap
      if (lo > hi - gap) {
        if (changed === 'min') priceMin.value = Math.max(fMin, hi - gap);
        else priceMax.value = Math.min(fMax, lo + gap);
      }
      if (priceMinVal) priceMinVal.textContent = rupee(priceMin.value);
      if (priceMaxVal) priceMaxVal.textContent = rupee(priceMax.value);
      syncRangeFill();
    }

    function activeChecked(cls) {
      if (!filters) return [];
      return Array.prototype.slice.call(filters.querySelectorAll(cls + ':checked')).map(function (c) { return c.value; });
    }
    function activeFeatures() {
      if (!filters) return [];
      return Array.prototype.slice.call(filters.querySelectorAll('.cat-feature.is-active')).map(function (c) { return c.getAttribute('data-feature'); });
    }
    function activeRating() {
      if (!filters) return 0;
      var r = filters.querySelector('input[name="cat-rating"]:checked');
      return r ? parseFloat(r.value) : 0;
    }

    function passesFilters(card) {
      // price range
      if (priceMin && priceMax) {
        var lo = parseFloat(priceMin.value), hi = parseFloat(priceMax.value);
        var p = num(card, 'data-price');
        if (!isNaN(p)) { if (p < lo || p > hi) return false; }
      }
      // rating
      var minR = activeRating();
      if (minR && (num(card, 'data-rating') || 0) < minR) return false;
      // availability toggles
      var inStock = document.getElementById('cat-instock');
      if (inStock && inStock.checked && card.getAttribute('data-stock') !== '1') return false;
      var buyable = document.getElementById('cat-buyable');
      if (buyable && buyable.checked && card.getAttribute('data-buyable') !== '1') return false;
      var dealOnly = document.getElementById('cat-deal');
      if (dealOnly && dealOnly.checked && (num(card, 'data-disc') || 0) <= 0) return false;
      // category
      var cats = activeChecked('.cat-cat');
      if (cats.length && cats.indexOf(card.getAttribute('data-category') || '') === -1) return false;
      // brand
      var brands = activeChecked('.cat-brand');
      if (brands.length && brands.indexOf(card.getAttribute('data-brand') || '') === -1) return false;
      // features (must have ALL selected)
      var feats = activeFeatures();
      if (feats.length) {
        var cardFeats = (card.getAttribute('data-features') || '').split(',').map(function (s) { return s.trim(); });
        for (var i = 0; i < feats.length; i++) { if (cardFeats.indexOf(feats[i]) === -1) return false; }
      }
      return true;
    }

    function countActiveFilters() {
      var n = 0;
      if (priceMin && priceMax && (parseFloat(priceMin.value) > fMin || parseFloat(priceMax.value) < fMax)) n++;
      if (activeRating()) n++;
      ['cat-instock', 'cat-buyable', 'cat-deal'].forEach(function (id) { var el = document.getElementById(id); if (el && el.checked) n++; });
      n += activeChecked('.cat-cat').length;
      n += activeChecked('.cat-brand').length;
      n += activeFeatures().length;
      return n;
    }

    // ---------- SORTING ----------
    var sortSel = document.getElementById('catalogue-sort');
    function sortCards(arr) {
      var mode = sortSel ? sortSel.value : 'relevance';
      function price(c) { var n = num(c, 'data-price'); return isNaN(n) ? null : n; }
      var s = arr.slice();
      if (mode === 'price-asc') s.sort(function (a, b) { var pa = price(a), pb = price(b); if (pa === null && pb === null) return a.__order - b.__order; if (pa === null) return 1; if (pb === null) return -1; return pa - pb || a.__order - b.__order; });
      else if (mode === 'price-desc') s.sort(function (a, b) { var pa = price(a), pb = price(b); if (pa === null && pb === null) return a.__order - b.__order; if (pa === null) return 1; if (pb === null) return -1; return pb - pa || a.__order - b.__order; });
      else if (mode === 'latest') s.sort(function (a, b) { return (num(b, 'data-date') || 0) - (num(a, 'data-date') || 0) || a.__order - b.__order; });
      else if (mode === 'oldest') s.sort(function (a, b) { return (num(a, 'data-date') || 0) - (num(b, 'data-date') || 0) || a.__order - b.__order; });
      else if (mode === 'popularity') s.sort(function (a, b) { return (num(b, 'data-pop') || 0) - (num(a, 'data-pop') || 0) || a.__order - b.__order; });
      else if (mode === 'discount') s.sort(function (a, b) { return (num(b, 'data-disc') || 0) - (num(a, 'data-disc') || 0) || a.__order - b.__order; });
      else if (mode === 'rating') s.sort(function (a, b) { return (num(b, 'data-rating') || 0) - (num(a, 'data-rating') || 0) || a.__order - b.__order; });
      else s.sort(function (a, b) { return a.__order - b.__order; });
      return s;
    }

    // ---------- ACTIVE FILTER CHIPS ----------
    var activeWrap = document.getElementById('cat-active-chips');
    var activeCountBadge = document.getElementById('cat-active-count');
    function renderActiveChips() {
      var n = countActiveFilters();
      if (activeCountBadge) { activeCountBadge.hidden = n === 0; activeCountBadge.textContent = n; }
      if (!activeWrap) return;
      var chips = [];
      if (priceMin && priceMax && (parseFloat(priceMin.value) > fMin || parseFloat(priceMax.value) < fMax)) {
        chips.push({ label: rupee(priceMin.value) + ' – ' + rupee(priceMax.value), clear: function () { priceMin.value = fMin; priceMax.value = fMax; clampRange(); } });
      }
      var r = activeRating();
      if (r) chips.push({ label: r + '★ & up', clear: function () { var el = filters.querySelector('input[name="cat-rating"]:checked'); if (el) el.checked = false; } });
      [['cat-instock', 'In stock'], ['cat-buyable', 'Buy-now'], ['cat-deal', 'On offer']].forEach(function (pair) {
        var el = document.getElementById(pair[0]); if (el && el.checked) chips.push({ label: pair[1], clear: function () { el.checked = false; } });
      });
      Array.prototype.slice.call(filters.querySelectorAll('.cat-cat:checked')).forEach(function (el) { chips.push({ label: el.parentElement.textContent.trim(), clear: function () { el.checked = false; } }); });
      Array.prototype.slice.call(filters.querySelectorAll('.cat-brand:checked')).forEach(function (el) { chips.push({ label: el.parentElement.textContent.trim(), clear: function () { el.checked = false; } }); });
      Array.prototype.slice.call(filters.querySelectorAll('.cat-feature.is-active')).forEach(function (el) { chips.push({ label: el.getAttribute('data-feature'), clear: function () { el.classList.remove('is-active'); } }); });

      activeWrap.hidden = chips.length === 0;
      activeWrap.innerHTML = '';
      chips.forEach(function (chip) {
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'cat-activechip';
        b.innerHTML = chip.label + ' <i class="fas fa-xmark"></i>';
        b.addEventListener('click', function () { chip.clear(); refresh(); });
        activeWrap.appendChild(b);
      });
    }

    // ---------- PIPELINE ----------
    function refresh(resetPage) {
      visible = sortCards(allCards.filter(passesFilters));
      // reorder DOM to the sorted/filtered order, hide the rest
      var frag = document.createDocumentFragment();
      visible.forEach(function (c) { frag.appendChild(c); });
      // append filtered-out cards after so they stay in DOM but hidden
      allCards.forEach(function (c) { if (visible.indexOf(c) === -1) frag.appendChild(c); });
      grid.appendChild(frag);

      if (countEl) countEl.textContent = visible.length;
      if (countWord) countWord.textContent = visible.length === 1 ? 'product' : 'products';
      if (emptyEl) emptyEl.classList.toggle('is-hidden', visible.length !== 0);
      grid.classList.toggle('is-hidden', visible.length === 0);
      renderActiveChips();
      showPage(resetPage === false ? current : 1);
    }

    function pageCount() { return Math.max(1, Math.ceil(visible.length / perPage)); }

    function showPage(page) {
      var total = pageCount();
      if (page < 1) page = 1;
      if (page > total) page = total;
      current = page;
      var startIdx = (page - 1) * perPage;
      var endIdx = startIdx + perPage;
      // hide everything first
      allCards.forEach(function (c) { c.classList.add('is-hidden'); });
      for (var i = startIdx; i < endIdx && i < visible.length; i++) visible[i].classList.remove('is-hidden');
      renderPager();
    }

    function makeBtn(label, page, opts) {
      opts = opts || {};
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'cat-page' + (opts.nav ? ' cat-page--nav' : '') + (opts.active ? ' is-active' : '');
      b.innerHTML = label;
      if (opts.active) b.setAttribute('aria-current', 'page');
      if (opts.disabled) b.disabled = true;
      else b.addEventListener('click', function () {
        showPage(page);
        var anchor = section.querySelector('.catalogue__head') || section.querySelector('.cat-sort') || section;
        if (anchor) anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      return b;
    }
    function ellipsis() { var s = document.createElement('span'); s.className = 'cat-page cat-page--ellipsis'; s.textContent = '…'; return s; }

    function renderPager() {
      var total = pageCount();
      pager.innerHTML = '';
      if (total <= 1) return;
      pager.appendChild(makeBtn('<i class="fas fa-chevron-left"></i>', current - 1, { nav: true, disabled: current === 1 }));
      var pages = [], i;
      for (i = 1; i <= total; i++) {
        if (i === 1 || i === total || (i >= current - 1 && i <= current + 1)) pages.push(i);
        else if (pages[pages.length - 1] !== '...') pages.push('...');
      }
      for (i = 0; i < pages.length; i++) {
        if (pages[i] === '...') pager.appendChild(ellipsis());
        else pager.appendChild(makeBtn(String(pages[i]), pages[i], { active: pages[i] === current }));
      }
      pager.appendChild(makeBtn('<i class="fas fa-chevron-right"></i>', current + 1, { nav: true, disabled: current === total }));
    }

    // ---------- EVENTS ----------
    if (sortSel) sortSel.addEventListener('change', function () { refresh(); });

    if (priceMin) priceMin.addEventListener('input', function () { clampRange('min'); refresh(); });
    if (priceMax) priceMax.addEventListener('input', function () { clampRange('max'); refresh(); });

    if (filters) {
      filters.addEventListener('change', function (e) {
        if (e.target.matches('.cat-brand, .cat-cat, input[name="cat-rating"], #cat-instock, #cat-buyable, #cat-deal')) refresh();
      });
      filters.addEventListener('click', function (e) {
        var chip = e.target.closest('.cat-feature');
        if (chip) { chip.classList.toggle('is-active'); refresh(); }
      });
    }

    // brand search box
    var brandSearch = document.getElementById('cat-brand-search');
    if (brandSearch) {
      brandSearch.addEventListener('input', function () {
        var q = brandSearch.value.toLowerCase();
        Array.prototype.slice.call(document.querySelectorAll('#cat-brand-list .cat-filter__opt')).forEach(function (opt) {
          opt.style.display = opt.textContent.toLowerCase().indexOf(q) === -1 ? 'none' : '';
        });
      });
    }

    function reset() {
      if (priceMin) priceMin.value = fMin;
      if (priceMax) priceMax.value = fMax;
      clampRange();
      if (filters) {
        filters.querySelectorAll('input[type="checkbox"]').forEach(function (c) { c.checked = false; });
        filters.querySelectorAll('input[name="cat-rating"]').forEach(function (r) { r.checked = false; });
        filters.querySelectorAll('.cat-feature.is-active').forEach(function (c) { c.classList.remove('is-active'); });
      }
      if (sortSel) sortSel.value = 'relevance';
      refresh();
    }
    ['cat-reset', 'cat-reset-2'].forEach(function (id) { var b = document.getElementById(id); if (b) b.addEventListener('click', reset); });

    // mobile filter drawer
    var openBtn = document.getElementById('cat-filter-open');
    var closeBtn = document.getElementById('cat-filter-close');
    var backdrop = document.getElementById('cat-filters-backdrop');
    function openFilters() { if (filters) filters.classList.add('is-open'); if (backdrop) backdrop.hidden = false; document.body.style.overflow = 'hidden'; }
    function closeFilters() { if (filters) filters.classList.remove('is-open'); if (backdrop) backdrop.hidden = true; document.body.style.overflow = ''; }
    if (openBtn) openBtn.addEventListener('click', openFilters);
    if (closeBtn) closeBtn.addEventListener('click', closeFilters);
    if (backdrop) backdrop.addEventListener('click', closeFilters);

    function onBreakpointChange() {
      var newPer = DESKTOP_MQ.matches ? perDesktop : perMobile;
      if (DESKTOP_MQ.matches) closeFilters();
      if (newPer === perPage) return;
      var firstVisible = (current - 1) * perPage;
      perPage = newPer;
      showPage(Math.floor(firstVisible / perPage) + 1);
    }
    if (DESKTOP_MQ.addEventListener) DESKTOP_MQ.addEventListener('change', onBreakpointChange);
    else if (DESKTOP_MQ.addListener) DESKTOP_MQ.addListener(onBreakpointChange);

    clampRange();
    refresh();
  })();
})();

/* ── Recommendation strip: swipable / drag-scroll + arrow controls ─────────── */
(function () {
  function initStrip(strip) {
    var track = strip.querySelector('[data-reco-track]');
    if (!track) return;
    var prev = strip.querySelector('[data-reco-prev]');
    var next = strip.querySelector('[data-reco-next]');

    function step() {
      var card = track.querySelector('.reco-card');
      var w = card ? card.getBoundingClientRect().width + 16 : 240;
      return Math.max(w, Math.round(track.clientWidth * 0.8));
    }
    function updateArrows() {
      var max = track.scrollWidth - track.clientWidth - 2;
      if (prev) prev.disabled = track.scrollLeft <= 2;
      if (next) next.disabled = track.scrollLeft >= max;
      var overflow = track.scrollWidth > track.clientWidth + 4;
      strip.classList.toggle('reco--has-overflow', overflow);
    }
    if (prev) prev.addEventListener('click', function () { track.scrollBy({ left: -step(), behavior: 'smooth' }); });
    if (next) next.addEventListener('click', function () { track.scrollBy({ left: step(), behavior: 'smooth' }); });
    track.addEventListener('scroll', function () { window.requestAnimationFrame(updateArrows); }, { passive: true });
    window.addEventListener('resize', updateArrows);

    /* Drag-to-scroll (desktop pointer). Native touch handles mobile swipe. */
    var down = false, startX = 0, startScroll = 0, moved = false;
    track.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'touch') return; /* let native touch scroll */
      down = true; moved = false; startX = e.clientX; startScroll = track.scrollLeft;
      track.classList.add('is-dragging');
    });
    window.addEventListener('pointermove', function (e) {
      if (!down) return;
      var dx = e.clientX - startX;
      if (Math.abs(dx) > 4) moved = true;
      track.scrollLeft = startScroll - dx;
    });
    window.addEventListener('pointerup', function () {
      if (!down) return;
      down = false;
      track.classList.remove('is-dragging');
    });
    /* Prevent click navigation after a drag */
    track.addEventListener('click', function (e) {
      if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; }
    }, true);

    updateArrows();
  }
  document.querySelectorAll('[data-reco]').forEach(initStrip);
})();

/* ── Product share bar (Instagram-first) ───────────────────────────────────── */
(function () {
  function initShare(bar) {
    var url = bar.getAttribute('data-share-url') || window.location.href;
    var title = bar.getAttribute('data-share-title') || document.title;
    var text = bar.getAttribute('data-share-text') || title;
    var igBtn = bar.querySelector('[data-share-ig]');
    var nativeBtn = bar.querySelector('[data-share-native]');
    var copyBtn = bar.querySelector('[data-share-copy]');
    var toast = bar.querySelector('[data-share-toast]');

    function showToast(msg) {
      if (!toast) return;
      toast.textContent = msg || 'Link copied!';
      toast.hidden = false;
      toast.classList.add('is-show');
      setTimeout(function () { toast.classList.remove('is-show'); setTimeout(function(){ toast.hidden = true; }, 250); }, 1800);
    }
    function copyLink() {
      var done = function () { showToast('Link copied!'); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(done, fallbackCopy);
      } else { fallbackCopy(); }
      function fallbackCopy() {
        try {
          var ta = document.createElement('textarea');
          ta.value = url; ta.style.position = 'fixed'; ta.style.opacity = '0';
          document.body.appendChild(ta); ta.select();
          document.execCommand('copy'); document.body.removeChild(ta); done();
        } catch (e) { showToast('Copy failed — long-press the link'); }
      }
    }
    function nativeShare() {
      if (navigator.share) {
        navigator.share({ title: title, text: text, url: url }).catch(function () {});
        return true;
      }
      return false;
    }
    /* Instagram: on mobile the native share sheet exposes Instagram Chats &
       Stories directly. On desktop (no native share) we copy the link and open
       Instagram so the user can paste into a DM/story. */
    if (igBtn) igBtn.addEventListener('click', function () {
      if (nativeShare()) return;
      copyLink();
      showToast('Link copied — opening Instagram');
      setTimeout(function () { window.open('https://www.instagram.com/', '_blank', 'noopener'); }, 500);
    });
    if (nativeBtn) nativeBtn.addEventListener('click', function () {
      if (!nativeShare()) copyLink();
    });
    if (copyBtn) copyBtn.addEventListener('click', copyLink);
  }
  document.querySelectorAll('[data-share]').forEach(initShare);
})();
