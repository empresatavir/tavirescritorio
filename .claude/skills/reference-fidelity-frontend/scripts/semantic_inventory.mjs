import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Inventory readable text and semantic/interactive UI in the main page and its frames.
 * This is a DOM-based inventory, not a complete browser accessibility-tree audit.
 */
export async function collectSemanticInventory(page, { side, screenId, includeFieldValues = false }) {
  const frames = [];
  const warnings = [];
  for (const frame of page.frames()) {
    try {
      const data = await frame.evaluate(({ includeFieldValues }) => {
        const normalize = value => String(value ?? '').replace(/\s+/g, ' ').trim();
        const roots = [];
        const elements = [];
        const walk = root => {
          roots.push(root);
          const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
          let node;
          while ((node = walker.nextNode())) {
            const el = node;
            elements.push(el);
            if (el.shadowRoot) walk(el.shadowRoot); // Open shadow roots only.
          }
        };
        walk(document);

        const isVisible = el => {
          if (!el || !el.isConnected || !el.getClientRects?.().length) return false;
          let cur = el;
          while (cur) {
            if (cur.nodeType === 1) {
              if (cur.hasAttribute('hidden') || cur.getAttribute('aria-hidden') === 'true') return false;
              const style = getComputedStyle(cur);
              if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
            }
            cur = cur.parentElement || cur.getRootNode?.().host || null;
          }
          return true;
        };
        const textOf = el => normalize(el?.innerText || el?.textContent || '');
        const roleOf = el => {
          const explicit = el.getAttribute('role');
          if (explicit) return explicit.split(/\s+/)[0];
          const tag = el.tagName.toLowerCase();
          if (/^h[1-6]$/.test(tag)) return 'heading';
          if (tag === 'button' || (tag === 'input' && ['button', 'submit', 'reset'].includes(el.type))) return 'button';
          if (tag === 'a' && el.hasAttribute('href')) return 'link';
          if (tag === 'textarea' || (tag === 'input' && ['text', 'search', 'email', 'url', 'tel', 'password', ''].includes(el.type))) return 'textbox';
          if (tag === 'select') return el.multiple ? 'listbox' : 'combobox';
          if (tag === 'input' && el.type === 'checkbox') return 'checkbox';
          if (tag === 'input' && el.type === 'radio') return 'radio';
          if (tag === 'nav') return 'navigation';
          if (tag === 'main') return 'main';
          if (tag === 'form') return 'form';
          if (tag === 'img' && el.alt) return 'img';
          return '';
        };
        const labelOf = el => {
          const aria = normalize(el.getAttribute('aria-label'));
          if (aria) return aria;
          const labelledBy = normalize(el.getAttribute('aria-labelledby'));
          if (labelledBy) {
            const scope = el.getRootNode();
            const lookup = id => scope.getElementById?.(id) || document.getElementById(id);
            const text = labelledBy.split(/\s+/).map(lookup).filter(Boolean).map(textOf).filter(Boolean).join(' ');
            if (text) return normalize(text);
          }
          const labels = el.labels ? Array.from(el.labels).map(textOf).filter(Boolean).join(' ') : '';
          return normalize(labels);
        };
        const nameOf = el => labelOf(el) || normalize(el.getAttribute('placeholder')) || normalize(el.getAttribute('title')) || textOf(el) || ((el.tagName.toLowerCase() === 'input' && ['button', 'submit', 'reset'].includes(el.type)) ? normalize(el.value) : '') || '';
        const rectOf = el => {
          const r = el.getBoundingClientRect();
          return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) };
        };
        const textNodes = [];
        for (const root of roots) {
          const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
          let node;
          while ((node = walker.nextNode())) {
            const parent = node.parentElement;
            const text = normalize(node.nodeValue);
            if (!text || !parent || !isVisible(parent) || ['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE'].includes(parent.tagName)) continue;
            textNodes.push({ text, tag: parent.tagName.toLowerCase(), id: parent.id || '', role: roleOf(parent) || null });
          }
        }

        const visible = elements.filter(isVisible);
        const counts = {};
        for (const el of visible) {
          const tag = el.tagName.toLowerCase();
          counts[tag] = (counts[tag] || 0) + 1;
        }
        const controls = [];
        const semanticElements = [];
        const interactiveSelector = 'button,a[href],input,textarea,select,[contenteditable="true"],[tabindex]:not([tabindex="-1"]),summary';
        const landmarkTags = new Set(['main', 'nav', 'header', 'footer', 'aside', 'article', 'section', 'form', 'fieldset', 'legend', 'label', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']);
        for (const el of visible) {
          const tag = el.tagName.toLowerCase();
          const explicitRole = el.getAttribute('role');
          const interactive = el.matches(interactiveSelector) || Boolean(explicitRole && /button|link|textbox|searchbox|combobox|listbox|checkbox|radio|switch|tab|menuitem|option|slider|spinbutton/.test(explicitRole));
          const role = roleOf(el) || null;
          const label = labelOf(el);
          const placeholder = normalize(el.getAttribute('placeholder'));
          const title = normalize(el.getAttribute('title'));
          const text = textOf(el);
          const hasSemantics = interactive || explicitRole || label || placeholder || title || landmarkTags.has(tag) || (tag === 'img' && el.hasAttribute('alt'));
          if (!hasSemantics) continue;
          const entry = {
            tag,
            id: el.id || null,
            role,
            name: nameOf(el) || null,
            label: label || null,
            text: text || null,
            placeholder: placeholder || null,
            title: title || null,
            rect: rectOf(el),
          };
          semanticElements.push(entry);
          if (interactive || ['label', 'fieldset', 'legend'].includes(tag)) {
            const control = {
              ...entry,
              kind: tag === 'input' || tag === 'textarea' || tag === 'select' ? 'field' : tag === 'label' ? 'label' : 'control',
              type: tag === 'input' ? (el.type || 'text') : null,
              nameAttribute: el.getAttribute('name') || null,
              required: Boolean(el.required),
              disabled: Boolean(el.disabled),
              checked: 'checked' in el ? Boolean(el.checked) : null,
              selected: tag === 'select' ? Array.from(el.selectedOptions).map(o => ({ label: normalize(o.label), ...(includeFieldValues ? { value: o.value } : {}) })) : null,
              hasValue: 'value' in el ? Boolean(el.value) : null,
            };
            if (includeFieldValues && tag !== 'label' && !(tag === 'input' && ['password', 'hidden'].includes(el.type))) {
              control.value = 'value' in el ? String(el.value).slice(0, 500) : null;
            }
            controls.push(control);
          }
        }

        const dialogs = [];
        const dialogSelector = 'dialog,[role="dialog"],[role="alertdialog"],[aria-modal="true"]';
        for (const el of elements.filter(e => e.matches(dialogSelector))) {
          const headings = Array.from(el.querySelectorAll('h1,h2,h3,h4,h5,h6,[role="heading"]')).map(textOf).filter(Boolean);
          const visibleNow = isVisible(el) && (el.tagName.toLowerCase() !== 'dialog' || el.open);
          dialogs.push({
            tag: el.tagName.toLowerCase(),
            role: el.getAttribute('role') || (el.tagName.toLowerCase() === 'dialog' ? 'dialog' : null),
            name: labelOf(el) || headings[0] || normalize(el.getAttribute('title')) || null,
            headings,
            text: textOf(el).slice(0, 3000) || null,
            visible: visibleNow,
          });
        }
        const images = visible.filter(el => el.tagName.toLowerCase() === 'img').map(el => ({
          alt: normalize(el.getAttribute('alt')) || null,
          title: normalize(el.getAttribute('title')) || null,
          width: Math.round(el.getBoundingClientRect().width),
          height: Math.round(el.getBoundingClientRect().height),
        }));
        return {
          url: location.href,
          title: document.title,
          viewport: { width: innerWidth, height: innerHeight, devicePixelRatio },
          visibleElementCountsByTag: counts,
          visibleText: textNodes,
          semanticElements,
          controls,
          dialogs,
          images,
        };
      }, { includeFieldValues });
      frames.push({ name: frame.name() || null, url: frame.url(), ...data });
    } catch (error) {
      warnings.push(`Frame '${frame.url()}' could not be inventoried: ${error.message}`);
    }
  }
  return { screenId, side, capturedUrl: page.url(), frames, warnings, fieldValuesIncluded: includeFieldValues };
}

const normalizeText = text => String(text ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
function multisetDiff(referenceItems, candidateItems) {
  const a = new Map(), b = new Map();
  for (const item of referenceItems) a.set(item, (a.get(item) || 0) + 1);
  for (const item of candidateItems) b.set(item, (b.get(item) || 0) + 1);
  const missing = [], extra = [];
  for (const [value, count] of a) if (count > (b.get(value) || 0)) missing.push({ value, count: count - (b.get(value) || 0) });
  for (const [value, count] of b) if (count > (a.get(value) || 0)) extra.push({ value, count: count - (a.get(value) || 0) });
  return { missing, extra, matchedCount: [...a].reduce((n, [value, count]) => n + Math.min(count, b.get(value) || 0), 0), referenceCount: [...a.values()].reduce((x, y) => x + y, 0), candidateCount: [...b.values()].reduce((x, y) => x + y, 0) };
}
function controlSignature(control) {
  return [control.kind, control.role, control.name, control.label, control.placeholder, control.type].map(normalizeText).join(' | ');
}
function dialogSignature(dialog) {
  return [dialog.role, dialog.name, ...(dialog.headings || [])].map(normalizeText).filter(Boolean).join(' | ');
}

export function compareSemanticInventories(reference, candidate, screenIds) {
  return screenIds.map(screenId => {
    const refInv = reference[screenId];
    const candInv = candidate[screenId];
    const flatten = (inventory, key) => (inventory?.frames || []).flatMap(frame => frame[key] || []);
    const text = multisetDiff(
      flatten(refInv, 'visibleText').map(x => normalizeText(x.text)).filter(Boolean),
      flatten(candInv, 'visibleText').map(x => normalizeText(x.text)).filter(Boolean),
    );
    const controls = multisetDiff(
      flatten(refInv, 'controls').map(controlSignature),
      flatten(candInv, 'controls').map(controlSignature),
    );
    const dialogs = multisetDiff(
      flatten(refInv, 'dialogs').map(dialogSignature).filter(Boolean),
      flatten(candInv, 'dialogs').map(dialogSignature).filter(Boolean),
    );
    return { screenId, referencePresent: Boolean(refInv), candidatePresent: Boolean(candInv), text, controls, dialogs };
  });
}

const esc = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
function diffList(items) {
  if (!items.length) return '<li class="ok">Nenhuma diferença nesta categoria.</li>';
  return items.map(item => `<li><code>${esc(item.value)}</code>${item.count > 1 ? ` <span>× ${item.count}</span>` : ''}</li>`).join('');
}

export function renderSemanticReport(records) {
  const sections = records.map(record => {
    const summary = `texto: ${record.text.matchedCount}/${record.text.referenceCount}; controles: ${record.controls.matchedCount}/${record.controls.referenceCount}; diálogos: ${record.dialogs.matchedCount}/${record.dialogs.referenceCount}`;
    return `<details open><summary><strong>${esc(record.screenId)}</strong><span>${esc(summary)}</span></summary><div class="grid">${['text', 'controls', 'dialogs'].map((kind, index) => {
      const label = ['Textos visíveis ausentes / extras', 'Labels e controles ausentes / extras', 'Diálogos ausentes / extras'][index];
      const data = record[kind];
      return `<section><h3>${label}</h3><h4>Ausentes na implementação (${data.missing.length})</h4><ul>${diffList(data.missing)}</ul><h4>Extras na implementação (${data.extra.length})</h4><ul>${diffList(data.extra)}</ul></section>`;
    }).join('')}</div></details>`;
  }).join('');
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Inventário semântico — diferenças</title><style>body{font:15px/1.5 system-ui,sans-serif;background:#f4f6f8;color:#17212b;margin:0}main{max-width:1200px;margin:auto;padding:26px}h1{line-height:1.2}p{color:#526173}details{background:#fff;border:1px solid #d6dde5;border-radius:10px;margin:14px 0;padding:14px}summary{cursor:pointer;display:flex;justify-content:space-between;gap:20px;flex-wrap:wrap}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:14px;margin-top:16px}section{background:#f8fafc;border:1px solid #e1e6eb;border-radius:8px;padding:12px}h3{font-size:1rem}h4{font-size:.88rem;color:#536274;margin-bottom:4px}ul{padding-left:20px;overflow-wrap:anywhere}.ok{color:#12805c}code{white-space:pre-wrap;font-size:.85rem}span{color:#526173;font-size:.9rem}</style></head><body><main><h1>Inventário semântico por tela</h1><p>Compara textos visíveis, controles/campos e diálogos encontrados no DOM renderizado. Textos e controles ausentes/extras são contados com duplicatas. Isso não substitui revisão visual ou teste funcional; os nomes são inferidos dos atributos/labels HTML e não constituem uma auditoria completa da árvore de acessibilidade.</p>${sections}</main></body></html>`;
}

export async function writeSemanticArtifacts({ root, reference, candidate, screenIds }) {
  await mkdir(root, { recursive: true });
  const comparisons = compareSemanticInventories(reference, candidate, screenIds);
  await writeFile(path.join(root, 'comparison.json'), JSON.stringify({ metric: 'exact_normalized_multiset_comparison_of_visible_text_controls_and_dialog_names', records: comparisons }, null, 2) + '\n', 'utf8');
  await writeFile(path.join(root, 'report.html'), renderSemanticReport(comparisons), 'utf8');
}
