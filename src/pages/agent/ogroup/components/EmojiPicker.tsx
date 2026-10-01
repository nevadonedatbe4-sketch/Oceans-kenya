import { useMemo, useState } from 'react';

interface EmojiDef {
  char: string;
  name: string;
}

const EMOJIS: EmojiDef[] = [
  { char: '😀', name: 'grin smile happy' },
  { char: '😂', name: 'laugh joy funny lol' },
  { char: '🥰', name: 'love hearts adore' },
  { char: '😎', name: 'cool sunglasses' },
  { char: '🤔', name: 'think hmm' },
  { char: '😴', name: 'sleep tired' },
  { char: '😅', name: 'sweat nervous' },
  { char: '😭', name: 'cry sad' },
  { char: '🤩', name: 'star struck wow' },
  { char: '😡', name: 'angry mad' },
  { char: '🥳', name: 'party celebrate' },
  { char: '🙌', name: 'raise hands praise' },
  { char: '👏', name: 'clap applause' },
  { char: '👍', name: 'thumbs up okay yes' },
  { char: '👎', name: 'thumbs down no' },
  { char: '🙏', name: 'pray thanks please' },
  { char: '💪', name: 'strong muscle' },
  { char: '🤝', name: 'handshake deal agree' },
  { char: '✋', name: 'hand stop' },
  { char: '👋', name: 'wave hi hello bye' },
  { char: '💬', name: 'message chat talk' },
  { char: '❤️', name: 'heart love red' },
  { char: '💚', name: 'green heart love' },
  { char: '🔥', name: 'fire hot lit' },
  { char: '⭐', name: 'star favourite' },
  { char: '🎉', name: 'party confetti celebrate' },
  { char: '🎯', name: 'target goal bullseye' },
  { char: '✅', name: 'check done yes' },
  { char: '❌', name: 'cross no wrong' },
  { char: '⚠️', name: 'warning alert' },
  { char: '📅', name: 'calendar date schedule' },
  { char: '🏠', name: 'house home property' },
  { char: '🔑', name: 'key access' },
  { char: '💰', name: 'money bag cash' },
  { char: '📈', name: 'chart growth up' },
  { char: '📞', name: 'phone call' },
  { char: '✉️', name: 'email mail envelope' },
  { char: '📎', name: 'paperclip attach file' },
  { char: '🖼️', name: 'image picture frame' },
  { char: '🚀', name: 'rocket launch fast' },
  { char: '🏆', name: 'trophy win' },
  { char: '⏰', name: 'alarm clock time' },
  { char: '💼', name: 'briefcase work business' },
  { char: '🏢', name: 'office building company' },
  { char: '🌍', name: 'globe world earth' },
  { char: '🍀', name: 'clover luck' },
];

interface EmojiPickerProps {
  onPick: (emoji: string) => void;
  onClose: () => void;
}

export function EmojiPicker({ onPick, onClose }: EmojiPickerProps) {
  const [query, setQuery] = useState('');
  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return EMOJIS;
    return EMOJIS.filter((e) => e.name.includes(q) || e.char === q);
  }, [query]);

  return (
    <div className="absolute bottom-full mb-2 w-72 bg-[#111b21] rounded-xl border border-[#2a3942] z-30 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#2a3942]">
        <span className="text-xs font-semibold text-[#e9edef]">Emoji</span>
        <button onClick={onClose} className="text-[#8696a0] hover:text-[#e9edef] cursor-pointer p-1">
          <i className="ri-close-line text-base" />
        </button>
      </div>
      <div className="p-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search emoji..."
          className="w-full px-3 py-1.5 text-xs rounded-md bg-[#202c33] border border-[#2a3942] text-[#e9edef] placeholder:text-[#8696a0] focus:outline-none focus:ring-1 focus:ring-[#00a884] mb-2"
        />
        {list.length === 0 ? (
          <p className="text-xs text-[#8696a0] text-center py-6">No emoji found</p>
        ) : (
          <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto">
            {list.map((e) => (
              <button
                key={e.char}
                onClick={() => { onPick(e.char); onClose(); }}
                className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-[#202c33] text-lg cursor-pointer"
              >
                {e.char}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}