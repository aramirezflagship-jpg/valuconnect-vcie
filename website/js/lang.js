function applyLang(lang) {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    const val = translations[lang]?.[key];
    if (val !== undefined) el.innerHTML = val;
  });
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.l === lang);
  });
  document.documentElement.lang = lang;
  localStorage.setItem('vc-lang', lang);
}

document.addEventListener('DOMContentLoaded', () => {
  const lang = localStorage.getItem('vc-lang') || 'en';
  applyLang(lang);
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => applyLang(btn.dataset.l));
  });
});
