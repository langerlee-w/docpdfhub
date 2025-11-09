/* /js/common.js */
;(()=>{

  // ---------- i18n 按钮统一绑定 ----------
  function bindLangButtons(){
    document.querySelectorAll('[data-lang-btn]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const lang = btn.getAttribute('data-lang-btn') || 'en';
        window.__i18n__?.setLang(lang);
      });
    });
  }

  // ---------- 本地存储工具 ----------
  const Store = {
    get(key, def){ try{ return JSON.parse(localStorage.getItem(key)) ?? def; }catch{ return def; } },
    set(key, val){ try{ localStorage.setItem(key, JSON.stringify(val)); }catch{} }
  };

  // ---------- 文件大小格式化 ----------
  function fmtBytes(n){
    const u=['B','KB','MB','GB']; let i=0;
    while(n>=1024 && i<u.length-1){ n/=1024; i++; }
    return n.toFixed(n<10 && i?1:0)+' '+u[i];
  }

  // ---------- 顶部进度条（细条） ----------
  const Progress = {
    el: null,
    ensure(){
      if(this.el) return;
      const bar = document.createElement('div');
      bar.id = 'top-progress';
      bar.style.cssText = `
        position:fixed;left:0;top:0;height:3px;width:0%;
        background:#ec4899;box-shadow:0 0 8px rgba(236,72,153,.6);
        z-index:9999;transition:width .2s ease, opacity .2s ease`;
      document.body.appendChild(bar);
      this.el = bar;
    },
    show(){ this.ensure(); this.el.style.opacity='1'; this.set(5); },
    set(p){ this.ensure(); this.el.style.width = Math.max(0, Math.min(100, p)) + '%'; },
    hide(){ if(!this.el) return; this.el.style.opacity='0'; this.el.style.width='0%'; }
  };

  // ---------- 导出到全局 ----------
  window.DocPDFHub = { Store, fmtBytes, Progress, bindLangButtons };

  // ---------- 页面就绪：绑定语言 & 恢复首选语言 ----------
  document.addEventListener('DOMContentLoaded', ()=>{
    const lang = localStorage.getItem('lang') || 'en';
    window.__i18n__?.setLang(lang);
    bindLangButtons();
  });

})();
