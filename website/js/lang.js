(function () {
  var savedLang = localStorage.getItem('vc-lang') || 'en';

  function applyTranslations(lang) {
    var t = (typeof translations !== 'undefined' && translations[lang]) ? translations[lang] : {};
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      if (t[key] !== undefined) el.innerHTML = t[key];
    });
    document.body.classList.toggle('lang-es', lang === 'es');
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-l]').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.l === lang);
    });
    localStorage.setItem('vc-lang', lang);
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-l]').forEach(function (btn) {
      btn.addEventListener('click', function () { applyTranslations(btn.dataset.l); });
    });

    var toggle = document.querySelector('.nav-toggle');
    var navLinks = document.querySelector('.nav-links');
    if (toggle && navLinks) {
      toggle.addEventListener('click', function () {
        navLinks.classList.toggle('open');
        toggle.textContent = navLinks.classList.contains('open') ? '✕' : '☰';
      });
      navLinks.querySelectorAll('a').forEach(function (link) {
        link.addEventListener('click', function () {
          navLinks.classList.remove('open');
          toggle.textContent = '☰';
        });
      });
    }

    applyTranslations(savedLang);
  });
})();
