/*
 * Leitor do Escritório: fala de agente em blocos de leitura, trilha recolhida,
 * rolagem que acompanha e arquivo citado clicável.
 * O build (scripts/clean_and_bind_ipc.js) injeta este arquivo na página; as telas usam window.TavirReader.
 */
(function () {
  if (typeof window === 'undefined' || window.TavirReader) return;

  var FILE_RE = /^(?:[\w.@()[\]-]+[\\/])*[\w.@()[\]-]+\.[a-z][a-z0-9]{0,5}$/i;
  var NOT_FILE = /^(?:\d+(?:\.\d+)*|e\.g|i\.e|etc|v\d[\w.]*)$/i;
  function isFile(t) {
    var x = String(t || '').trim();
    return x.length > 3 && x.length < 180 && FILE_RE.test(x) && !NOT_FILE.test(x) && !/^https?:/i.test(x);
  }

  function segs(t) {
    var out = [];
    var re = /(`[^`\n]+`|\*\*[^*\n]+\*\*|\[[^\]\n]+\]\([^)\s]+\))/g;
    var last = 0;
    var m;
    var plain = function (x) { return x.replace(/(^|[\s(])[*_]([^*_\n]+)[*_](?=[\s.,;:!?)]|$)/g, '$1$2'); };
    var push = function (text, cls) {
      var file = cls !== '' && isFile(text);
      out.push({ t: text, c: cls + (file ? ' tv-md-f' : ''), f: file });
    };
    while ((m = re.exec(t))) {
      if (m.index > last) push(plain(t.slice(last, m.index)), '');
      var x = m[0];
      if (x[0] === '`') push(x.slice(1, -1), 'tv-md-c');
      else if (x[0] === '*') push(x.slice(2, -2).replace(/`/g, ''), 'tv-md-b');
      else push(x.slice(1, x.indexOf('](')), 'tv-md-b');
      last = m.index + x.length;
    }
    if (last < t.length) push(plain(t.slice(last)), '');
    return out;
  }

  var cache = new Map();
  /** Texto do agente em blocos: título, parágrafo, lista, citação, código, linha. */
  function blocks(text) {
    var src = String(text || '').replace(/\r/g, '');
    if (cache.has(src)) return cache.get(src);
    var out = [];
    var para = [];
    var code = null;
    var mk = function (k, o) {
      var b = Object.assign({ h: false, p: false, li: false, quote: false, code: false, hr: false, segs: [], text: '', mark: '', pad: 0 }, o);
      b[k] = true;
      return b;
    };
    var flush = function () { if (para.length) { out.push(mk('p', { segs: segs(para.join('\n')) })); para = []; } };
    src.split('\n').forEach(function (raw) {
      var m;
      if (code) { if (/^\s*```/.test(raw)) { out.push(mk('code', { text: code.join('\n') })); code = null; } else code.push(raw); return; }
      if (/^\s*```/.test(raw)) { flush(); code = []; return; }
      if (!raw.trim()) { flush(); return; }
      if ((m = raw.match(/^\s{0,3}#{1,6}\s+(.*)/))) { flush(); out.push(mk('h', { segs: segs(m[1].replace(/\s*#+\s*$/, '').replace(/\*\*/g, '')) })); return; }
      if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(raw)) { flush(); out.push(mk('hr', {})); return; }
      if ((m = raw.match(/^(\s*)(?:[-*+•]|(\d+)[.)])\s+(.*)/))) { flush(); out.push(mk('li', { mark: m[2] ? m[2] + '.' : '•', pad: Math.min(3, Math.floor(m[1].length / 2)) * 14, segs: segs(m[3]) })); return; }
      if ((m = raw.match(/^\s*>\s?(.*)/))) { flush(); out.push(mk('quote', { segs: segs(m[1]) })); return; }
      if (/^\s*\|.*\|\s*$/.test(raw)) {
        flush();
        if (!/^[\s|:-]+$/.test(raw)) out.push(mk('p', { segs: segs(raw.trim().replace(/^\||\|$/g, '').split('|').map(function (c) { return c.trim(); }).join(' · ')) }));
        return;
      }
      para.push(raw.trim());
    });
    if (code) out.push(mk('code', { text: code.join('\n') }));
    flush();
    if (cache.size > 400) cache.clear();
    cache.set(src, out);
    return out;
  }

  /** Trilha de uma resposta: "→" é ferramenta, "»" é o que o agente disse antes dela, o resto é registro técnico. */
  function trail(lines) {
    var steps = [];
    var meta = [];
    (lines || []).forEach(function (raw) {
      var x = String(raw);
      if (x.indexOf('→ ') === 0) steps.push({ act: true, say: false, t: x.slice(2) });
      else if (x.indexOf('» ') === 0) steps.push({ act: false, say: true, t: x.slice(2) });
      else meta.push({ t: x });
    });
    var n = steps.filter(function (x) { return x.act; }).length;
    return { steps: steps, meta: meta, n: n, label: n ? n + (n === 1 ? ' passo' : ' passos') : 'Detalhes da resposta' };
  }

  /** Conta aproximada de tokens (português: ~3,6 caracteres por token). */
  function tokens(chars) { return Math.round((Number(chars) || 0) / 3.6); }

  window.TavirReader = { blocks: blocks, segs: segs, trail: trail, isFile: isFile, tokens: tokens, openFile: null };

  // Rolagem acompanha o que está sendo escrito; se o Carlos subir para ler, para de puxar
  // até ele voltar ao fim ou enviar outra mensagem.
  if (typeof MutationObserver === 'undefined') return;
  var away = new WeakSet();
  document.addEventListener('scroll', function (e) {
    var el = e.target;
    if (!el || !el.matches || !el.matches('[data-tv-follow]')) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight > 56) away.add(el); else away.delete(el);
  }, true);
  document.addEventListener('click', function (e) {
    var t = e.target && e.target.closest ? e.target : null;
    if (!t) return;
    // Arquivo citado: abre no visualizador da tela que registrou openFile.
    var file = t.closest('.tv-md-f');
    if (file && window.TavirReader.openFile) { e.preventDefault(); window.TavirReader.openFile(String(file.textContent || '').trim()); return; }
    // Abrir os passos de uma resposta é leitura: não puxa para o fim.
    var h = t.closest('.tv-trail-h');
    if (!h || h.querySelector('.spin')) return;
    var box = h.closest('[data-tv-follow]');
    if (box) away.add(box);
  }, true);
  var resume = function (e) {
    if (e.type === 'keydown' && (e.key !== 'Enter' || e.shiftKey || !e.target.matches || !e.target.matches('.tv-iris-in'))) return;
    var sec = e.target && e.target.closest ? e.target.closest('[data-tv-chat]') : null;
    if (sec) sec.querySelectorAll('[data-tv-follow]').forEach(function (el) { away.delete(el); });
  };
  document.addEventListener('submit', resume, true);
  document.addEventListener('keydown', resume, true);
  var queued = false;
  var pull = function () {
    queued = false;
    document.querySelectorAll('[data-tv-follow]').forEach(function (el) { if (!away.has(el)) el.scrollTop = el.scrollHeight; });
  };
  new MutationObserver(function () { if (!queued) { queued = true; requestAnimationFrame(pull); } })
    .observe(document.documentElement, { childList: true, subtree: true, characterData: true });
})();
