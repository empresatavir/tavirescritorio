(() => {
  if (customElements.get('tv-icon')) return;
  const cache = {};
  const base = (document.currentScript && document.currentScript.src) || '';
  customElements.define('tv-icon', class extends HTMLElement {
    static get observedAttributes() { return ['name', 'logo']; }
    connectedCallback() {
      if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
      this.style.display = this.style.display || 'inline-flex';
      this.style.flex = this.style.flex || 'none';
      this.render();
    }
    attributeChangedCallback() { if (this.shadowRoot) this.render(); }
    render() {
      const root = this.shadowRoot;
      const lg = this.getAttribute('logo');
      if (lg) {
        const R = window.__resources || {}; const key = 'lg-' + lg.split('/').pop().replace('.svg', ''); const src = R[key] || lg; root.innerHTML = lg.includes('{{') ? '' : `<img src="${src}" alt="" style="width:100%;height:100%;object-fit:contain;display:block">`;
        return;
      }
      const n = this.getAttribute('name');
      if (!n || n.includes('{{')) { root.innerHTML = ''; return; }
      const R = window.__resources || {}; const url = R['ic-' + n] || (base && !base.startsWith('blob:') && !base.startsWith('data:') ? new URL(`icons/${n}.svg`, base).href : `assets/icons/${n}.svg`);
      (cache[url] || (cache[url] = fetch(url).then(r => r.ok ? r.text() : ''))).then(t => {
        if (this.getAttribute('name') !== n) return;
        root.innerHTML = t.replace(/<!--[\s\S]*?-->/, '');
        const s = root.querySelector('svg');
        if (s) { s.setAttribute('width', '100%'); s.setAttribute('height', '100%'); s.style.display = 'block'; }
      });
    }
  });
})();
