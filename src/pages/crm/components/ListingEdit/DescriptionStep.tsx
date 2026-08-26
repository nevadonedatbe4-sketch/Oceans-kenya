import { useRef, useState, useCallback, useEffect } from 'react';
import { PROPERTY_TYPES, PURPOSE_OPTIONS, COMMERCIAL_PROPERTY_TYPES, RESIDENTIAL_PROPERTY_TYPES, PROPERTY_TYPE_TO_DB, LISTING_TYPES, DEVELOPMENT_STAGES } from './types';

interface Props {
  title: string;
  setTitle: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  propertyType: string;
  setPropertyType: (v: string) => void;
  propertyCategory: string;
  setPropertyCategory: (v: string) => void;
  purpose: string;
  setPurpose: (v: string) => void;
  isNewDevelopment: boolean;
  setIsNewDevelopment: (v: boolean) => void;
  developmentStage: string;
  setDevelopmentStage: (v: string) => void;
  isEdit: boolean;
  isTitleRequired?: boolean;
  isDescriptionRequired?: boolean;
}

/* ── Shared design tokens ── */
const inputBase =
  'w-full text-sm font-medium border-2 border-[#e8edf2] px-3 py-2.5 text-[#0d1f2d] outline-none focus:border-[#0d5959] focus:ring-4 focus:ring-[#0d5959]/10 transition-all bg-white placeholder:text-[#b0bec5] placeholder:font-normal rounded-md';

const selectClass = `${inputBase} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%237a8a99%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_14px_center] bg-[length:20px_20px] pr-11`;

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
  'Roboto',
  'Inter',
  'DM Sans',
  'Prata',
  'Playfair Display',
  'Lora',
  'Merriweather',
  'Poppins',
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

const BULLET_STYLES = [
  { label: 'Disc', value: 'disc', icon: 'ri-checkbox-blank-circle-fill' },
  { label: 'Circle', value: 'circle', icon: 'ri-checkbox-blank-circle-line' },
  { label: 'Square', value: 'square', icon: 'ri-checkbox-blank-fill' },
];

const NUMBER_STYLES = [
  { label: '1. 2. 3.', value: 'decimal' },
  { label: 'a. b. c.', value: 'lower-alpha' },
  { label: 'A. B. C.', value: 'upper-alpha' },
  { label: 'i. ii. iii.', value: 'lower-roman' },
  { label: 'I. II. III.', value: 'upper-roman' },
];

const descPlaceholder = 'Welcome to this stunning property nestled in the heart of...';

export default function DescriptionStep({
  title, setTitle, description, setDescription,
  propertyType, setPropertyType, propertyCategory, setPropertyCategory,
  purpose, setPurpose, isNewDevelopment, setIsNewDevelopment, developmentStage, setDevelopmentStage,
  isTitleRequired, isDescriptionRequired,
}: Props) {
  const descRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [fontFamily, setFontFamily] = useState('Roboto');
  const [fontSize, setFontSize] = useState('14pt');
  const [activeFormats, setActiveFormats] = useState<Record<string, boolean>>({
    bold: false,
    italic: false,
    underline: false,
    strikeThrough: false,
    insertUnorderedList: false,
    insertOrderedList: false,
    justifyLeft: false,
    justifyCenter: false,
    justifyRight: false,
    justifyFull: false,
    subscript: false,
    superscript: false,
  });
  const [listStyle, setListStyle] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(false);
  const [showBulletDropdown, setShowBulletDropdown] = useState(false);
  const [showNumberDropdown, setShowNumberDropdown] = useState(false);

  /* ── Close popups on outside click ── */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const t = toolbarRef.current;
      if (!t || !(e.target instanceof Node) || t.contains(e.target)) return;
      setShowBulletDropdown(false);
      setShowNumberDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* ── Sync HTML back to parent ── */
  const syncDescription = useCallback(() => {
    if (descRef.current) setDescription(descRef.current.innerHTML);
  }, [setDescription]);

  /* ── Read active formatting for toolbar highlights ── */
  const refreshToolbar = useCallback(() => {
    setActiveFormats({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      strikeThrough: document.queryCommandState('strikeThrough'),
      insertUnorderedList: document.queryCommandState('insertUnorderedList'),
      insertOrderedList: document.queryCommandState('insertOrderedList'),
      justifyLeft: document.queryCommandState('justifyLeft'),
      justifyCenter: document.queryCommandState('justifyCenter'),
      justifyRight: document.queryCommandState('justifyRight'),
      justifyFull: document.queryCommandState('justifyFull'),
      subscript: document.queryCommandState('subscript'),
      superscript: document.queryCommandState('superscript'),
    });

    /* sniff current list style */
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      let node: Node | null = sel.getRangeAt(0).startContainer;
      if (node && node.nodeType === Node.TEXT_NODE) node = node.parentElement;
      const el = node instanceof Element ? node : null;
      const ul = el?.closest('ul');
      const ol = el?.closest('ol');
      if (ul) {
        setListStyle(window.getComputedStyle(ul).listStyleType);
      } else if (ol) {
        setListStyle(window.getComputedStyle(ol).listStyleType);
      } else {
        setListStyle(null);
      }

      /* sniff current font family */
      const ff = document.queryCommandValue('fontName');
      if (ff && FONT_FAMILIES.some((f) => ff.toLowerCase().includes(f.toLowerCase()))) {
        const match = FONT_FAMILIES.find((f) => ff.toLowerCase().includes(f.toLowerCase()));
        if (match) setFontFamily(match);
      }

      /* sniff current font size */
      const editor = descRef.current;
      let sizeNode: Node | null = sel.getRangeAt(0).startContainer;
      if (sizeNode && sizeNode.nodeType === Node.TEXT_NODE) sizeNode = sizeNode.parentElement;
      if (sizeNode instanceof Element && editor && editor.contains(sizeNode)) {
        const px = parseFloat(window.getComputedStyle(sizeNode).fontSize);
        if (!Number.isNaN(px)) {
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

  /* ── Generic exec with correct CSS mode per command ── */
  const exec = useCallback(
    (cmd: string, val?: string) => {
      const editor = descRef.current;
      if (!editor) return;
      editor.focus();

      // Ensure a valid selection exists inside the editor — execCommand
      // fails silently if focus was lost to a toolbar click
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || !editor.contains(sel.anchorNode)) {
        const range = document.createRange();
        range.selectNodeContents(editor);
        range.collapse(true);
        sel?.removeAllRanges();
        sel?.addRange(range);
      }

      const structuralCmds = new Set([
        'insertUnorderedList', 'insertOrderedList',
        'indent', 'outdent', 'justifyLeft', 'justifyCenter',
        'justifyRight', 'justifyFull', 'removeFormat',
      ]);
      document.execCommand('styleWithCSS', false, structuralCmds.has(cmd) ? 'false' : 'true');
      document.execCommand(cmd, false, val);
      syncDescription();
      requestAnimationFrame(() => refreshToolbar());
    },
    [syncDescription, refreshToolbar],
  );

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

    if (range.collapsed) {
      const span = document.createElement('span');
      span.style.fontSize = fs;
      span.appendChild(document.createTextNode('\u200B'));
      range.insertNode(span);
      const newRange = document.createRange();
      newRange.setStart(span.firstChild as Node, 1);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
      syncDescription();
      return;
    }

    const span = document.createElement('span');
    span.style.fontSize = fs;
    try {
      span.appendChild(range.extractContents());
      range.insertNode(span);
      const newRange = document.createRange();
      newRange.selectNodeContents(span);
      sel.removeAllRanges();
      sel.addRange(newRange);
    } catch {
      document.execCommand('fontSize', false, '4');
    }
    syncDescription();
    refreshToolbar();
  };

  /* ── Toggle format buttons ── */
  const toggleFormat = (cmd: string) => {
    exec(cmd);
  };

  /* ── Apply bullet / number list with specific style ── */
  const applyList = (type: 'ul' | 'ol', style: string) => {
    const editor = descRef.current;
    if (!editor) return;

    // If editor is completely empty, seed a paragraph so the list
    // command has something to wrap
    if (!editor.textContent?.trim() && editor.children.length === 0) {
      editor.innerHTML = '<p><br></p>';
      const range = document.createRange();
      range.setStart(editor.querySelector('p') as Node, 0);
      range.collapse(true);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }

    const cmd = type === 'ul' ? 'insertUnorderedList' : 'insertOrderedList';
    exec(cmd);

    requestAnimationFrame(() => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      let node: Node | null = sel.getRangeAt(0).startContainer;
      if (node && node.nodeType === Node.TEXT_NODE) node = node.parentElement;
      const el = node instanceof Element ? node : null;
      const list = el?.closest(type);
      if (list) {
        (list as HTMLElement).style.listStyleType = style;
      }
      syncDescription();
      refreshToolbar();
    });
    setShowBulletDropdown(false);
    setShowNumberDropdown(false);
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

    // Ensure default paragraph separator is 'p' so list commands
    // create valid block structure instead of inline spans
    document.execCommand('defaultParagraphSeparator', false, 'p');

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

  /* ── Set initial content once on mount ── */
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

  /* ── Derive the selectable property types based on category ── */
  const filteredPropertyTypes = propertyCategory === 'commercial'
    ? COMMERCIAL_PROPERTY_TYPES
    : propertyCategory === 'residential'
    ? RESIDENTIAL_PROPERTY_TYPES
    : propertyCategory === 'land' || propertyCategory === 'joint_venture'
    ? ['Land', 'Farms / Land']
    : PROPERTY_TYPES;

  const handleCategoryChange = (cat: string) => {
    setPropertyCategory(cat);
    setPropertyType('');
  };

  return (
    <div className="w-full space-y-5" ref={toolbarRef}>
      {/* ─── FULL-WIDTH PROPERTY CATEGORY ─── */}
      <SectionHeader
        icon="ri-building-4-line"
        title="Property Category"
        subtitle="Classify what this property IS — this determines which page it appears on"
      />
      <Card>
        <div>
          <label className={labelClass}>
            Category <span className="text-red-500">*</span>
          </label>
          <select
            value={propertyCategory}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className={selectClass}
          >
            <option value="">Select property category</option>
            <option value="residential">Residential — Houses, apartments, bungalows, villas, townhouses, flats</option>
            <option value="commercial">Commercial — Offices, retail, industrial, hospitality, warehouses</option>
            <option value="land">Land — Plots, acreage, farms &amp; development land</option>
            <option value="joint_venture">Joint Venture — Land &amp; development opportunities</option>
          </select>
          <p className={hintClass}>
            {propertyCategory === 'commercial'
              ? 'Showing commercial property sub-types below'
              : propertyCategory === 'residential'
              ? 'Showing residential property sub-types below'
              : propertyCategory === 'land' || propertyCategory === 'joint_venture'
              ? 'Showing land sub-types below'
              : 'Select a category to unlock relevant property types in the next section'}
          </p>
        </div>
      </Card>

      {/* ─── Property Title ─── */}
      <SectionHeader
        icon="ri-file-text-line"
        title="Property Title"
        subtitle="A compelling headline attracts more buyers"
      />
      <Card>
        <div>
          <label className={labelClass}>
            Title {isTitleRequired !== false && <span className="text-red-500">*</span>}
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

      {/* ─── Listing Type ─── */}
      <SectionHeader
        icon="ri-folder-line"
        title="Listing Type"
        subtitle={`Define the type and purpose of this ${propertyCategory ? propertyCategory : ''} property`}
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
              disabled={!propertyCategory}
            >
              <option value="">{propertyCategory ? 'Select type' : 'Select category first'}</option>
              {filteredPropertyTypes.map((t) => (
                <option key={t} value={PROPERTY_TYPE_TO_DB[t] || t.toLowerCase().replace(/[\s/]+/g, '_')}>{t}</option>
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
          <div>
            <label className={labelClass}>Listing Type</label>
            <select
              value={isNewDevelopment ? 'new_development' : 'standard'}
              onChange={(e) => setIsNewDevelopment(e.target.value === 'new_development')}
              className={selectClass}
            >
              {LISTING_TYPES.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <p className={hintClass}>Classify whether this is a standard resale listing or a new development / project</p>
          </div>
          {isNewDevelopment && (
            <div>
              <label className={labelClass}>Development Stage</label>
              <select
                value={developmentStage}
                onChange={(e) => setDevelopmentStage(e.target.value)}
                className={selectClass}
              >
                {DEVELOPMENT_STAGES.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <p className={hintClass}>Shown alongside NEW DEVELOPMENT as a secondary label</p>
            </div>
          )}
        </div>
      </Card>

      {/* ─── Description ─── */}
      <SectionHeader
        icon="ri-article-line"
        title="Description"
        subtitle="Tell the story of this property"
      />
      <Card>
        {/* Toolbar */}
        <div className="mb-4 p-2.5 border border-[#e8ecf0] bg-[#f8f9fa] rounded-lg select-none">
          {/* Primary row — always visible */}
          <div className="flex items-center gap-0.5 flex-wrap">
            {/* Undo / Redo */}
            <button onClick={() => exec('undo')} className={toolbarBtn(false)} title="Undo (Ctrl+Z)">
              <i className="ri-arrow-go-back-line text-sm" />
            </button>
            <button onClick={() => exec('redo')} className={toolbarBtn(false)} title="Redo (Ctrl+Y)">
              <i className="ri-arrow-go-forward-line text-sm" />
            </button>

            <div className="w-px h-5 mx-1 bg-[#e8ecf0]" />

            {/* Bold / Italic / Underline / Strikethrough */}
            <button onClick={() => toggleFormat('bold')} className={toolbarBtn(!!activeFormats.bold)} title="Bold (Ctrl+B)">
              <span className="font-bold">B</span>
            </button>
            <button onClick={() => toggleFormat('italic')} className={toolbarBtn(!!activeFormats.italic)} title="Italic (Ctrl+I)">
              <span className="italic">I</span>
            </button>
            <button onClick={() => toggleFormat('underline')} className={toolbarBtn(!!activeFormats.underline)} title="Underline (Ctrl+U)">
              <span className="underline">U</span>
            </button>
            <button onClick={() => toggleFormat('strikeThrough')} className={toolbarBtn(!!activeFormats.strikeThrough)} title="Strikethrough">
              <span className="line-through">S</span>
            </button>

            <div className="w-px h-5 mx-1 bg-[#e8ecf0]" />

            {/* Subscript */}
            <button onClick={() => toggleFormat('subscript')} className={toolbarBtn(!!activeFormats.subscript)} title="Subscript">
              <span className="text-[11px]">A₂</span>
            </button>

            <div className="w-px h-5 mx-1 bg-[#e8ecf0]" />

            {/* Bullet List with dropdown */}
            <div className="relative flex items-center">
              <button
                onClick={() => toggleFormat('insertUnorderedList')}
                className={toolbarBtn(!!activeFormats.insertUnorderedList)}
                title="Bullet List"
              >
                <i className="ri-list-unordered text-base" />
              </button>
              <button
                onClick={() => { setShowBulletDropdown((v) => !v); setShowNumberDropdown(false); }}
                className="w-5 h-9 flex items-center justify-center rounded-r-md cursor-pointer text-[10px] text-[#4a5568] hover:bg-white transition-colors -ml-1"
                title="Bullet styles"
              >
                <i className="ri-arrow-down-s-line" />
              </button>
              {showBulletDropdown && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-[#e8ecf0] rounded-lg shadow-lg p-1.5 z-50 min-w-[140px]">
                  {BULLET_STYLES.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => applyList('ul', s.value)}
                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[13px] cursor-pointer transition-colors ${
                        listStyle === s.value ? 'bg-[#0d5959]/10 text-[#0d5959]' : 'hover:bg-[#f8f9fa] text-[#1a1e24]'
                      }`}
                    >
                      <i className={`${s.icon} text-sm`} />
                      <span>{s.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Numbered List with dropdown */}
            <div className="relative flex items-center ml-0.5">
              <button
                onClick={() => toggleFormat('insertOrderedList')}
                className={toolbarBtn(!!activeFormats.insertOrderedList)}
                title="Numbered List"
              >
                <i className="ri-list-ordered-2 text-base" />
              </button>
              <button
                onClick={() => { setShowNumberDropdown((v) => !v); setShowBulletDropdown(false); }}
                className="w-5 h-9 flex items-center justify-center rounded-r-md cursor-pointer text-[10px] text-[#4a5568] hover:bg-white transition-colors -ml-1"
                title="Number styles"
              >
                <i className="ri-arrow-down-s-line" />
              </button>
              {showNumberDropdown && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-[#e8ecf0] rounded-lg shadow-lg p-1.5 z-50 min-w-[160px]">
                  {NUMBER_STYLES.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => applyList('ol', s.value)}
                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[13px] cursor-pointer transition-colors ${
                        listStyle === s.value ? 'bg-[#0d5959]/10 text-[#0d5959]' : 'hover:bg-[#f8f9fa] text-[#1a1e24]'
                      }`}
                    >
                      <span className="text-xs w-5 text-center">{s.label.split(' ')[0]}</span>
                      <span>{s.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Indent / Outdent */}
            <button onClick={() => exec('indent')} className={toolbarBtn(false)} title="Increase Indent">
              <i className="ri-indent-increase text-sm" />
            </button>
            <button onClick={() => exec('outdent')} className={toolbarBtn(false)} title="Decrease Indent">
              <i className="ri-indent-decrease text-sm" />
            </button>

            <div className="w-px h-5 mx-1 bg-[#e8ecf0]" />

            {/* Alignment */}
            <button onClick={() => toggleFormat('justifyLeft')} className={toolbarBtn(!!activeFormats.justifyLeft)} title="Align Left">
              <i className="ri-align-left text-base" />
            </button>
            <button onClick={() => toggleFormat('justifyCenter')} className={toolbarBtn(!!activeFormats.justifyCenter)} title="Align Center">
              <i className="ri-align-center text-base" />
            </button>
            <button onClick={() => toggleFormat('justifyRight')} className={toolbarBtn(!!activeFormats.justifyRight)} title="Align Right">
              <i className="ri-align-right text-base" />
            </button>
            <button onClick={() => toggleFormat('justifyFull')} className={toolbarBtn(!!activeFormats.justifyFull)} title="Justify">
              <i className="ri-align-justify text-base" />
            </button>

            <div className="flex-1" />

            {/* Fold toggle */}
            <button
              onClick={() => setShowMore((v) => !v)}
              className="text-xs font-medium text-[#4a5568] hover:text-[#0d5959] px-2 py-1 rounded-md hover:bg-white transition-colors flex items-center gap-1 whitespace-nowrap"
              title="More formatting"
            >
              <span>{showMore ? 'Less' : 'More'}</span>
              <i className={`${showMore ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'} text-sm`} />
            </button>
          </div>

          {/* Secondary row — collapsible */}
          {showMore && (
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[#e8ecf0] flex-wrap">
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
          )}
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