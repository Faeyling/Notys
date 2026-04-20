import { useRef } from 'react';
import DOMPurify from 'dompurify';

/* ── DOMPurify CSS whitelist ───────────────────────────────────────────────
   Allow only the CSS properties our own renderMarkdown() actually emits.
   Any style attribute containing other properties (e.g. injected via a
   crafted paste) will have those properties stripped before insertion.       */
const SAFE_CSS_PROPS = new Set([
  'font-size', 'font-weight', 'margin', 'margin-top', 'margin-bottom',
  'padding', 'padding-left', 'list-style', 'background', 'border-radius',
]);

if (typeof window !== 'undefined' && !DOMPurify._notysHookAdded) {
  DOMPurify.addHook('afterSanitizeAttributes', node => {
    if (!node.hasAttribute('style')) return;
    const clean = node.getAttribute('style')
      .split(';')
      .filter(decl => {
        const prop = decl.split(':')[0]?.trim().toLowerCase();
        return prop && SAFE_CSS_PROPS.has(prop);
      })
      .join(';');
    if (clean) node.setAttribute('style', clean);
    else node.removeAttribute('style');
  });
  DOMPurify._notysHookAdded = true;
}

const TOOLBAR = [
  { label: 'H1', insert: (t, s, e) => `# ${t.slice(s,e)||'Titre 1'}`, text: 'H1' },
  { label: 'H2', insert: (t, s, e) => `## ${t.slice(s,e)||'Titre 2'}`, text: 'H2' },
  { label: 'H3', insert: (t, s, e) => `### ${t.slice(s,e)||'Titre 3'}`, text: 'H3' },
  { label: 'Gras', wrap: '**', text: 'G', bold: true },
  { label: 'Italique', wrap: '_', text: 'I', italic: true },
  { label: 'Souligné', wrapHtml: '<u>', closeHtml: '</u>', text: 'S', underline: true },
  { label: 'Code', wrap: '`', text: '</>' },
  { label: 'Case à cocher', linePrefix: '- [ ] ', text: '☑' },
  { label: 'Liste à puce', linePrefix: '- ', text: '•' },
  { label: 'Liste numérotée', linePrefix: '1. ', text: '1.' },
];

export default function MarkdownEditor({ value, onChange, fg }) {
  const taRef = useRef(null);

  const apply = (tool) => {
    const ta = taRef.current;
    if (!ta) return;
    const s = ta.selectionStart, e = ta.selectionEnd;
    const sel = value.slice(s, e);
    let newVal = value, cursor = s;

    if (tool.linePrefix) {
      const lineStart = value.lastIndexOf('\n', s - 1) + 1;
      newVal = value.slice(0, lineStart) + tool.linePrefix + value.slice(lineStart);
      cursor = s + tool.linePrefix.length;
    } else if (tool.wrap) {
      const inner = sel || 'texte';
      const wrapped = `${tool.wrap}${inner}${tool.wrap}`;
      newVal = value.slice(0, s) + wrapped + value.slice(e);
      cursor = s + tool.wrap.length + inner.length + tool.wrap.length;
    } else if (tool.wrapHtml) {
      const inner = sel || 'texte';
      const wrapped = `${tool.wrapHtml}${inner}${tool.closeHtml}`;
      newVal = value.slice(0, s) + wrapped + value.slice(e);
      cursor = s + wrapped.length;
    } else if (tool.insert) {
      const ins = tool.insert(value, s, e);
      newVal = value.slice(0, s) + ins + value.slice(e);
      cursor = s + ins.length;
    }

    onChange(newVal);
    setTimeout(() => { ta.focus(); ta.setSelectionRange(cursor, cursor); }, 0);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-2">
      {/* Toolbar */}
      <div className="flex items-center gap-1 flex-wrap pb-2 border-b" style={{ borderColor: `${fg}25` }}>
        {TOOLBAR.map((tool, i) => (
          <button
            key={i}
            onMouseDown={e => { e.preventDefault(); apply(tool); }}
            onTouchStart={e => { e.preventDefault(); apply(tool); }}
            title={tool.label}
            aria-label={tool.label}
            className="px-3 py-2 rounded-lg text-xs font-bold transition-all hover:opacity-70 active:scale-90 select-none min-w-[40px]"
            style={{
              color: fg,
              background: `${fg}18`,
              fontStyle: tool.italic ? 'italic' : 'normal',
              fontWeight: tool.bold ? 900 : 700,
              textDecoration: tool.underline ? 'underline' : 'none',
              fontFamily: 'Quicksand, sans-serif',
            }}
          >
            {tool.text}
          </button>
        ))}
      </div>

      <label className="sr-only" htmlFor="markdown-editor-textarea">Contenu de la note</label>
      <textarea
        id="markdown-editor-textarea"
        ref={taRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Écris ta note en Markdown..."
        className="flex-1 resize-none text-sm leading-relaxed outline-none bg-transparent"
        style={{
          color: fg,
          minHeight: 200,
          fontFamily: 'Quicksand, sans-serif',
        }}
      />
    </div>
  );
}

export function renderMarkdown(text) {
  if (!text) return '';
  const safe = text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(?<!\*)_(.+?)_(?!\*)/g, '<em>$1</em>')
    .replace(/&lt;u&gt;(.+?)&lt;\/u&gt;/g, '<u>$1</u>')
    .replace(/`(.+?)`/g, '<code style="background:rgba(0,0,0,0.08);padding:1px 4px;border-radius:4px;font-size:0.9em">$1</code>');

  const lines = safe.split('\n');
  const result = [];
  let ulOpen = false, olOpen = false;

  const closeList = () => {
    if (ulOpen) { result.push('</ul>'); ulOpen = false; }
    if (olOpen) { result.push('</ol>'); olOpen = false; }
  };

  for (const line of lines) {
    if (/^### (.+)$/.test(line)) { closeList(); result.push(line.replace(/^### (.+)$/, '<h3 style="font-size:1rem;font-weight:700;margin:8px 0 4px">$1</h3>')); }
    else if (/^## (.+)$/.test(line)) { closeList(); result.push(line.replace(/^## (.+)$/, '<h2 style="font-size:1.1rem;font-weight:700;margin:10px 0 4px">$1</h2>')); }
    else if (/^# (.+)$/.test(line)) { closeList(); result.push(line.replace(/^# (.+)$/, '<h1 style="font-size:1.25rem;font-weight:800;margin:12px 0 6px">$1</h1>')); }
    else if (/^- \[x\] (.+)$/.test(line)) {
      if (olOpen) { result.push('</ol>'); olOpen = false; }
      if (!ulOpen) { result.push('<ul style="list-style:none;padding-left:4px">'); ulOpen = true; }
      result.push(line.replace(/^- \[x\] (.+)$/, '<li style="margin:2px 0">✅ $1</li>'));
    } else if (/^- \[ \] (.+)$/.test(line)) {
      if (olOpen) { result.push('</ol>'); olOpen = false; }
      if (!ulOpen) { result.push('<ul style="list-style:none;padding-left:4px">'); ulOpen = true; }
      result.push(line.replace(/^- \[ \] (.+)$/, '<li style="margin:2px 0">☐ $1</li>'));
    } else if (/^- (.+)$/.test(line)) {
      if (olOpen) { result.push('</ol>'); olOpen = false; }
      if (!ulOpen) { result.push('<ul style="padding-left:18px;margin:4px 0">'); ulOpen = true; }
      result.push(line.replace(/^- (.+)$/, '<li style="margin:2px 0">$1</li>'));
    } else if (/^\d+\. (.+)$/.test(line)) {
      if (ulOpen) { result.push('</ul>'); ulOpen = false; }
      if (!olOpen) { result.push('<ol style="padding-left:18px;margin:4px 0">'); olOpen = true; }
      result.push(line.replace(/^\d+\. (.+)$/, '<li style="margin:2px 0">$1</li>'));
    } else {
      closeList();
      result.push(line === '' ? '<br/>' : `<p style="margin:2px 0">${line}</p>`);
    }
  }
  closeList();
  const raw = result.join('');
  return DOMPurify.sanitize(raw, { ADD_TAGS: ['u'], ADD_ATTR: ['style'] });
}
