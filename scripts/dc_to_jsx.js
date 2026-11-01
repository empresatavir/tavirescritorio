const fs = require('fs');
const path = require('path');

function convertDcToJsx(html) {
  let out = html;

  // Remove <x-dc>, </x-dc>, <helmet>...</helmet>
  out = out.replace(/<x-dc>/gi, '');
  out = out.replace(/<\/x-dc>/gi, '');
  out = out.replace(/<helmet>[\s\S]*?<\/helmet>/gi, '');

  // Converte sc-camel-* para atributos normais camelCase
  out = out.replace(/sc-camel-view-box=/gi, 'viewBox=');
  out = out.replace(/sc-camel-on-key-down=/gi, 'onKeyDown=');

  // Converte atributos especiais
  out = out.replace(/class=/g, 'className=');
  out = out.replace(/for=/g, 'htmlFor=');
  out = out.replace(/stroke-width=/g, 'strokeWidth=');
  out = out.replace(/stroke-linecap=/g, 'strokeLinecap=');
  out = out.replace(/stroke-linejoin=/g, 'strokeLinejoin=');
  out = out.replace(/stroke-dashoffset=/g, 'strokeDashoffset=');
  out = out.replace(/stroke-dasharray=/g, 'strokeDasharray=');
  out = out.replace(/transform-origin=/g, 'transformOrigin=');
  out = out.replace(/clip-path=/g, 'clipPath=');
  out = out.replace(/fill-rule=/g, 'fillRule=');
  out = out.replace(/clip-rule=/g, 'clipRule=');

  // Style strings para objetos JSX
  out = out.replace(/style="([^"]*)"/g, (match, styleStr) => {
    const rules = styleStr.split(';').map(r => r.trim()).filter(Boolean);
    const objRules = rules.map(rule => {
      const idx = rule.indexOf(':');
      if (idx === -1) return '';
      const prop = rule.slice(0, idx).trim();
      const val = rule.slice(idx + 1).trim();
      // converte kebab-case para camelCase a menos que seja variável CSS (--var)
      const jsProp = prop.startsWith('--') ? `'${prop}'` : prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      return `${jsProp}: '${val.replace(/'/g, "\\'")}'`;
    }).filter(Boolean);
    return `style={{ ${objRules.join(', ')} }}`;
  });

  return out;
}

const rawTemplate = fs.readFileSync('visual/redesenho_template.html', 'utf8');
const jsxOutput = convertDcToJsx(rawTemplate);
fs.writeFileSync('visual/redesenho_template_jsx.txt', jsxOutput);
console.log('Template convertido salvo em visual/redesenho_template_jsx.txt. Tamanho:', jsxOutput.length);
