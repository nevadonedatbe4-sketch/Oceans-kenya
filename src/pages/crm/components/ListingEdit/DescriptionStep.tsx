import { useRef, useState, useCallback, useEffect } from 'react';
import { PROPERTY_TYPES, PURPOSE_OPTIONS } from './types';

interface Props {
  title: string;
  setTitle: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  propertyType: string;
  setPropertyType: (v: string) => void;
  purpose: string;
  setPurpose: (v: string) => void;
  isEdit: boolean;
}

/* ── Shared design tokens ── */
const inputBase =
  'w-full text-sm font-medium border-2 border-[#e8edf2] px-3 py-2.5 text-[#0d1f2d] outline-none focus:border-[#0d5959] focus:ring-4 focus:ring-[#0d5959]/10 transition-all bg-white placeholder:text-[#b0bec5] placeholder:font-normal rounded-md';

const selectClass = `${inputBase} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%237a8a99%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_14px_center] bg-[length:20px_20px] pr-11`;

const labelClass = 'block text-[14px] font-bold tracking-wide text-[#0d1f2d] uppercase mb-2.5 leading-none';

const hintClass = 'text-[15px] text-[#4a5568] mt-2 leading-relaxed';

/* ── Section Header ── */
const SectionHeader = ({
  icon,
  title,
  subtitle,
}: {
  icon: string;
  title: string;
  subtitle: string;
}) => (
  <div className="mb-7">
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 flex items-center justify-center shrink-0 bg-[#0d1f2d] rounded-lg">
        <i className={`${icon} text-white text-base`} />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-base font-semibold text-[#0d1f2d] tracking-wide">
          {title}
        </h4>
        <p className="text-[13px] text-[#7a8a99] mt-0.5 leading-relaxed">{subtitle}</p>
      </div>
    </div>
    <div className="h-px bg-[#e5e7eb] mt-4" />
  </div>
);

/* ── Card wrapper ── */
const Card = ({ children }: { children: React.ReactNode }) => (
  <div className="border border-[#e8ecf0] bg-white overflow-hidden rounded-xl">
    <div className="px-6 py-6">{children}</div>
  </div>
);

/* ── Fonts ── */
const FONT_FAMILIES = [
  'Inter',
  'DM Sans',
  'Prata',
  'Playfair Display',
  'Lora',
  'Merriweather',
  'Poppins',
  'Roboto',
  'Source Sans 3',
  'Inconsolata',
];

const FONT_SIZES = [
  { label: '8', value: '8pt' },
  { label: '9', value: '9pt' },
  { label: '10', value: '10pt' },
  { label: '11', value: '11pt' },
  { label: '12', value: '12pt' },
  { label: '14', value: '14pt' },
  { label: '16', value: '16pt' },
  { label: '18', value: '18pt' },
  { label: '20', value: '20pt' },
  { label: '22', value: '22pt' },
  { label: '24', value: '24pt' },
  { label: '26', value: '26pt' },
  { label: '28', value: '28pt' },
  { label: '36', value: '36pt' },
  { label: '48', value: '48pt' },
  { label: '72', value: '72pt' },
];

const descPlaceholder = 'Welcome to this stunning property nestled in the heart of...';

export default function DescriptionStep({
  title, setTitle, description, setDescription,
  propertyType, setPropertyType, purpose, setPurpose,
}: Props) {
  const descRef = useRef<HTMLDivElement>(null);
  const [fontFamily, setFontFamily] = useState('Inter');
  const [fontSize, setFontSize] = useState('14pt');
  const [activeFormats, setActiveFormats] = useState<Record<string, boolean>>({});

  /* ── Sync HTML back to parent ── */
  const syncDescription = useCallback(() => {
    if (descRef.current) setDescription(descRef.current.innerHTML);
  }, [setDescription]);

  /* ── Generic exec with CSS mode ── */
  const exec = useCallback(
    (cmd: string, val?: string) => {
      const editor = descRef.current;
      if (!editor) return;
      editor.focus();
      document.execCommand('styleWithCSS', false, 'true');
      document.execCommand(cmd, false, val);
      syncDescription();
      refreshToolbar();
    },
    [syncDescription],
  );

  /* ── Read active formatting for toolbar highlights ── */
  const refreshToolbar = useCallback(() => {
    setActiveFormats({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
    });

    /* sniff current font family */
    const ff = document.queryCommandValue('fontName');
    if (ff && FONT_FAMILIES.some((f) => ff.toLowerCase().includes(f.toLowerCase()))) {
      const match = FONT_FAMILIES.find((f) => ff.toLowerCase().includes(f.toLowerCase()));
      if (match) setFontFamily(match);
    }

    /* sniff current font size — read the actual computed size at the cursor */
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      let node: Node | null = sel.getRangeAt(0).startContainer;
      if (node && node.nodeType === Node.TEXT_NODE) node = node.parentElement;
      const editor = descRef.current;
      if (node instanceof Element && editor && editor.contains(node)) {
        const px = parseFloat(window.getComputedStyle(node).fontSize);
        if (!Number.isNaN(px)) {
          /* convert px → pt (1pt = 1.333px) and snap to the nearest option */
          const pt = px / (96 / 72);
          const nearest = FONT_SIZES.reduce((prev, curr) => {
            const c = parseFloat(curr.value);
            const p = parseFloat(prev.value);
            return Math.abs(c - pt) < Math.abs(p - pt) ? curr : prev;
          });
          setFontSize(nearest.value);
        }
      }
    }
  }, []);

  /* ── Apply font family ── */
  const handleFontFamily = (ff: string) => {
    setFontFamily(ff);
    exec('fontName', ff);
  };

  /* ── Apply font size by wrapping the selection in a styled span ── */
  const handleFontSize = (fs: string) => {
    setFontSize(fs);
    const editor = descRef.current;
    if (!editor) return;
    editor.focus();

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);

    /* Nothing selected → set size for the next typed characters via a caret span */
    if (range.collapsed) {
      const span = document.createElement('span');
      span.style.fontSize = fs;
      span.appendChild(document.createTextNode('\u200B')); // zero-width space
      range.insertNode(span);
      const newRange = document.createRange();
      newRange.setStart(span.firstChild as Node, 1);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
      syncDescription();
      return;
    }

    /* Wrap the current selection in a span carrying the exact pt size */
    const span = document.createElement('span');
    span.style.fontSize = fs;
    try {
      span.appendChild(range.extractContents());
      range.insertNode(span);
      /* re-select the wrapped content */
      const newRange = document.createRange();
      newRange.selectNodeContents(span);
      sel.removeAllRanges();
      sel.addRange(newRange);
    } catch {
      /* fallback for complex multi-node selections */
      document.execCommand('fontSize', false, '4');
    }
    syncDescription();
    refreshToolbar();
  };

  /* ── Toggle format buttons ── */
  const toggleFormat = (cmd: string) => {
    exec(cmd);
  };

  /* ── Selection / click inside editor → refresh toolbar ── */
  const handleEditorInteraction = () => {
    refreshToolbar();
    syncDescription();
  };

  /* ── Keep placeholder illusion via CSS ── */
  useEffect(() => {
    const el = descRef.current;
    if (!el) return;
    const check = () => {
      const text = el.textContent?.trim() || '';
      if (!text && !el.querySelector('img,hr,table')) {
        el.setAttribute('data-empty', 'true');
      } else {
        el.removeAttribute('data-empty');
      }
    };
    check();
    const obs = new MutationObserver(check);
    obs.observe(el, { childList: true, subtree: true, characterData: true });
    return () => obs.disconnect();
  }, []);

  /* ── Set initial content once on mount, then let the browser manage the DOM ── */
  useEffect(() => {
    const el = descRef.current;
    if (!el || el.hasAttribute('data-initialised')) return;
    el.innerHTML = description;
    el.setAttribute('data-initialised', 'true');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Toolbar button class ── */
  const toolbarBtn = (active: boolean) =>
    `w-9 h-9 flex items-center justify-center rounded-md cursor-pointer text-sm transition-all border ${
      active
        ? 'bg-[#0d5959] text-white border-[#0d5959]'
        : 'bg-transparent text-[#1a1e24] border-transparent hover:bg-white hover:border-[#e8ecf0]'
    }`;

  const toolbarSelect =
    'text-[13px] border border-[#e8ecf0] px-2.5 py-1.5 bg-white cursor-pointer text-[#1a1e24] rounded-md outline-none focus:border-[#0d5959] transition-colors';

  return (
    <div className="w-full space-y-5">
      {/* Property Title */}
      <SectionHeader
        icon="ri-file-text-line"
        title="Property Title"
        subtitle="A compelling headline attracts more buyers"
      />
      <Card>
        <div>
          <label className={labelClass}>
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputBase}
            placeholder="Untitled Draft"
          />
          <p className={hintClass}>Make it descriptive and memorable</p>
        </div>
      </Card>

      {/* Listing Type */}
      <SectionHeader
        icon="ri-folder-line"
        title="Listing Type"
        subtitle="Define the type and purpose of this property"
      />
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={labelClass}>
              Property Type <span className="text-red-500">*</span>
            </label>
            <select
              value={propertyType}
              onChange={(e) => setPropertyType(e.target.value)}
              className={selectClass}
            >
              <option value="">Select type</option>
              {PROPERTY_TYPES.map((t) => (
                <option key={t} value={t.toLowerCase().replace(/\s/g, '_')}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>
              Purpose <span className="text-red-500">*</span>
            </label>
            <select
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className={selectClass}
            >
              {PURPOSE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Description */}
      <SectionHeader
        icon="ri-article-line"
        title="Description"
        subtitle="Tell the story of this property"
      />
      <Card>
        {/* Toolbar */}
        <div className="flex items-center gap-1 mb-4 p-2.5 border border-[#e8ecf0] bg-[#f8f9fa] rounded-lg flex-wrap">
          <button
            onClick={() => toggleFormat('bold')}
            className={toolbarBtn(!!activeFormats.bold)}
            title="Bold (Ctrl+B)"
          >
            <span className="font-bold">B</span>
          </button>
          <button
            onClick={() => toggleFormat('italic')}
            className={toolbarBtn(!!activeFormats.italic)}
            title="Italic (Ctrl+I)"
          >
            <span className="italic">I</span>
          </button>
          <button
            onClick={() => toggleFormat('underline')}
            className={toolbarBtn(!!activeFormats.underline)}
            title="Underline (Ctrl+U)"
          >
            <span className="underline">U</span>
          </button>

          <div className="w-px h-5 mx-1.5 bg-[#e8ecf0]" />

          {/* Font Family */}
          <select
            value={fontFamily}
            onChange={(e) => handleFontFamily(e.target.value)}
            className={toolbarSelect}
          >
            {FONT_FAMILIES.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>

          {/* Font Size */}
          <select
            value={fontSize}
            onChange={(e) => handleFontSize(e.target.value)}
            className={toolbarSelect}
          >
            {FONT_SIZES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        {/* Editable area */}
        <div
          ref={descRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleEditorInteraction}
          onMouseUp={handleEditorInteraction}
          onKeyUp={handleEditorInteraction}
          className="w-full min-h-[220px] px-3 py-2.5 border-2 border-[#e8edf2] text-sm text-[#0d1f2d] outline-none focus:border-[#0d5959] focus:ring-4 focus:ring-[#0d5959]/10 transition-all bg-white rounded-md data-empty:before:content-[attr(data-placeholder)] data-empty:before:text-[#b0bec5] data-empty:before:pointer-events-none"
          style={{ fontFamily: `${fontFamily}, sans-serif` }}
          data-placeholder={descPlaceholder}
        />

        <p className="text-[15px] text-[#4a5568] mt-2 text-right leading-relaxed">
          {description.replace(/<[^>]*>/g, '').length} characters
        </p>
      </Card>
    </div>
  );
}