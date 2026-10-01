import { useEffect, useRef, useState } from 'react';
import {
  TEXT_STYLES, FONT_FAMILIES, FONT_SIZES, TEXT_COLORS, HIGHLIGHT_COLORS,
  BULLET_STYLES, NUMBER_STYLES, LINE_SPACINGS, TEXT_CASES,
} from '@/lib/richText';

export interface RichTextToolbarState {
  textStyle: string;
  fontFamily: string;
  fontSize: string;
  textColor: string;
  highlightColor: string;
  listStyle: string | null;
  lineSpacing: string;
  zoom: number;
  spellcheck: boolean;
  autoCapitalise: boolean;
  painting: boolean;
  voiceListening: boolean;
  voiceSupported: boolean;
  activeFormats: Record<string, boolean>;
  /** Currently active persistent text-case mode (null = off). */
  activeCase: string | null;
}

export interface RichTextToolbarActions {
  applyTextStyle: (key: string) => void;
  handleFontFamily: (font: string) => void;
  handleFontSize: (size: string) => void;
  stepFontSize: (dir: 1 | -1) => void;
  applyColor: (color: string) => void;
  applyHighlight: (color: string) => void;
  applyList: (type: 'ul' | 'ol', style: string) => void;
  toggleFormat: (cmd: string) => void;
  clearFormatting: () => void;
  applyLineSpacing: (value: string) => void;
  applyTextCase: (key: string) => void;
  insertLink: (url: string, text?: string) => void;
  insertImage: (url: string, alt?: string) => void;
  insertNote: (text: string) => void;
  toggleSpellcheck: () => void;
  toggleAutoCapitalise: () => void;
  setZoom: (value: number) => void;
  startPaintFormat: () => void;
  toggleVoice: () => void;
  print: () => void;
  run: (cmd: string, val?: string, useCss?: boolean) => void;
}

/** Imperative handle so the editor can open a popover (e.g. Ctrl/Cmd + K → link). */
export interface ToolbarApiHandle {
  openPopover: (key: string | null) => void;
}

interface Props {
  state: RichTextToolbarState;
  actions: RichTextToolbarActions;
  /** Keeps the editor's text selection alive while clicking buttons. */
  onPreserve: (e: React.MouseEvent) => void;
  apiRef?: { current: ToolbarApiHandle | null };
}

const Divider = () => <div className="w-px h-6 bg-[#dadce0] mx-1 shrink-0" />;

const popoverBase =
  'absolute top-full mt-1 z-50 bg-white border border-[#e5e7eb] rounded-lg shadow-lg p-2';

export default function RichTextToolbar({ state, actions, onPreserve, apiRef }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');

  const {
    textStyle, fontFamily, fontSize, textColor, highlightColor, listStyle, lineSpacing,
    zoom, spellcheck, autoCapitalise, painting, voiceListening, voiceSupported, activeFormats,
    activeCase,
  } = state;

  const caseOptionCls = (active: boolean) =>
    active
      ? 'w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md text-[13px] cursor-pointer transition-colors bg-black text-white'
      : 'w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md text-[13px] cursor-pointer transition-colors text-[#3c4043] hover:bg-[#f4f6f6]';

  const toggle = (key: string) => setOpen((cur) => (cur === key ? null : key));
  const closeAll = () => setOpen(null);

  /* Expose imperative open() so the editor's Ctrl/Cmd+K can pop the link panel. */
  useEffect(() => {
    if (!apiRef) return;
    apiRef.current = { openPopover: (key: string | null) => setOpen(key) };
    return () => { apiRef.current = null; };
  }, [apiRef]);

  /* Close any open popup when clicking outside the toolbar. */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const root = rootRef.current;
      if (!root || !(e.target instanceof Node) || root.contains(e.target)) return;
      closeAll();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const tbBtn = (active = false) =>
    `w-8 h-8 flex items-center justify-center rounded-md cursor-pointer text-[15px] leading-none transition-colors ${
      active ? 'bg-black text-white' : 'text-[#3c4043] hover:bg-[#eef1f1]'
    }`;

  const tbSelect =
    'h-8 text-[13px] bg-transparent border border-transparent hover:border-[#dadce0] rounded-md px-2 cursor-pointer text-[#3c4043] outline-none focus:border-black transition-colors';

  const popBtn =
    'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[13px] cursor-pointer transition-colors text-[#3c4043] hover:bg-[#f4f6f6]';

  const fieldInput =
    'w-full h-8 px-2.5 text-[13px] text-[#3c4043] border border-[#dadce0] rounded-md outline-none focus:border-black';

  const groupLabel = 'px-1 pb-1 text-[11px] font-semibold uppercase tracking-wide text-[#8a949c]';

  const currentSizeLabel = FONT_SIZES.find((s) => s.value === fontSize)?.label ?? '14';

  return (
    <div ref={rootRef} className="mb-3 flex items-center gap-0.5 flex-wrap p-1.5 bg-[#f9fafb] border border-[#e5e7eb] rounded-lg select-none">
      {/* Undo / Redo */}
      <button type="button" onMouseDown={onPreserve} onClick={() => actions.run('undo', undefined, false)} className={tbBtn()} title="Undo (Ctrl+Z)">
        <i className="ri-arrow-go-back-line text-base" />
      </button>
      <button type="button" onMouseDown={onPreserve} onClick={() => actions.run('redo', undefined, false)} className={tbBtn()} title="Redo (Ctrl+Y)">
        <i className="ri-arrow-go-forward-line text-base" />
      </button>

      <Divider />

      {/* Paragraph style */}
      <select
        value={textStyle}
        onChange={(e) => actions.applyTextStyle(e.target.value)}
        className={`${tbSelect} w-[112px]`}
        title="Paragraph style"
      >
        {TEXT_STYLES.map((s) => (
          <option key={s.key} value={s.key}>{s.label}</option>
        ))}
      </select>

      {/* Font family */}
      <select
        value={fontFamily}
        onChange={(e) => actions.handleFontFamily(e.target.value)}
        className={`${tbSelect} w-[112px]`}
        title="Font"
      >
        {FONT_FAMILIES.map((f) => (
          <option key={f} value={f}>{f}</option>
        ))}
      </select>

      {/* Font size stepper */}
      <div className="relative flex items-center">
        <button type="button" onMouseDown={onPreserve} onClick={() => actions.stepFontSize(-1)} className={tbBtn()} title="Decrease font size">
          <i className="ri-subtract-line text-base" />
        </button>
        <button
          type="button"
          onMouseDown={onPreserve}
          onClick={() => toggle('size')}
          className="h-8 min-w-[40px] px-1.5 text-[13px] text-[#3c4043] rounded-md hover:bg-[#eef1f1] cursor-pointer tabular-nums"
          title="Font size"
        >
          {currentSizeLabel}
        </button>
        <button type="button" onMouseDown={onPreserve} onClick={() => actions.stepFontSize(1)} className={tbBtn()} title="Increase font size">
          <i className="ri-add-line text-base" />
        </button>
        {open === 'size' && (
          <div className={`${popoverBase} left-1/2 -translate-x-1/2 max-h-[240px] overflow-y-auto w-[72px]`}>
            {FONT_SIZES.map((s) => (
              <button
                key={s.value}
                type="button"
                onMouseDown={onPreserve}
                onClick={() => actions.handleFontSize(s.value)}
                className={`w-full text-left px-3 py-1.5 rounded-md text-[13px] cursor-pointer transition-colors ${
                  fontSize === s.value ? 'bg-black text-white' : 'hover:bg-[#f4f6f6] text-[#3c4043]'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <Divider />

      {/* Inline formats */}
      <button type="button" onMouseDown={onPreserve} onClick={() => actions.toggleFormat('bold')} className={tbBtn(!!activeFormats.bold)} title="Bold (Ctrl+B)">
        <span className="font-bold">B</span>
      </button>
      <button type="button" onMouseDown={onPreserve} onClick={() => actions.toggleFormat('italic')} className={tbBtn(!!activeFormats.italic)} title="Italic (Ctrl+I)">
        <span className="italic font-serif">I</span>
      </button>
      <button type="button" onMouseDown={onPreserve} onClick={() => actions.toggleFormat('underline')} className={tbBtn(!!activeFormats.underline)} title="Underline (Ctrl+U)">
        <span className="underline">U</span>
      </button>

      <Divider />

      {/* Text colour */}
      <div className="relative">
        <button
          type="button"
          onMouseDown={onPreserve}
          onClick={() => toggle('color')}
          className={`${tbBtn(open === 'color')} flex-col gap-0`}
          title="Text colour"
        >
          <span className="text-[14px] font-semibold leading-none" style={{ color: textColor }}>A</span>
          <span className="w-4 h-[3px] rounded-sm mt-[2px]" style={{ backgroundColor: textColor }} />
        </button>
        {open === 'color' && (
          <div className={`${popoverBase} left-0 grid grid-cols-8 gap-1.5`}>
            {TEXT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onMouseDown={onPreserve}
                onClick={() => actions.applyColor(c)}
                className="w-5 h-5 rounded-full border border-[#dadce0] hover:scale-110 transition-transform cursor-pointer"
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
          </div>
        )}
      </div>

      {/* Highlight */}
      <div className="relative">
        <button
          type="button"
          onMouseDown={onPreserve}
          onClick={() => toggle('highlight')}
          className={`${tbBtn(open === 'highlight')} flex-col gap-0`}
          title="Highlight colour"
        >
          <i className="ri-mark-pen-line text-[15px] leading-none" />
          <span className="w-4 h-[3px] rounded-sm mt-[2px]" style={{ backgroundColor: highlightColor }} />
        </button>
        {open === 'highlight' && (
          <div className={`${popoverBase} left-0`}>
            <div className="grid grid-cols-4 gap-1.5 mb-1.5">
              {HIGHLIGHT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onMouseDown={onPreserve}
                  onClick={() => actions.applyHighlight(c)}
                  className="w-5 h-5 rounded border border-[#dadce0] hover:scale-110 transition-transform cursor-pointer"
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
            <button
              type="button"
              onMouseDown={onPreserve}
              onClick={() => actions.applyHighlight('transparent')}
              className="w-full flex items-center gap-1.5 px-1.5 py-1 rounded-md text-[12px] text-[#3c4043] hover:bg-[#f4f6f6] cursor-pointer"
            >
              <i className="ri-close-line text-sm" />
              <span>No highlight</span>
            </button>
          </div>
        )}
      </div>

      <Divider />

      {/* Link */}
      <div className="relative">
        <button type="button" onMouseDown={onPreserve} onClick={() => toggle('link')} className={tbBtn(open === 'link')} title="Insert link (Ctrl+K)">
          <i className="ri-link text-base" />
        </button>
        {open === 'link' && (
          <div className={`${popoverBase} left-0 w-[240px] space-y-2`}>
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://example.com"
              className={fieldInput}
            />
            <input
              type="text"
              value={linkText}
              onChange={(e) => setLinkText(e.target.value)}
              placeholder="Text to display (optional)"
              className={fieldInput}
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onMouseDown={onPreserve}
                onClick={() => { actions.insertLink(linkUrl, linkText); setLinkUrl(''); setLinkText(''); closeAll(); }}
                className="flex-1 h-8 rounded-md bg-black text-white text-[13px] font-medium cursor-pointer hover:bg-[#202124] transition-colors"
              >
                Apply
              </button>
              <button
                type="button"
                onMouseDown={onPreserve}
                onClick={() => { actions.run('unlink'); closeAll(); }}
                className="h-8 px-3 rounded-md border border-[#dadce0] text-[13px] text-[#3c4043] cursor-pointer hover:bg-[#f4f6f6] transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        )}
      </div>

      <Divider />

      {/* Bullet list */}
      <div className="relative flex items-center">
        <button
          type="button"
          onMouseDown={onPreserve}
          onClick={() => actions.toggleFormat('insertUnorderedList')}
          className={tbBtn(!!activeFormats.insertUnorderedList)}
          title="Bulleted list"
        >
          <i className="ri-list-unordered text-base" />
        </button>
        <button
          type="button"
          onMouseDown={onPreserve}
          onClick={() => toggle('bullets')}
          className="w-4 h-8 flex items-center justify-center rounded-r-md cursor-pointer text-[10px] text-[#5f6368] hover:bg-[#eef1f1] transition-colors -ml-1"
          title="Bullet styles"
        >
          <i className="ri-arrow-down-wide-fill" />
        </button>
        {open === 'bullets' && (
          <div className={`${popoverBase} left-0 min-w-[140px]`}>
            {BULLET_STYLES.map((s) => (
              <button
                key={s.value}
                type="button"
                onMouseDown={onPreserve}
                onClick={() => actions.applyList('ul', s.value)}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[13px] cursor-pointer transition-colors ${
                  listStyle === s.value ? 'bg-black text-white' : 'hover:bg-[#f4f6f6] text-[#3c4043]'
                }`}
              >
                <i className={`${s.icon} text-sm`} />
                <span>{s.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Numbered list */}
      <div className="relative flex items-center ml-0.5">
        <button
          type="button"
          onMouseDown={onPreserve}
          onClick={() => actions.toggleFormat('insertOrderedList')}
          className={tbBtn(!!activeFormats.insertOrderedList)}
          title="Numbered list"
        >
          <i className="ri-list-ordered-2 text-base" />
        </button>
        <button
          type="button"
          onMouseDown={onPreserve}
          onClick={() => toggle('numbers')}
          className="w-4 h-8 flex items-center justify-center rounded-r-md cursor-pointer text-[10px] text-[#5f6368] hover:bg-[#eef1f1] transition-colors -ml-1"
          title="Number styles"
        >
          <i className="ri-arrow-down-wide-fill" />
        </button>
        {open === 'numbers' && (
          <div className={`${popoverBase} left-0 min-w-[160px]`}>
            {NUMBER_STYLES.map((s) => (
              <button
                key={s.value}
                type="button"
                onMouseDown={onPreserve}
                onClick={() => actions.applyList('ol', s.value)}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[13px] cursor-pointer transition-colors ${
                  listStyle === s.value ? 'bg-black text-white' : 'hover:bg-[#f4f6f6] text-[#3c4043]'
                }`}
              >
                <span className="text-xs w-5 text-center">{s.label.split(' ')[0]}</span>
                <span>{s.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <Divider />

      {/* Change case - dropdown of case transforms (Word-style) */}
      <div className="relative">
        <button
          type="button"
          onMouseDown={onPreserve}
          onClick={() => toggle('case')}
          className={`h-8 px-2 flex items-center justify-center gap-1 rounded-md cursor-pointer transition-colors ${
            open === 'case'
              ? 'bg-black text-white'
              : activeCase
                ? 'bg-[#e2efee] text-[#0d5959]'
                : 'text-[#3c4043] hover:bg-[#eef1f1]'
          }`}
          title={activeCase ? 'Change case (a case mode is active)' : 'Change case'}
        >
          <span className="text-[13px] font-semibold leading-none">Aa</span>
          {activeCase ? (
            <i className="ri-check-line text-sm" />
          ) : (
            <i className={`ri-arrow-down-s-line text-sm ${open === 'case' ? '' : 'text-[#5f6368]'}`} />
          )}
        </button>
        {open === 'case' && (
          <div className={`${popoverBase} left-0 min-w-[210px] flex flex-col`}>
            {TEXT_CASES.map((c) => {
              const active = activeCase === c.key;
              return (
                <button
                  key={c.key}
                  type="button"
                  onMouseDown={onPreserve}
                  onClick={() => { actions.applyTextCase(c.key); closeAll(); }}
                  className={caseOptionCls(active)}
                  title={active ? `${c.label} - active, click to turn off` : c.label}
                >
                  <span className="flex items-center gap-2">
                    <i className="ri-text text-sm" />
                    <span>{c.label}</span>
                  </span>
                  {active && <i className="ri-check-line text-sm" />}
                </button>
              );
            })}
            {activeCase && (
              <p className="px-2.5 pt-1.5 mt-1 border-t border-[#e5e7eb] text-[11px] leading-snug text-[#8a949c]">
                Newly typed text keeps this case until you turn it off.
              </p>
            )}
          </div>
        )}
      </div>

      <Divider />

      {/* Voice typing */}
      <button
        type="button"
        onMouseDown={onPreserve}
        onClick={actions.toggleVoice}
        disabled={!voiceSupported}
        className={`${tbBtn(voiceListening)} ${!voiceSupported ? 'opacity-40 cursor-not-allowed' : ''}`}
        title={!voiceSupported ? 'Voice typing not supported in this browser' : voiceListening ? 'Stop dictation' : 'Voice typing (dictation)'}
      >
        <i className={`${voiceListening ? 'ri-mic-fill animate-pulse' : 'ri-mic-line'} text-base`} />
      </button>

      {/* More / overflow */}
      <div className="relative ml-auto">
        <button
          type="button"
          onMouseDown={onPreserve}
          onClick={() => toggle('more')}
          className={`${tbBtn(open === 'more')} w-9 gap-1`}
          title="More options"
        >
          <i className="ri-more-fill text-base" />
        </button>
        {open === 'more' && (
          <div className={`${popoverBase} right-0 w-[288px] space-y-3`}>
            {/* Inline extras */}
            <div>
              <p className={groupLabel}>Formatting</p>
              <div className="flex items-center gap-1">
                <button type="button" onMouseDown={onPreserve} onClick={() => actions.toggleFormat('strikeThrough')} className={tbBtn(!!activeFormats.strikeThrough)} title="Strikethrough (Ctrl+Shift+X)">
                  <span className="line-through">S</span>
                </button>
                <button type="button" onMouseDown={onPreserve} onClick={() => actions.toggleFormat('superscript')} className={tbBtn(!!activeFormats.superscript)} title="Superscript">
                  <span className="text-[12px]">A²</span>
                </button>
                <button type="button" onMouseDown={onPreserve} onClick={() => actions.toggleFormat('subscript')} className={tbBtn(!!activeFormats.subscript)} title="Subscript">
                  <span className="text-[12px]">A₂</span>
                </button>
                <div className="w-px h-6 bg-[#dadce0] mx-1" />
                <button type="button" onMouseDown={onPreserve} onClick={actions.clearFormatting} className={tbBtn()} title="Clear formatting">
                  <i className="ri-format-clear text-base" />
                </button>
              </div>
            </div>

            {/* Alignment */}
            <div>
              <p className={groupLabel}>Alignment</p>
              <div className="flex items-center gap-1">
                <button type="button" onMouseDown={onPreserve} onClick={() => actions.toggleFormat('justifyLeft')} className={tbBtn(!!activeFormats.justifyLeft)} title="Align left">
                  <i className="ri-align-left text-base" />
                </button>
                <button type="button" onMouseDown={onPreserve} onClick={() => actions.toggleFormat('justifyCenter')} className={tbBtn(!!activeFormats.justifyCenter)} title="Align centre">
                  <i className="ri-align-center text-base" />
                </button>
                <button type="button" onMouseDown={onPreserve} onClick={() => actions.toggleFormat('justifyRight')} className={tbBtn(!!activeFormats.justifyRight)} title="Align right">
                  <i className="ri-align-right text-base" />
                </button>
                <button type="button" onMouseDown={onPreserve} onClick={() => actions.toggleFormat('justifyFull')} className={tbBtn(!!activeFormats.justifyFull)} title="Justify">
                  <i className="ri-align-justify text-base" />
                </button>
                <div className="w-px h-6 bg-[#dadce0] mx-1" />
                <button type="button" onMouseDown={onPreserve} onClick={() => actions.toggleFormat('indent')} className={tbBtn()} title="Increase indent">
                  <i className="ri-indent-increase text-base" />
                </button>
                <button type="button" onMouseDown={onPreserve} onClick={() => actions.toggleFormat('outdent')} className={tbBtn()} title="Decrease indent">
                  <i className="ri-indent-decrease text-base" />
                </button>
              </div>
            </div>

            {/* Line spacing */}
            <div>
              <p className={groupLabel}>Line spacing</p>
              <div className="flex items-center gap-1">
                {LINE_SPACINGS.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onMouseDown={onPreserve}
                    onClick={() => actions.applyLineSpacing(s.value)}
                    className={`h-8 px-2.5 rounded-md text-[13px] cursor-pointer transition-colors ${
                      lineSpacing === s.value ? 'bg-black text-white' : 'text-[#3c4043] hover:bg-[#f4f6f6]'
                    }`}
                    title={`Line spacing ${s.label}`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Text case */}
            <div>
              <p className={groupLabel}>Text case</p>
              <div className="flex flex-col">
                {TEXT_CASES.map((c) => {
                  const active = activeCase === c.key;
                  return (
                    <button
                      key={c.key}
                      type="button"
                      onMouseDown={onPreserve}
                      onClick={() => actions.applyTextCase(c.key)}
                      className={caseOptionCls(active)}
                      title={active ? `${c.label} - active, click to turn off` : c.label}
                    >
                      <span className="flex items-center gap-2">
                        <i className="ri-text text-sm" />
                        <span>{c.label}</span>
                      </span>
                      {active && <i className="ri-check-line text-sm" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Auto-capitalise */}
            <div>
              <p className={groupLabel}>Auto-capitalise</p>
              <button
                type="button"
                onMouseDown={onPreserve}
                onClick={actions.toggleAutoCapitalise}
                className={`${popBtn} justify-between`}
                title="Capitalise the first letter of each new sentence as you type"
              >
                <span className="flex items-center gap-2">
                  <i className={`text-base ${autoCapitalise ? 'ri-toggle-fill' : 'ri-toggle-line'}`} />
                  <span>Sentences while typing</span>
                </span>
                {autoCapitalise && <i className="ri-check-line text-sm text-[#0d5959]" />}
              </button>
            </div>

            {/* Zoom */}
            <div>
              <p className={groupLabel}>Zoom</p>
              <div className="flex items-center gap-1">
                <button type="button" onMouseDown={onPreserve} onClick={() => actions.setZoom(zoom - 10)} className={tbBtn()} title="Zoom out">
                  <i className="ri-subtract-line text-base" />
                </button>
                <button
                  type="button"
                  onMouseDown={onPreserve}
                  onClick={() => actions.setZoom(100)}
                  className="h-8 min-w-[52px] px-2 text-[13px] text-[#3c4043] rounded-md hover:bg-[#eef1f1] cursor-pointer tabular-nums"
                  title="Reset zoom to 100%"
                >
                  {zoom}%
                </button>
                <button type="button" onMouseDown={onPreserve} onClick={() => actions.setZoom(zoom + 10)} className={tbBtn()} title="Zoom in">
                  <i className="ri-add-line text-base" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}