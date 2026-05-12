const savedLang = localStorage.getItem('vc-lang') || 'en';
document.body.classList.toggle('es', savedLang === 'es');

function setLang(lang) {
  document.body.classList.toggle('es', lang === 'es');
  localStorage.setItem('vc-lang', lang);
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.l === lang);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.l === savedLang);
    btn.addEventListener('click', () => setLang(btn.dataset.l));
  });
});
