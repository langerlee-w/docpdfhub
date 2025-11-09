<script>
/*! DocPDFHub i18n (vanilla) */
(function () {
  const STORE_KEY = 'lang';
  const LOCALE_DIR = '/locales';
  const DEFAULT_LANG = 'en';

  const cache = new Map(); // lang -> dict
  let currentLang = null;
  let dict = {};

  // ---------- utils ----------
  const isObj = (v) => v && typeof v === 'object';
  const get = (obj, path) => {
    if (!obj) return undefined;
    return path.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj);
  };

  const fetchJSON = async (url) => {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
    return res.json();
  };

  const chooseInitialLang = () => {
    const saved = localStorage.getItem(STORE_KEY);
    if (saved) return saved;
    const nav = (navigator.languages && navigator.languages[0]) || navigator.language || '';
    if (/^zh/i.test(nav)) return 'zh';
    return DEFAULT_LANG;
  };

  // ---------- core ----------
  async function loadDict(lang) {
    if (cache.has(lang)) return cache.get(lang);
    const data = await fetchJSON(`${LOCALE_DIR}/${lang}.json`);
    cache.set(lang, data);
    return data;
  }
  async function ensureFallbackEn() {
    if (!cache.has('en')) {
      const en = await fetchJSON(`${LOCALE_DIR}/en.json`);
      cache.set('en', en);
    }
  }

  function translateNode(node) {
    // text content
    const key = node.getAttribute('data-i18n');
    if (key) {
      const v = get(dict, key) ?? get(cache.get('en'), key) ?? key;
      node.textContent = v;
    }
    // placeholder
    const phKey = node.getAttribute('data-i18n-placeholder');
    if (phKey) {
      const v = get(dict, phKey) ?? get(cache.get('en'), phKey) ?? phKey;
      node.setAttribute('placeholder', v);
    }
    // title attr
    const ttKey = node.getAttribute('data-i18n-title-attr');
    if (ttKey) {
      const v = get(dict, ttKey) ?? get(cache.get('en'), ttKey) ?? ttKey;
      node.setAttribute('title', v);
    }
    // aria-label
    const ariaKey = node.getAttribute('data-i18n-aria-label');
    if (ariaKey) {
      const v = get(dict, ariaKey) ?? get(cache.get('en'), ariaKey) ?? ariaKey;
      node.setAttribute('aria-label', v);
    }
  }

  function applyAll(root = document) {
    // regular nodes
    root.querySelectorAll('[data-i18n],[data-i18n-placeholder],[data-i18n-title-attr],[data-i18n-aria-label]').forEach(translateNode);

    // <title>
    const titleEl = document.querySelector('title[data-i18n-doc-title]');
    if (titleEl) {
      const key = titleEl.getAttribute('data-i18n-doc-title');
      const v = get(dict, key) ?? get(cache.get('en'), key) ?? titleEl.textContent;
      document.title = v;
    }

    // <meta name="description">
    const meta = document.querySelector('meta[name="description"][data-i18n-meta]');
    if (meta) {
      const key = meta.getAttribute('data-i18n-meta');
      const v = get(dict, key) ?? get(cache.get('en'), key) ?? meta.getAttribute('content') || '';
      meta.setAttribute('content', v);
    }

    // <html lang="">
    if (document.documentElement.getAttribute('lang') !== currentLang) {
      document.documentElement.setAttribute('lang', currentLang);
    }
  }

  async function setLang(lang) {
    try {
      await ensureFallbackEn();
      currentLang = lang || DEFAULT_LANG;
      dict = await loadDict(currentLang);
      applyAll();
      localStorage.setItem(STORE_KEY, currentLang);
    } catch (e) {
      console.error('[i18n] setLang error:', e);
    }
  }

  function getLang() {
    return currentLang;
  }

  function t(path, fallback = '') {
    return get(dict, path) ?? get(cache.get('en'), path) ?? fallback || path;
  }

  // Observe newly added nodes
  const mo = new MutationObserver((muts) => {
    for (const m of muts) {
      if (m.type === 'childList') {
        m.addedNodes.forEach((n) => {
          if (n.nodeType === 1) applyAll(n);
        });
      } else if (m.type === 'attributes') {
        if (
          m.attributeName &&
          /^data-i18n($|-)/.test(m.attributeName) &&
          m.target &&
          m.target.nodeType === 1
        ) {
          translateNode(m.target);
        }
      }
    }
  });

  // expose api
  window.__i18n__ = { setLang, getLang, t };

  // boot
  document.addEventListener('DOMContentLoaded', async () => {
    // attach click handlers on lang buttons
    document.querySelectorAll('[data-lang-btn]').forEach((btn) => {
      btn.addEventListener('click', () => setLang(btn.getAttribute('data-lang-btn')));
    });

    // initial lang
    const initial = chooseInitialLang();
    await setLang(initial);

    // start observer
    mo.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: [
        'data-i18n',
        'data-i18n-placeholder',
        'data-i18n-title-attr',
        'data-i18n-aria-label'
      ]
    });
  });
})();
</script>
