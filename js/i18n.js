// /js/i18n.js
(function () {
  const I18N_BASE = '/i18n/'; // 关键：用绝对路径，避免 /tools/ 下 404
  const FALLBACK_LANG = 'en';

  let messages = {};
  let currentLang = localStorage.getItem('lang') || FALLBACK_LANG;

  const applyText = (el, key) => {
    const val = t(key);
    if (val == null) return;
    el.textContent = val;
  };
  const applyHTML = (el, key) => {
    const val = t(key);
    if (val == null) return;
    el.innerHTML = val;
  };
  const applyAttr = (el, key, attr) => {
    const val = t(key);
    if (val == null) return;
    el.setAttribute(attr, val);
  };

  function t(key) {
    // 支持 a.b.c 取值
    const parts = (key || '').split('.');
    let cur = messages;
    for (const p of parts) {
      if (cur && Object.prototype.hasOwnProperty.call(cur, p)) {
        cur = cur[p];
      } else {
        return null;
      }
    }
    return typeof cur === 'string' ? cur : null;
  }

  function renderAll() {
    // 普通文本
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      applyText(el, el.getAttribute('data-i18n'));
    });
    // 可包含 HTML 的场景（如强调/链接）
    document.querySelectorAll('[data-i18n-html]').forEach((el) => {
      applyHTML(el, el.getAttribute('data-i18n-html'));
    });
    // placeholder
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      applyAttr(el, el.getAttribute('data-i18n-placeholder'), 'placeholder');
    });
    // title（放在 <title data-i18n-doc-title="key">）
    const titleEl = document.querySelector('[data-i18n-doc-title]');
    if (titleEl) {
      const k = titleEl.getAttribute('data-i18n-doc-title');
      const val = t(k);
      if (val) document.title = val;
    }
    // meta description（放在 <meta data-i18n-meta="key">）
    document.querySelectorAll('meta[data-i18n-meta]').forEach((el) => {
      const key = el.getAttribute('data-i18n-meta');
      const val = t(key);
      if (val) el.setAttribute('content', val);
    });
  }

  async function loadLang(lang) {
    // 绝对路径，避免 /tools/ 子目录解析错误
    const url = `${I18N_BASE}${lang}.json`;
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`i18n: cannot load ${url}`);
    return res.json();
  }

  async function setLang(lang) {
    try {
      messages = await loadLang(lang);
      currentLang = lang;
      localStorage.setItem('lang', lang);
      renderAll();
    } catch (e) {
      console.warn('[i18n] load failed for', lang, e);
      if (lang !== FALLBACK_LANG) {
        try {
          messages = await loadLang(FALLBACK_LANG);
          currentLang = FALLBACK_LANG;
          localStorage.setItem('lang', FALLBACK_LANG);
          renderAll();
        } catch (e2) {
          console.error('[i18n] fallback failed', e2);
        }
      }
    }
  }

  // 暴露到全局，给页面按钮调用
  window.__i18n__ = {
    setLang,
    t,
    get lang() {
      return currentLang;
    },
  };

  // 首次应用：DOMContentLoaded 后按 localStorage 设置语言
  document.addEventListener('DOMContentLoaded', () => {
    const initial = localStorage.getItem('lang') || FALLBACK_LANG;
    setLang(initial);
    // 按钮事件绑定（如果页面里有 data-lang-btn）
    document.querySelectorAll('[data-lang-btn]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const to = btn.getAttribute('data-lang-btn') || FALLBACK_LANG;
        setLang(to);
      });
    });
  });
})();
