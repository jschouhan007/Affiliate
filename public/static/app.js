// DealSpot frontend JS
(function () {
  'use strict';

  // ---- Theme toggle ----
  var root = document.documentElement;
  var toggle = document.getElementById('theme-toggle');
  function applyTheme(t) {
    root.setAttribute('data-theme', t);
    try { localStorage.setItem('theme', t); } catch (e) {}
    if (toggle) toggle.setAttribute('aria-checked', t === 'dark' ? 'true' : 'false');
  }
  if (toggle) {
    toggle.setAttribute('aria-checked', root.getAttribute('data-theme') === 'dark' ? 'true' : 'false');
    toggle.addEventListener('click', function () {
      applyTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    });
  }

  // Mobile menu toggle
  var btn = document.getElementById('mobile-menu-btn');
  var menu = document.getElementById('mobile-menu');
  if (btn && menu) {
    btn.addEventListener('click', function () {
      menu.classList.toggle('hidden');
    });
  }

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
})();
