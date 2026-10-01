import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import RichTextToolbar, { type RichTextToolbarActions, type RichTextToolbarState, type ToolbarApiHandle } from '@/components/feature/RichTextToolbar';
import { FONT_FAMILIES, FONT_SIZES, TEXT_STYLES, htmlToPlainText, transformRangeCase, applyCaseToChar } from '@/lib/richText';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** Minimum editor height in px. */
  minHeight?: number;
  /** Show the word / character counter below the editor. */
  showCount?: boolean;
  /** Show the lightweight autosave indicator next to the counter. */
  showSaveStatus?: boolean;
}

const FLOAT_HIGHLIGHTS = ['#fff2cc', '#f4cccc', '#d9ead3', '#d0e8e8'];
const BLOCK_SELECTOR = 'p,div,h1,h2,h3,h4,h5,h6,li,blockquote';
const DEFAULT_FONT = 'Arial';

interface PaintFormat {
  fontFamily: string;
  color: string;
  backgroundColor: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikeThrough: boolean;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Start typing…',
  minHeight = 240,
  showCount = true,
  showSaveStatus = true,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const savedRange = useRef<Range | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [textStyle, setTextStyle] = useState('normal');
  const [fontFamily, setFontFamily] = useState(DEFAULT_FONT);
  const [fontSize, setFontSize] = useState('14pt');
  const [textColor, setTextColor] = useState('#0d1f2d');
  const [highlightColor, setHighlightColor] = useState('#fff2cc');
  const [listStyle, setListStyle] = useState<string | null>(null);
  const [lineSpacing, setLineSpacing] = useState('1.5');
  const [zoom, setZoom] = useState(100);
  const [spellcheck, setSpellcheck] = useState(true);
  const [autoCapitalise, setAutoCapitalise] = useState(false);
  const [activeCase, setActiveCase] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'editing' | 'saved'>('idle');
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

  const [floatPos, setFloatPos] = useState<{ top: number; left: number } | null>(null);

  const recognitionRef = useRef<any>(null);
  const paintingRef = useRef<PaintFormat | null>(null);
  const toolbarApi = useRef<ToolbarApiHandle | null>(null);
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(true);
  const [painting, setPainting] = useState(false);

  /* ── Sync HTML back to parent ── */
  const syncValue = useCallback(() => {
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  }, [onChange]);

  /* ── Autosave indicator - flips to "Saved" after a quiet period ── */
  const markEditing = useCallback(() => {
    if (!showSaveStatus) return;
    setSaveState('editing');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => setSaveState('saved'), 1200);
  }, [showSaveStatus]);

  useEffect(() => () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); }, []);

  /* ── Selection helpers - snapshot & restore so toolbar clicks don't kill it ── */
  const saveSelection = useCallback(() => {
    const editor = editorRef.current;
    const sel = window.getSelection();
    if (!editor || !sel || sel.rangeCount === 0) return;
    const r = sel.getRangeAt(0);
    if (editor.contains(r.startContainer)) savedRange.current = r.cloneRange();
  }, []);

  const restoreSelection = useCallback(() => {
    const editor = editorRef.current;
    const sel = window.getSelection();
    if (!editor || !sel) return;
    const r = savedRange.current;
    if (r && editor.contains(r.startContainer)) {
      sel.removeAllRanges();
      sel.addRange(r);
      return;
    }
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  }, []);

  const getBlockElement = useCallback((): HTMLElement | null => {
    const editor = editorRef.current;
    const sel = window.getSelection();
    if (!editor || !sel || sel.rangeCount === 0) return null;
    let node: Node | null = sel.getRangeAt(0).startContainer;
    if (node && node.nodeType === Node.TEXT_NODE) node = node.parentElement;
    if (!(node instanceof HTMLElement)) return null;
    let el: HTMLElement | null = node;
    while (el && el.parentElement && el.parentElement !== editor) el = el.parentElement;
    if (!el || el === editor) return null;
    return el;
  }, []);

  const getSelectedBlocks = useCallback((): HTMLElement[] => {
    const editor = editorRef.current;
    const sel = window.getSelection();
    if (!editor || !sel || sel.rangeCount === 0) return [];
    const range = sel.getRangeAt(0);
    const blocks: HTMLElement[] = [];
    editor.querySelectorAll<HTMLElement>(BLOCK_SELECTOR).forEach((el) => {
      try {
        if (range.intersectsNode(el)) blocks.push(el);
      } catch {
        /* ignore detached nodes */
      }
    });
    return blocks;
  }, []);

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

    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      let node: Node | null = sel.getRangeAt(0).startContainer;
      if (node && node.nodeType === Node.TEXT_NODE) node = node.parentElement;
      const el = node instanceof Element ? node : null;

      const ul = el?.closest('ul');
      const ol = el?.closest('ol');
      if (ul) setListStyle(window.getComputedStyle(ul).listStyleType);
      else if (ol) setListStyle(window.getComputedStyle(ol).listStyleType);
      else setListStyle(null);

      const block = getBlockElement();
      if (block) {
        const tag = block.tagName.toLowerCase();
        const def = TEXT_STYLES.find((s) => s.tag === tag);
        setTextStyle(def ? def.key : 'normal');

        const inlineColor = block.style.color;
        if (inlineColor) setTextColor(inlineColor);

        if (block.style.lineHeight) setLineSpacing(block.style.lineHeight);

        const px = parseFloat(window.getComputedStyle(block).fontSize);
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

      const ff = document.queryCommandValue('fontName');
      if (ff) {
        const match = FONT_FAMILIES.find((f) => ff.toLowerCase().includes(f.toLowerCase()));
        if (match) setFontFamily(match);
      }
    }
  }, [getBlockElement]);

  /* ── Generic exec with correct CSS mode per command ── */
  const run = useCallback(
    (cmd: string, val?: string, useCss = true) => {
      const editor = editorRef.current;
      if (!editor) return;
      editor.focus();

      // Undo / redo act on the browser's own history. Touching `styleWithCSS`
      // first can clobber that stack, so these commands skip the preamble.
      if (cmd === 'undo' || cmd === 'redo') {
        document.execCommand(cmd, false);
        saveSelection();
        syncValue();
        markEditing();
        requestAnimationFrame(() => refreshToolbar());
        return;
      }

      restoreSelection();
      document.execCommand('styleWithCSS', false, useCss ? 'true' : 'false');
      document.execCommand(cmd, false, val);
      saveSelection();
      syncValue();
      markEditing();
      requestAnimationFrame(() => refreshToolbar());
    },
    [syncValue, refreshToolbar, restoreSelection, saveSelection, markEditing],
  );

  /* ── Seed an empty paragraph so block commands have something to act on ── */
  const seedIfEmpty = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    if (!editor.textContent?.trim() && editor.children.length === 0) {
      editor.innerHTML = '<p><br></p>';
      const range = document.createRange();
      range.setStart(editor.querySelector('p') as Node, 0);
      range.collapse(true);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, []);

  const applyTextStyle = useCallback((key: string) => {
    const def = TEXT_STYLES.find((s) => s.key === key);
    const editor = editorRef.current;
    if (!def || !editor) return;
    editor.focus();
    restoreSelection();
    seedIfEmpty();

    document.execCommand('styleWithCSS', false, 'false');
    document.execCommand('formatBlock', false, def.tag);

    const block = getBlockElement();
    if (block) {
      block.style.fontSize = def.fontSize;
      block.style.fontWeight = def.fontWeight;
      block.style.color = def.color;
      block.style.fontStyle = def.italic ? 'italic' : 'normal';
      block.style.marginTop = def.marginTop;
      block.style.marginBottom = def.marginBottom;
      block.style.lineHeight = lineSpacing;
    }

    setTextStyle(key);
    syncValue();
    saveSelection();
    markEditing();
    refreshToolbar();
  }, [getBlockElement, refreshToolbar, restoreSelection, saveSelection, seedIfEmpty, syncValue, lineSpacing, markEditing]);

  const handleFontFamily = useCallback((ff: string) => {
    setFontFamily(ff);
    run('fontName', ff);
  }, [run]);

  const handleFontSize = useCallback((fs: string) => {
    setFontSize(fs);
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    restoreSelection();

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
      syncValue();
      saveSelection();
      markEditing();
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
    syncValue();
    saveSelection();
    markEditing();
    refreshToolbar();
  }, [refreshToolbar, restoreSelection, saveSelection, syncValue, markEditing]);

  const stepFontSize = useCallback((dir: 1 | -1) => {
    const idx = FONT_SIZES.findIndex((s) => s.value === fontSize);
    const base = idx === -1 ? FONT_SIZES.findIndex((s) => s.value === '14pt') : idx;
    const next = Math.min(FONT_SIZES.length - 1, Math.max(0, base + dir));
    handleFontSize(FONT_SIZES[next].value);
  }, [fontSize, handleFontSize]);

  const applyColor = useCallback((color: string) => {
    setTextColor(color);
    run('foreColor', color);
  }, [run]);

  const applyHighlight = useCallback((color: string) => {
    setHighlightColor(color);
    run('hiliteColor', color);
  }, [run]);

  const clearFormatting = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    restoreSelection();
    document.execCommand('styleWithCSS', false, 'false');
    document.execCommand('removeFormat');
    document.execCommand('formatBlock', false, 'p');
    const block = getBlockElement();
    if (block) block.removeAttribute('style');
    setTextStyle('normal');
    syncValue();
    saveSelection();
    markEditing();
    refreshToolbar();
  }, [getBlockElement, refreshToolbar, restoreSelection, saveSelection, syncValue, markEditing]);

  const toggleFormat = useCallback((cmd: string) => {
    const structural = new Set([
      'insertUnorderedList', 'insertOrderedList',
      'indent', 'outdent', 'justifyLeft', 'justifyCenter',
      'justifyRight', 'justifyFull', 'removeFormat',
    ]);
    const editor = editorRef.current;
    if (!editor) return;
    const isStructural = structural.has(cmd);
    editor.focus();
    restoreSelection();
    // Structural commands (lists / indent / alignment) need a real block to act on,
    // otherwise they do nothing on an empty field. Seed one first.
    if (isStructural) seedIfEmpty();
    document.execCommand('styleWithCSS', false, isStructural ? 'false' : 'true');
    document.execCommand(cmd, false);
    saveSelection();
    syncValue();
    markEditing();
    requestAnimationFrame(() => refreshToolbar());
  }, [restoreSelection, seedIfEmpty, saveSelection, syncValue, markEditing, refreshToolbar]);

  const applyList = useCallback((type: 'ul' | 'ol', style: string) => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    restoreSelection();
    seedIfEmpty();

    const cmd = type === 'ul' ? 'insertUnorderedList' : 'insertOrderedList';
    run(cmd, undefined, false);

    requestAnimationFrame(() => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      let node: Node | null = sel.getRangeAt(0).startContainer;
      if (node && node.nodeType === Node.TEXT_NODE) node = node.parentElement;
      const el = node instanceof Element ? node : null;
      const list = el?.closest(type);
      if (list) (list as HTMLElement).style.listStyleType = style;
      syncValue();
      saveSelection();
      markEditing();
      refreshToolbar();
    });
  }, [refreshToolbar, restoreSelection, saveSelection, seedIfEmpty, syncValue, run, markEditing]);

  /* ── Line spacing - apply to every block the selection touches ── */
  const applyLineSpacing = useCallback((value: string) => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    restoreSelection();
    seedIfEmpty();

    let blocks = getSelectedBlocks();
    if (blocks.length === 0) {
      const current = getBlockElement();
      if (current) blocks = [current];
    }
    blocks.forEach((b) => { b.style.lineHeight = value; });

    setLineSpacing(value);
    syncValue();
    saveSelection();
    markEditing();
    refreshToolbar();
  }, [getBlockElement, getSelectedBlocks, refreshToolbar, restoreSelection, saveSelection, seedIfEmpty, syncValue, markEditing]);

  /* ── Text case - transform text IN PLACE ──
   * Works in two modes so the button always does something visible:
   *   1. With a selection  → rewrite only the selected text nodes.
   *   2. No selection      → rewrite the whole field ("the relevant text field").
   * Text nodes are rewritten in place, so links, inline formatting
   * (bold / italic / colour) and paragraph / list structure survive, and
   * sentence case spans multiple sentences and paragraphs. */
  const applyTextCase = useCallback((key: string) => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    restoreSelection();

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    let range = sel.getRangeAt(0);
    // If the live selection collapsed (or was lost), fall back to the snapshot.
    if (range.collapsed && savedRange.current && editor.contains(savedRange.current.startContainer)) {
      range = savedRange.current.cloneRange();
    }

    const hadSelection = !range.collapsed;
    // Snapshot the caret so we can put it back exactly where it was afterwards.
    const caret = range.collapsed
      ? { node: range.startContainer, offset: range.startOffset }
      : null;

    const safeTransform = (r: Range): boolean => {
      try {
        return transformRangeCase(r, key);
      } catch {
        return false;
      }
    };

    let changed = false;
    if (hadSelection && editor.contains(range.commonAncestorContainer)) {
      changed = safeTransform(range);
    }
    // No usable selection (or nothing transformed) → apply to the whole field.
    if (!changed) {
      const full = document.createRange();
      full.selectNodeContents(editor);
      changed = safeTransform(full);
    }

    // Persistent mode: choosing the active case again switches it off.
    setActiveCase((cur) => (cur === key ? null : key));

    if (!changed) {
      syncValue();
      return;
    }

    // Keep the caret moving FORWARD - never snap back to the start of the text.
    try {
      const next = document.createRange();
      if (hadSelection) {
        next.setStart(range.startContainer, range.startOffset);
        next.setEnd(range.endContainer, range.endOffset);
      } else if (caret && editor.contains(caret.node)) {
        next.setStart(caret.node, caret.offset);
        next.collapse(true);
      } else {
        next.selectNodeContents(editor);
        next.collapse(false);
      }
      sel.removeAllRanges();
      sel.addRange(next);
    } catch {
      /* selection no longer valid - ignore */
    }

    syncValue();
    saveSelection();
    markEditing();
    refreshToolbar();
  }, [refreshToolbar, restoreSelection, saveSelection, syncValue, markEditing]);

  /* ── Insert a hyperlink (over the selection, or as new text) ── */
  const insertLink = useCallback((url: string, text?: string) => {
    const editor = editorRef.current;
    const clean = (url || '').trim();
    if (!editor || !clean) return;
    const href = /^(https?:|mailto:|tel:|\/|#)/i.test(clean) ? clean : `https://${clean}`;
    editor.focus();
    restoreSelection();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);

    if (range.collapsed) {
      if (!text) return;
      const a = document.createElement('a');
      a.setAttribute('href', href);
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener noreferrer');
      a.textContent = text;
      range.insertNode(a);
      const nr = document.createRange();
      nr.setStartAfter(a);
      nr.collapse(true);
      sel.removeAllRanges();
      sel.addRange(nr);
    } else {
      document.execCommand('styleWithCSS', false, 'false');
      document.execCommand('createLink', false, href);
      editor.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((a) => {
        a.setAttribute('target', '_blank');
        a.setAttribute('rel', 'noopener noreferrer');
      });
    }

    syncValue();
    saveSelection();
    markEditing();
    refreshToolbar();
  }, [refreshToolbar, restoreSelection, saveSelection, syncValue, markEditing]);

  /* ── Insert an image from a URL ── */
  const insertImage = useCallback((url: string, alt?: string) => {
    const editor = editorRef.current;
    const clean = (url || '').trim();
    if (!editor || !clean) return;
    editor.focus();
    restoreSelection();
    seedIfEmpty();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);

    const img = document.createElement('img');
    img.setAttribute('src', clean);
    img.setAttribute('alt', alt || '');
    img.style.maxWidth = '100%';
    range.deleteContents();
    range.insertNode(img);

    const nr = document.createRange();
    nr.setStartAfter(img);
    nr.collapse(true);
    sel.removeAllRanges();
    sel.addRange(nr);

    syncValue();
    saveSelection();
    markEditing();
    refreshToolbar();
  }, [refreshToolbar, restoreSelection, saveSelection, seedIfEmpty, syncValue, markEditing]);

  /* ── Insert an inline note / comment over the selection ── */
  const insertNote = useCallback((text: string) => {
    const editor = editorRef.current;
    const note = (text || '').trim();
    if (!editor || !note) return;
    editor.focus();
    restoreSelection();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);

    const span = document.createElement('span');
    span.setAttribute('title', note);
    span.style.borderBottom = '2px solid #f9ab00';
    span.style.backgroundColor = '#fef7e0';

    if (range.collapsed) {
      span.appendChild(document.createTextNode('\u200B'));
      range.insertNode(span);
      const nr = document.createRange();
      nr.setStart(span.firstChild as Node, 1);
      nr.collapse(true);
      sel.removeAllRanges();
      sel.addRange(nr);
    } else {
      span.appendChild(range.extractContents());
      range.insertNode(span);
      const nr = document.createRange();
      nr.selectNodeContents(span);
      sel.removeAllRanges();
      sel.addRange(nr);
    }

    syncValue();
    saveSelection();
    markEditing();
    refreshToolbar();
  }, [refreshToolbar, restoreSelection, saveSelection, syncValue, markEditing]);

  const toggleSpellcheck = useCallback(() => setSpellcheck((s) => !s), []);

  const toggleAutoCapitalise = useCallback(() => setAutoCapitalise((v) => !v), []);

  const setZoomLevel = useCallback((value: number) => {
    setZoom(Math.min(200, Math.max(50, value)));
  }, []);

  /* ── Print just the document content ── */
  const printDocument = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument;
    if (!doc) {
      document.body.removeChild(iframe);
      return;
    }
    doc.open();
    doc.write(`<!doctype html><html><head><title>Print</title><style>
      body { font-family: ${fontFamily}, sans-serif; padding: 32px; line-height: 1.6; color: #0d1f2d; }
      h1, h2, h3, h4, h5, h6 { color: #0d1f2d; }
      a { color: #0d5959; }
      img { max-width: 100%; }
      ul, ol { padding-left: 24px; }
    </style></head><body>${editor.innerHTML}</body></html>`);
    doc.close();
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => {
      if (iframe.parentNode) document.body.removeChild(iframe);
    }, 1000);
  }, [fontFamily]);

  /* ── Insert plain text at the caret (used by voice dictation) ── */
  const insertPlainText = useCallback((text: string) => {
    const editor = editorRef.current;
    if (!editor || !text) return;
    editor.focus();
    restoreSelection();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    range.deleteContents();
    const node = document.createTextNode(text);
    range.insertNode(node);
    const nr = document.createRange();
    nr.setStartAfter(node);
    nr.collapse(true);
    sel.removeAllRanges();
    sel.addRange(nr);
    saveSelection();
    syncValue();
    markEditing();
    refreshToolbar();
  }, [refreshToolbar, restoreSelection, saveSelection, syncValue, markEditing]);

  /* ── Voice typing (browser Web Speech API) ── */
  const toggleVoice = useCallback(() => {
    const w = window as any;
    const SpeechRecognitionCtor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      setVoiceSupported(false);
      return;
    }
    if (voiceListening) {
      try { recognitionRef.current?.stop?.(); } catch { /* noop */ }
      recognitionRef.current = null;
      setVoiceListening(false);
      return;
    }
    try {
      const rec = new SpeechRecognitionCtor();
      rec.lang = 'en-US';
      rec.continuous = true;
      rec.interimResults = false;
      rec.onresult = (ev: any) => {
        let finalText = '';
        for (let i = ev.resultIndex; i < ev.results.length; i += 1) {
          if (ev.results[i].isFinal) finalText += ev.results[i][0].transcript;
        }
        const clean = finalText.trim();
        if (clean) insertPlainText(`${clean} `);
      };
      rec.onerror = () => setVoiceListening(false);
      rec.onend = () => setVoiceListening(false);
      recognitionRef.current = rec;
      rec.start();
      setVoiceListening(true);
    } catch {
      setVoiceListening(false);
    }
  }, [voiceListening, insertPlainText]);

  useEffect(() => () => { try { recognitionRef.current?.stop?.(); } catch { /* noop */ } }, []);

  /* ── Format painter: snapshot the caret's formatting, apply on next selection ── */
  const startPaintFormat = useCallback(() => {
    const sel = window.getSelection();
    let node: Node | null = sel && sel.rangeCount > 0 ? sel.getRangeAt(0).startContainer : null;
    if (node && node.nodeType === Node.TEXT_NODE) node = node.parentElement;
    if (!(node instanceof HTMLElement)) return;
    const cs = window.getComputedStyle(node);
    paintingRef.current = {
      fontFamily: cs.fontFamily,
      color: cs.color,
      backgroundColor: cs.backgroundColor,
      bold: parseInt(cs.fontWeight, 10) >= 600,
      italic: cs.fontStyle === 'italic',
      underline: cs.textDecorationLine.includes('underline'),
      strikeThrough: cs.textDecorationLine.includes('line-through'),
    };
    setPainting(true);
  }, []);

  const applyPaintFormat = useCallback(() => {
    const fmt = paintingRef.current;
    const editor = editorRef.current;
    if (!fmt || !editor) return;
    editor.focus();
    document.execCommand('styleWithCSS', false, 'true');
    const fam = fmt.fontFamily.split(',')[0].replace(/["']/g, '').trim();
    if (fam) document.execCommand('fontName', false, fam);
    if (fmt.color) document.execCommand('foreColor', false, fmt.color);
    if (fmt.backgroundColor && fmt.backgroundColor !== 'rgba(0, 0, 0, 0)') {
      document.execCommand('hiliteColor', false, fmt.backgroundColor);
    }
    if (fmt.bold !== document.queryCommandState('bold')) document.execCommand('bold');
    if (fmt.italic !== document.queryCommandState('italic')) document.execCommand('italic');
    if (fmt.underline !== document.queryCommandState('underline')) document.execCommand('underline');
    if (fmt.strikeThrough !== document.queryCommandState('strikeThrough')) document.execCommand('strikeThrough');
    paintingRef.current = null;
    setPainting(false);
    saveSelection();
    syncValue();
    markEditing();
    refreshToolbar();
  }, [refreshToolbar, saveSelection, syncValue, markEditing]);

  /* ── Keyboard: Ctrl/Cmd+K link, Tab indent in lists, auto bullets/numbers ── */
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const mod = e.ctrlKey || e.metaKey;

    if (mod && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      toolbarApi.current?.openPopover('link');
      return;
    }

    if (e.key === 'Tab') {
      const sel = window.getSelection();
      let node: Node | null = sel && sel.rangeCount > 0 ? sel.getRangeAt(0).startContainer : null;
      if (node && node.nodeType === Node.TEXT_NODE) node = node.parentElement;
      const inList = node instanceof Element && node.closest('ul,ol');
      if (inList) {
        e.preventDefault();
        document.execCommand('styleWithCSS', false, 'false');
        document.execCommand(e.shiftKey ? 'outdent' : 'indent', false);
        saveSelection();
        syncValue();
        markEditing();
        requestAnimationFrame(() => refreshToolbar());
      }
      return;
    }

    if (e.key === ' ') {
      const editor = editorRef.current;
      const sel = window.getSelection();
      if (!editor || !sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      if (!range.collapsed) return;
      let node: Node | null = range.startContainer;
      if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
      if (!(node instanceof HTMLElement) || !editor.contains(node)) return;
      const block = node.closest('p,div,h1,h2,h3,h4,h5,h6,blockquote') as HTMLElement | null;
      if (!block || block.closest('ul,ol')) return;

      const pre = document.createRange();
      pre.setStart(block, 0);
      pre.setEnd(range.startContainer, range.startOffset);
      const trimmed = pre.toString().trim();
      const isBullet = /^[-*]$/.test(trimmed);
      const isNumber = /^\d+\.$/.test(trimmed);
      if (!isBullet && !isNumber) return;

      e.preventDefault();
      const del = document.createRange();
      del.setStart(block, 0);
      del.setEnd(range.startContainer, range.startOffset);
      del.deleteContents();
      const caret = document.createRange();
      caret.setStart(block, 0);
      caret.collapse(true);
      sel.removeAllRanges();
      sel.addRange(caret);
      document.execCommand('styleWithCSS', false, 'false');
      document.execCommand(isBullet ? 'insertUnorderedList' : 'insertOrderedList', false);
      saveSelection();
      syncValue();
      markEditing();
      requestAnimationFrame(() => refreshToolbar());
    }

    // Persistent case mode - keep typing in the chosen case until it's switched off.
    if (activeCase && !mod && !e.altKey && e.key.length === 1) {
      const editor = editorRef.current;
      const sel = window.getSelection();
      if (editor && sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        if (range.collapsed && editor.contains(range.startContainer)) {
          let node: Node | null = range.startContainer;
          if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
          const blockEl = node instanceof HTMLElement
            ? (node.closest(BLOCK_SELECTOR) as HTMLElement | null)
            : null;
          let preText = '';
          try {
            const pre = document.createRange();
            pre.setStart(blockEl || editor, 0);
            pre.setEnd(range.startContainer, range.startOffset);
            preText = pre.toString();
          } catch {
            preText = '';
          }
          const typed = applyCaseToChar(e.key, preText, activeCase);
          if (typed !== e.key) {
            e.preventDefault();
            document.execCommand('insertText', false, typed);
            saveSelection();
            syncValue();
            markEditing();
            requestAnimationFrame(() => refreshToolbar());
            return;
          }
        }
      }
    }

    // Auto-capitalise: upper-case the first letter of each new sentence as it is typed.
    if (autoCapitalise && !mod && !e.altKey && e.key.length === 1 && /[a-z]/.test(e.key)) {
      const editor = editorRef.current;
      const sel = window.getSelection();
      if (editor && sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        if (range.collapsed && editor.contains(range.startContainer)) {
          let node: Node | null = range.startContainer;
          if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
          const blockEl = node instanceof HTMLElement
            ? (node.closest(BLOCK_SELECTOR) as HTMLElement | null)
            : null;
          let preText = '';
          try {
            const pre = document.createRange();
            pre.setStart(blockEl || editor, 0);
            pre.setEnd(range.startContainer, range.startOffset);
            preText = pre.toString();
          } catch {
            preText = '';
          }
          const trimmed = preText.replace(/[\s\u200B]+$/, '');
          const atSentenceStart = trimmed.length === 0 || /[.!?]$/.test(trimmed);
          if (atSentenceStart) {
            e.preventDefault();
            document.execCommand('insertText', false, e.key.toUpperCase());
            saveSelection();
            syncValue();
            markEditing();
            requestAnimationFrame(() => refreshToolbar());
            return;
          }
        }
      }
    }
  }, [refreshToolbar, saveSelection, syncValue, markEditing, autoCapitalise, activeCase]);

  const handleInteraction = useCallback(() => {
    saveSelection();
    refreshToolbar();
    syncValue();
    markEditing();
  }, [refreshToolbar, saveSelection, syncValue, markEditing]);

  const handleMouseUp = useCallback(() => {
    handleInteraction();
    const sel = window.getSelection();
    if (paintingRef.current && sel && !sel.isCollapsed) applyPaintFormat();
  }, [handleInteraction, applyPaintFormat]);

  const onPreserve = useCallback((e: React.MouseEvent) => e.preventDefault(), []);

  /* ── Floating toolbar: show above a non-collapsed selection ── */
  const updateFloating = useCallback(() => {
    const editor = editorRef.current;
    const sel = window.getSelection();
    if (!editor || !sel || sel.rangeCount === 0 || sel.isCollapsed) {
      setFloatPos(null);
      return;
    }
    const range = sel.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) {
      setFloatPos(null);
      return;
    }
    const rect = range.getBoundingClientRect();
    if (!rect || (rect.width === 0 && rect.height === 0)) {
      setFloatPos(null);
      return;
    }
    setFloatPos({ top: rect.top, left: rect.left + rect.width / 2 });
  }, []);

  useEffect(() => {
    const onSelectionChange = () => {
      saveSelection();
      updateFloating();
    };
    document.addEventListener('selectionchange', onSelectionChange);
    const hide = () => setFloatPos(null);
    window.addEventListener('scroll', hide, true);
    return () => {
      document.removeEventListener('selectionchange', onSelectionChange);
      window.removeEventListener('scroll', hide, true);
    };
  }, [saveSelection, updateFloating]);

  /* ── Placeholder illusion + initial / async value sync ── */
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    document.execCommand('defaultParagraphSeparator', false, 'p');
    const check = () => {
      const text = el.textContent?.trim() || '';
      if (!text && !el.querySelector('img,hr,table')) el.setAttribute('data-empty', 'true');
      else el.removeAttribute('data-empty');
    };
    check();
    const obs = new MutationObserver(check);
    obs.observe(el, { childList: true, subtree: true, characterData: true });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (document.activeElement === el) return;
    const next = value || '';
    if (el.innerHTML === next) return;
    el.innerHTML = next;
  }, [value]);

  const toolbarState: RichTextToolbarState = {
    textStyle, fontFamily, fontSize, textColor, highlightColor, listStyle,
    lineSpacing, zoom, spellcheck, autoCapitalise, painting, voiceListening, voiceSupported, activeFormats,
    activeCase,
  };
  const toolbarActions: RichTextToolbarActions = {
    applyTextStyle, handleFontFamily, handleFontSize, stepFontSize,
    applyColor, applyHighlight, applyList, toggleFormat, clearFormatting,
    applyLineSpacing, applyTextCase, insertLink, insertImage, insertNote,
    toggleSpellcheck, toggleAutoCapitalise, setZoom: setZoomLevel, startPaintFormat, toggleVoice,
    print: printDocument, run,
  };

  const plain = useMemo(() => htmlToPlainText(value), [value]);
  const wordCount = plain ? plain.split(/\s+/).length : 0;

  const editorStyle = {
    fontFamily: `${fontFamily}, sans-serif`,
    minHeight,
    zoom: `${zoom}%`,
  } as React.CSSProperties;

  return (
    <div>
      <RichTextToolbar state={toolbarState} actions={toolbarActions} onPreserve={onPreserve} apiRef={toolbarApi} />

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        spellCheck={spellcheck}
        onInput={handleInteraction}
        onMouseUp={handleMouseUp}
        onKeyDown={handleKeyDown}
        onKeyUp={handleInteraction}
        onBlur={saveSelection}
        className="rich-text-editor w-full px-4 py-4 border-2 border-[#e8edf2] text-base text-[#0d1f2d] leading-relaxed outline-none focus:border-[#0d5959] focus:ring-4 focus:ring-[#0d5959]/10 transition-all bg-white rounded-md [&_ul]:pl-8 [&_ul]:my-2 [&_ol]:pl-8 [&_ol]:my-2 [&_li]:py-1 [&_li]:pl-2 data-empty:before:content-[attr(data-placeholder)] data-empty:before:text-[#b0bec5] data-empty:before:pointer-events-none"
        style={editorStyle}
        data-placeholder={placeholder}
      />

      {showCount && (
        <div className="flex items-center justify-between mt-2">
          <p className="text-[13px] text-[#7a8a99] leading-relaxed">
            {showSaveStatus && saveState === 'saved' && (
              <span className="inline-flex items-center gap-1 text-[#0d5959]">
                <i className="ri-check-line text-sm" /> Auto-saved
              </span>
            )}
            {showSaveStatus && saveState === 'editing' && (
              <span className="inline-flex items-center gap-1 text-[#b0bec5]">
                <i className="ri-loader-4-line text-sm animate-spin" /> Saving…
              </span>
            )}
          </p>
          <p className="text-[14px] text-[#7a8a99] text-right leading-relaxed tabular-nums">
            {wordCount} {wordCount === 1 ? 'word' : 'words'} · {plain.length} {plain.length === 1 ? 'character' : 'characters'}
          </p>
        </div>
      )}

      {floatPos && (
        <div
          className="fixed z-[80] -translate-x-1/2 -translate-y-full flex items-center gap-0.5 px-1 py-1 bg-[#202124] rounded-lg shadow-xl"
          style={{ top: floatPos.top - 8, left: floatPos.left }}
          onMouseDown={onPreserve}
        >
          <button type="button" onMouseDown={onPreserve} onClick={() => run('bold', undefined, true)} className={`w-7 h-7 flex items-center justify-center rounded-md cursor-pointer text-[13px] transition-colors ${activeFormats.bold ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10'}`} title="Bold">
            <span className="font-bold">B</span>
          </button>
          <button type="button" onMouseDown={onPreserve} onClick={() => run('italic', undefined, true)} className={`w-7 h-7 flex items-center justify-center rounded-md cursor-pointer text-[13px] transition-colors ${activeFormats.italic ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10'}`} title="Italic">
            <span className="italic font-serif">I</span>
          </button>
          <button type="button" onMouseDown={onPreserve} onClick={() => run('underline', undefined, true)} className={`w-7 h-7 flex items-center justify-center rounded-md cursor-pointer text-[13px] transition-colors ${activeFormats.underline ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10'}`} title="Underline">
            <span className="underline">U</span>
          </button>
          <button type="button" onMouseDown={onPreserve} onClick={() => run('strikeThrough', undefined, true)} className={`w-7 h-7 flex items-center justify-center rounded-md cursor-pointer text-[13px] transition-colors ${activeFormats.strikeThrough ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10'}`} title="Strikethrough">
            <span className="line-through">S</span>
          </button>
          <div className="w-px h-4 bg-white/20 mx-0.5" />
          {FLOAT_HIGHLIGHTS.map((c) => (
            <button key={c} type="button" onMouseDown={onPreserve} onClick={() => applyHighlight(c)} className="w-4 h-4 rounded-sm border border-white/30 hover:scale-110 transition-transform cursor-pointer" style={{ backgroundColor: c }} title="Highlight" />
          ))}
          <div className="w-px h-4 bg-white/20 mx-0.5" />
          <button type="button" onMouseDown={onPreserve} onClick={() => run('removeFormat')} className="w-7 h-7 flex items-center justify-center rounded-md cursor-pointer text-white/80 hover:bg-white/10 transition-colors" title="Clear formatting">
            <i className="ri-format-clear text-sm" />
          </button>
        </div>
      )}
    </div>
  );
}