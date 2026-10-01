import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const VIEW = 280; // on-screen cropper viewport (px, square)
const OUTPUT = 512; // exported avatar size (px, square)

interface ImageCropModalProps {
  file: File;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
}

/**
 * Square avatar cropper. The user can zoom and drag the photo inside the square
 * frame, sees a live preview, then confirms to render a 512×512 image.
 */
export function ImageCropModal({ file, busy, onCancel, onConfirm }: ImageCropModalProps) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [srcUrl, setSrcUrl] = useState('');
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dragRef = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrcUrl(url);
    const image = new Image();
    image.onload = () => setImg(image);
    image.onerror = () => setError('That image could not be opened. Please try another one.');
    image.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Base scale that makes the image cover the square viewport.
  const baseScale = useMemo(() => {
    if (!img) return 1;
    return Math.max(VIEW / img.naturalWidth, VIEW / img.naturalHeight);
  }, [img]);

  const geom = useMemo(() => {
    if (!img) return { drawW: VIEW, drawH: VIEW, left: 0, top: 0, maxX: 0, maxY: 0 };
    const scale = baseScale * zoom;
    const drawW = img.naturalWidth * scale;
    const drawH = img.naturalHeight * scale;
    const maxX = Math.max(0, (drawW - VIEW) / 2);
    const maxY = Math.max(0, (drawH - VIEW) / 2);
    const left = (VIEW - drawW) / 2 + offset.x;
    const top = (VIEW - drawH) / 2 + offset.y;
    return { drawW, drawH, left, top, maxX, maxY };
  }, [img, baseScale, zoom, offset]);

  // Keep the image covering the frame when zoom changes.
  useEffect(() => {
    setOffset((o) => ({
      x: Math.max(-geom.maxX, Math.min(geom.maxX, o.x)),
      y: Math.max(-geom.maxY, Math.min(geom.maxY, o.y)),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geom.maxX, geom.maxY]);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { px: e.clientX, py: e.clientY, ox: offset.x, oy: offset.y };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const nx = d.ox + (e.clientX - d.px);
    const ny = d.oy + (e.clientY - d.py);
    setOffset({
      x: Math.max(-geom.maxX, Math.min(geom.maxX, nx)),
      y: Math.max(-geom.maxY, Math.min(geom.maxY, ny)),
    });
  };

  const onPointerUp = () => { dragRef.current = null; };

  const confirm = useCallback(() => {
    if (!img) return;
    setRendering(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = OUTPUT;
      canvas.height = OUTPUT;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas not supported');
      const sf = OUTPUT / VIEW;
      ctx.fillStyle = '#111b21';
      ctx.fillRect(0, 0, OUTPUT, OUTPUT);
      ctx.drawImage(img, geom.left * sf, geom.top * sf, geom.drawW * sf, geom.drawH * sf);
      canvas.toBlob(
        (blob) => {
          setRendering(false);
          if (blob) onConfirm(blob);
          else setError('Could not prepare the image. Please try again.');
        },
        'image/jpeg',
        0.9,
      );
    } catch {
      setRendering(false);
      setError('Could not prepare the image. Please try again.');
    }
  }, [img, geom, onConfirm]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80" onClick={busy ? undefined : onCancel} />
      <div className="relative w-full max-w-sm bg-[#111b21] rounded-2xl border border-[#2a3942] flex flex-col">
        <div className="px-5 py-4 border-b border-[#2a3942]">
          <h2 className="text-base font-semibold text-[#e9edef]">Adjust your photo</h2>
          <p className="text-xs text-[#8696a0] mt-0.5">Drag to reposition · pinch or use the slider to zoom</p>
        </div>

        <div className="p-5 flex flex-col items-center gap-4">
          <div
            className="relative rounded-xl overflow-hidden bg-[#0b141a] touch-none select-none cursor-move"
            style={{ width: VIEW, height: VIEW }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {img ? (
              <img
                src={srcUrl}
                alt="preview"
                draggable={false}
                className="absolute select-none"
                style={{ width: geom.drawW, height: geom.drawH, left: geom.left, top: geom.top, maxWidth: 'none' }}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-[#8696a0]">
                <i className="ri-loader-4-line animate-spin text-2xl" />
              </div>
            )}
            {/* circular guide */}
            <div className="pointer-events-none absolute inset-0" style={{ boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.15)' }} />
            <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(circle at center, transparent 49%, rgba(0,0,0,0.55) 72%)' }} />
          </div>

          <div className="w-full flex items-center gap-3">
            <i className="ri-zoom-out-line text-[#8696a0]" />
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 accent-[#00a884] cursor-pointer"
            />
            <i className="ri-zoom-in-line text-[#8696a0]" />
          </div>

          {error && <p className="text-xs text-red-400 text-center">{error}</p>}
        </div>

        <div className="px-5 py-3 border-t border-[#2a3942] flex justify-end gap-2">
          <button onClick={onCancel} disabled={busy} className="px-4 py-2 rounded-lg text-sm text-[#8696a0] hover:bg-[#202c33] cursor-pointer whitespace-nowrap disabled:opacity-50">Cancel</button>
          <button
            onClick={confirm}
            disabled={!img || rendering || busy}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#00a884] text-[#0b141a] text-sm font-semibold hover:bg-[#06cf9c] cursor-pointer whitespace-nowrap disabled:opacity-50"
          >
            {(rendering || busy) ? <i className="ri-loader-4-line animate-spin" /> : <i className="ri-check-line" />}
            {(rendering || busy) ? 'Saving…' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}