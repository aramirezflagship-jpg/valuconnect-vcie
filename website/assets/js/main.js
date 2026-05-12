/* ValuConnect Solutions — Main JS */

// ── Language switching ──────────────────────────────────────────────
function setLanguage(lang) {
  document.documentElement.lang = lang;
  localStorage.setItem('vcs-lang', lang);
  document.querySelectorAll('.lang-btn').forEach(function (btn) {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });
}

// Apply saved language before DOM ready to avoid flash
(function () {
  var saved = localStorage.getItem('vcs-lang') || 'en';
  document.documentElement.lang = saved;
})();

// ── DOM ready ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {

  // Sync language button states with saved preference
  var currentLang = localStorage.getItem('vcs-lang') || 'en';
  document.querySelectorAll('.lang-btn').forEach(function (btn) {
    btn.classList.toggle('active', btn.dataset.lang === currentLang);
    btn.addEventListener('click', function () {
      setLanguage(btn.dataset.lang);
    });
  });

  // ── Mobile nav toggle ──
  var toggle = document.querySelector('.nav-toggle');
  var navLinks = document.querySelector('.nav-links');
  if (toggle && navLinks) {
    toggle.addEventListener('click', function () {
      var isOpen = navLinks.classList.toggle('open');
      toggle.textContent = isOpen ? '✕' : '☰';
    });
  }

  // Close mobile menu when a link is clicked
  document.querySelectorAll('.nav-links a').forEach(function (link) {
    link.addEventListener('click', function () {
      if (navLinks) navLinks.classList.remove('open');
      if (toggle) toggle.textContent = '☰';
    });
  });

  // ── Smooth scroll for anchor links ──
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      var href = this.getAttribute('href');
      if (href === '#') return;
      var target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // ── Scroll fade-in ──
  var style = document.createElement('style');
  style.textContent = '.fade-in { opacity: 0; transform: translateY(20px); transition: opacity 0.55s ease, transform 0.55s ease; } .fade-in.visible { opacity: 1; transform: translateY(0); }';
  document.head.appendChild(style);

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll(
    '.service-card, .industry-card, .step, .experience-card, .result-card, .meet-valu-content'
  ).forEach(function (el) {
    el.classList.add('fade-in');
    observer.observe(el);
  });

  // ── Mascot image fallback ──
  document.querySelectorAll('.mascot-img, .meet-valu-img').forEach(function (img) {
    img.addEventListener('error', function () {
      var ph = this.nextElementSibling;
      if (ph && ph.classList.contains('mascot-placeholder')) {
        this.style.display = 'none';
        ph.style.display = 'flex';
      } else {
        this.style.display = 'none';
      }
    });
  });

  // ── Logo image fallback ──
  document.querySelectorAll('.nav-logo-img, .footer-logo-img').forEach(function (img) {
    img.addEventListener('error', function () {
      this.style.display = 'none';
      var fallback = this.nextElementSibling;
      if (fallback) fallback.style.display = 'block';
    });
  });

});
