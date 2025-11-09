<script>
/**
 * Lightweight i18n loader.
 * Usage:
 *  - Add data-i18n="path.to.key" on elements (sets textContent)
 *  - For attributes, use data-i18n-attr="placeholder,title,aria-label"
 *    and data-i18n-key="path.to.key"
 *  - Call: initI18n({ defaultLang: 'en' })
 */

async function initI18n(options = {}) {
  const defaultLang = options.defaultLang || 'en';
  const supported = ['en', 'zh'];
  let lang = (localStorage.getItem('lang') || '').toLowerCase();
  if (!supported.includes(lang)) lang = defaultLang;

  // allow ?lang=en override
  const urlLang = new URL(location.href).searchParams.get('lang');
  if (urlLang && supported.includes(urlLang)) {
    lang = urlLang;
    localStorage.setItem('lang', lang);
  }

  // expose globally for toggler
  window.__i18n__ = { lang, setLang };

  const dict = await fetch(`/lang/${lang}.json`).then(r => r.json()).catch(()=> ({}));

  // text nodes
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const val = get(dict, key) ?? key;
    el.textContent = val;
  });

  // attributes
  document.querySelectorAll('[data-i18n-attr]').forEach(el => {
    const attrs = (el.getAttribute('data-i18n-attr') || '').split(',').map(s=>s.trim()).filter(Boolean);
    const key = el.getAttribute('data-i18n-key');
    const val = get(dict, key);
    if (val && typeof val === 'object') {
      // when key points to object: { placeholder: "...", title: "..." }
      for (const a of attrs) if (val[a]) el.setAttribute(a, val[a]);
    } else if (typeof val === 'string') {
      // same string for all attrs
      for (const a of attrs) el.setAttribute(a, val);
    }
  });

  // update language toggle active styles if present
  updateLangToggleUI(dict);
}

function setLang(lang){
  localStorage.setItem('lang', lang);
  // hard reload to simplify
  location.reload();
}

function get(obj, path){
  return path.split('.').reduce((o,k)=> (o && k in o ? o[k] : undefined), obj);
}

function updateLangToggleUI(dict){
  const enBtn = document.querySelector('[data-lang-btn="en"]');
  const zhBtn = document.querySelector('[data-lang-btn="zh"]');
  if (!enBtn || !zhBtn || !window.__i18n__) return;
  const current = window.__i18n__.lang;
  const active = "text-pink-600 font-bold";
  const inactive = "text-gray-500 hover:text-gray-800";
  enBtn.className = current === 'en' ? active : inactive;
  zhBtn.className = current === 'zh' ? active : inactive;

  // update their labels from dict if needed
  const enLabel = dict?.common?.language?.en || 'EN';
  const zhLabel = dict?.common?.language?.zh || '中文';
  enBtn.textContent = enLabel;
  zhBtn.textContent = zhLabel;
}

// Auto-init after DOMReady if script is included with defer
document.addEventListener('DOMContentLoaded', ()=> initI18n({ defaultLang: 'en' }));
</script>
