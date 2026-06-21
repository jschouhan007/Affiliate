// DealSpot frontend JS
(function () {
  'use strict';

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
})();
