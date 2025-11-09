<!-- /js/i18n.js -->
<script>
(function () {
  const LSK = 'lang';
  const htmlEl = document.documentElement;

  // 默认优先 localStorage；若没有，默认 'en'（不再跟随浏览器）
  const detectLang = () => localStorage.getItem(LSK) || 'en';

  let currentLang = detectLang();
  const dictCache = new Map();

  function getByPath(obj, path) {
    return path.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj);
  }

  async function loadDict(lang) {
    if (dictCache.has(lang)) return dictCache.get(lang);
    try {
      const res = await fetch(`/lang/${lang}.json`, { cache: 'no-store' });
      if (!res.ok) throw new Error('lang fetch failed');
      const json = await res.json();
      dictCache.set(lang, json);
      return json;
    } catch (e) {
      console.warn(`[i18n] Failed to load /lang/${lang}.json`, e);
      const empty = {};
      dictCache.set(lang, empty);
      return empty;
    }
  }

  function applyLang(dict) {
    document.querySelectorAll('[data-i18n]').forEach(node => {
      const key = node.getAttribute('data-i18n');
      const txt = getByPath(dict, key);
      if (typeof txt === 'string') node.textContent = txt;
    });
  }

  async function setLang(lang) {
    currentLang = lang;
    localStorage.setItem(LSK, lang);
    htmlEl.setAttribute('lang', lang === 'zh' ? 'zh-CN' : 'en');
    const dict = await loadDict(lang);
    applyLang(dict);
  }

  // 暴露给全站使用（工具页/首页共用）
  window.__i18n__ = { setLang, get lang(){ return currentLang; } };

  // 初始化
  setLang(currentLang);

  // EN/中文 按钮（如果页面上存在）
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-lang-btn]');
    if (btn) setLang(btn.getAttribute('data-lang-btn'));
  });
})();
</script>
