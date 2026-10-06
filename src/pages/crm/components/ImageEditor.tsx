import { useState, useEffect, useRef, useCallback } from 'react';
import { uploadImageViaEdgeFunction } from '@/lib/supabase';

interface ImageEditorProps {
  src: string;
  uploadPath: string;
  aspect?: number;
  title?: string;
  onCancel: () => void;
  onSave: (url: string) => Promise<void> | void;
}

interface DragState {
  startX: number;
  startY: number;
  startFx: number;
  startFy: number;
}

const ASPECT_PRESETS: { label: string; value: number }[] = [
  { label: 'Landscape 16:9', value: 16 / 9 },
  { label: 'Card 3:2', value: 3 / 2 },
  { label: 'Photo 4:3', value: 4 / 3 },
  { label: 'Wide 21:9', value: 21 / 9 },
  { label: 'Square 1:1', value: 1 },
];

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

export default function ImageEditor({ src, uploadPath, aspect = 16 / 9, title = 'Edit Image', onCancel, onSave }: ImageEditorProps) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [fx, setFx] = useState(0.5);
  const [fy, setFy] = useState(0.5);
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturate, setSaturate] = useState(100);
  const [curAspect, setCurAspect] = useState(aspect);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const PREVIEW_W = 760;
  const PREVIEW_H = Math.round(PREVIEW_W / curAspect);
  const OUTPUT_W = 1600;
  const OUTPUT_H = Math.round(OUTPUT_W / curAspect);

  // Load source image with crossOrigin so we can draw to canvas
  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    setFailed(false);
    setImg(null);
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      if (!cancelled) {
        imgRef.current = image;
        setImg(image);
        setLoaded(true);
      }
    };
    image.onerror = () => {
      if (!cancelled) setFailed(true);
    };
    image.src = src;
    return () => {
      cancelled = true;
    };
     
  }, [src]);

  // Reset edit state when a new source arrives
  useEffect(() => {
    setZoom(1);
    setFx(0.5);
    setFy(0.5);
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setBrightness(100);
    setContrast(100);
    setSaturate(100);
    setDirty(false);
  }, [src, curAspect]);

  // Core scene renderer, shared by preview and output
  const drawScene = useCallback(
    (canvas: HTMLCanvasElement) => {
      const image = img;
      if (!image || canvas.width === 0 || canvas.height === 0) return;
      const winW = canvas.width;
      const winH = canvas.height;
      const isRot90 = Math.abs(rotation % 180) === 90;
      const rotDimW = isRot90 ? image.naturalHeight : image.naturalWidth;
      const rotDimH = isRot90 ? image.naturalWidth : image.naturalHeight;
      const cover = Math.max(winW / rotDimW, winH / rotDimH) * zoom;
      const scaledW = rotDimW * cover;
      const scaledH = rotDimH * cover;

      // Rotate + flip at natural resolution
      const rot = document.createElement('canvas');
      rot.width = rotDimW;
      rot.height = rotDimH;
      const rctx = rot.getContext('2d');
      if (!rctx) return;
      rctx.translate(rotDimW / 2, rotDimH / 2);
      rctx.rotate((rotation * Math.PI) / 180);
      rctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
      rctx.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);

      // Scale + apply filters
      const sc = document.createElement('canvas');
      sc.width = Math.max(1, Math.round(scaledW));
      sc.height = Math.max(1, Math.round(scaledH));
      const sctx = sc.getContext('2d');
      if (!sctx) return;
      sctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%)`;
      sctx.drawImage(rot, 0, 0, rotDimW, rotDimH, 0, 0, sc.width, sc.height);

      // Draw visible window into the target canvas
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, winW, winH);
      const maxX = Math.max(0, sc.width - winW);
      const maxY = Math.max(0, sc.height - winH);
      const dx = clamp(fx * sc.width - winW / 2, 0, maxX);
      const dy = clamp(fy * sc.height - winH / 2, 0, maxY);
      ctx.drawImage(sc, dx, dy, winW, winH, 0, 0, winW, winH);
    },
    [img, zoom, fx, fy, rotation, flipH, flipV, brightness, contrast, saturate]
  );

  // Redraw preview whenever state changes
  useEffect(() => {
    if (canvasRef.current) drawScene(canvasRef.current);
  }, [drawScene]);

  const markDirty = () => setDirty(true);

  const handleDragStart = (e: React.PointerEvent) => {
    dragRef.current = { startX: e.clientX, startY: e.clientY, startFx: fx, startFy: fy };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handleDragMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || !img) return;
    const winW = canvasRef.current?.width || PREVIEW_W;
    const winH = canvasRef.current?.height || PREVIEW_H;
    const isRot90 = Math.abs(rotation % 180) === 90;
    const rotDimW = isRot90 ? img.naturalHeight : img.naturalWidth;
    const rotDimH = isRot90 ? img.naturalWidth : img.naturalHeight;
    const cover = Math.max(winW / rotDimW, winH / rotDimH) * zoom;
    const scaledW = rotDimW * cover;
    const scaledH = rotDimH * cover;
    const scaleX = winW / scaledW;
    const scaleY = winH / scaledH;
    const dx = (e.clientX - drag.startX) * scaleX;
    const dy = (e.clientY - drag.startY) * scaleY;
    setFx(clamp(drag.startFx - dx, 0, 1));
    setFy(clamp(drag.startFy - dy, 0, 1));
    markDirty();
  };

  const handleDragEnd = () => {
    dragRef.current = null;
  };

  const setVertical = (pos: 0 | 0.5 | 1) => {
    setFy(pos);
    markDirty();
  };
  const setHorizontal = (pos: 0 | 0.5 | 1) => {
    setFx(pos);
    markDirty();
  };

  const reset = () => {
    setZoom(1);
    setFx(0.5);
    setFy(0.5);
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setBrightness(100);
    setContrast(100);
    setSaturate(100);
    setDirty(false);
  };

  const handleSave = async () => {
    if (!img) return;
    setSaving(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = OUTPUT_W;
      canvas.height = OUTPUT_H;
      drawScene(canvas);

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.92);
      });
      if (!blob) throw new Error('Could not create image');

      const file = new File([blob], 'hero.jpg', { type: 'image/jpeg' });
      const { url } = await uploadImageViaEdgeFunction(file, uploadPath);
      await onSave(url);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Save failed';
       
      window.alert(message);
    } finally {
      setSaving(false);
    }
  };

  if (failed) {
    return (
      <div className="bg-white rounded-xl border border-red-200 p-6 text-center">
        <i className="ri-image-line text-red-400 text-3xl mb-2" />
        <p className="text-sm font-roboto text-red-600">
          Could not load this image for editing. You can still <span className="font-medium">upload a fresh one from your device</span> instead of pasting a URL.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-[#e8edf2] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#e8edf2]">
        <div className="flex items-center gap-2">
          <i className="ri-crop-2-line text-[#0d5959] text-lg" />
          <h3 className="font-jost text-sm font-medium text-[#001731]">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-xs font-roboto text-[#7a8a99] hover:text-[#001731] hover:bg-[#f8fafc] rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !loaded}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#0d5959] hover:bg-[#0d5959]/90 text-white rounded-lg text-xs font-roboto transition-all cursor-pointer whitespace-nowrap disabled:opacity-50"
          >
            <i className={`${saving ? 'ri-loader-4-line animate-spin' : 'ri-check-line'}`} />
            {saving ? 'Saving...' : 'Apply & Save'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px]">
        {/* Canvas preview */}
        <div className="relative p-4 bg-[#0e110f] flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={PREVIEW_W}
            height={PREVIEW_H}
            onPointerDown={loaded ? handleDragStart : undefined}
            onPointerMove={loaded ? handleDragMove : undefined}
            onPointerUp={handleDragEnd}
            onPointerLeave={handleDragEnd}
            className="rounded-lg max-w-full h-auto touch-none select-none"
            style={{ cursor: loaded ? 'grab' : 'default', aspectRatio: `${curAspect}` }}
          />
          {!loaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#0e110f]">
              <i className="ri-loader-4-line text-white text-3xl animate-spin" />
            </div>
          )}
          <span className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[11px] text-white/70 font-roboto pointer-events-none">
            Drag the image to position • {Math.round(curAspect * 100) / 100}:1 crop
          </span>
        </div>

        {/* Controls */}
        <div className="border-l border-[#e8edf2] p-4 space-y-4 overflow-y-auto max-h-[540px]">
          {/* Aspect */}
          <div>
            <p className="text-[11px] font-roboto text-[#7a8a99] uppercase tracking-wider mb-1.5">Crop Aspect</p>
            <div className="flex items-center gap-1.5 flex-wrap">
              {ASPECT_PRESETS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setCurAspect(p.value)}
                  className={`px-2 py-1 rounded-md text-[10px] font-roboto border transition-colors cursor-pointer whitespace-nowrap ${
                    curAspect === p.value
                      ? 'border-[#0d5959] bg-[#0d5959]/5 text-[#0d5959]'
                      : 'border-[#e8edf2] text-[#7a8a99] hover:border-[#0d5959]/40'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Zoom */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[11px] font-roboto text-[#7a8a99] uppercase tracking-wider">Zoom</p>
              <span className="text-[11px] font-roboto text-[#0d5959]">{Math.round(zoom * 100)}%</span>
            </div>
            <input
              type="range"
              min={1}
              max={4}
              step={0.01}
              value={zoom}
              onChange={(e) => { setZoom(Number(e.target.value)); markDirty(); }}
              className="w-full accent-[#0d5959]"
            />
          </div>

          {/* Position */}
          <div>
            <p className="text-[11px] font-roboto text-[#7a8a99] uppercase tracking-wider mb-1.5">Position</p>
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-[#7a8a99] font-roboto w-14">Vertical</span>
                {([['Top', 0], ['Centre', 0.5], ['Bottom', 1]] as const).map(([label, val]) => (
                  <button
                    key={label}
                    onClick={() => setVertical(val)}
                    className={`flex-1 px-1 py-1.5 rounded-md text-[10px] font-roboto border transition-colors cursor-pointer whitespace-nowrap ${
                      fy === val ? 'border-[#0d5959] bg-[#0d5959]/5 text-[#0d5959]' : 'border-[#e8edf2] text-[#7a8a99] hover:border-[#0d5959]/40'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-[#7a8a99] font-roboto w-14">Horizontal</span>
                {([['Left', 0], ['Centre', 0.5], ['Right', 1]] as const).map(([label, val]) => (
                  <button
                    key={label}
                    onClick={() => setHorizontal(val)}
                    className={`flex-1 px-1 py-1.5 rounded-md text-[10px] font-roboto border transition-colors cursor-pointer whitespace-nowrap ${
                      fx === val ? 'border-[#0d5959] bg-[#0d5959]/5 text-[#0d5959]' : 'border-[#e8edf2] text-[#7a8a99] hover:border-[#0d5959]/40'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Rotate & Flip */}
          <div>
            <p className="text-[11px] font-roboto text-[#7a8a99] uppercase tracking-wider mb-1.5">Rotate &amp; Flip</p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => { setRotation((r) => (r + 90) % 360); markDirty(); }}
                className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-md border border-[#e8edf2] text-[11px] font-roboto text-[#001731] hover:border-[#0d5959]/40 transition-colors cursor-pointer"
              >
                <i className="ri-refresh-line text-xs" /> Rotate
              </button>
              <button
                onClick={() => { setFlipH((v) => !v); markDirty(); }}
                className={`flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-md border text-[11px] font-roboto transition-colors cursor-pointer ${
                  flipH ? 'border-[#0d5959] bg-[#0d5959]/5 text-[#0d5959]' : 'border-[#e8edf2] text-[#001731] hover:border-[#0d5959]/40'
                }`}
              >
                <i className="ri-split-cells-horizontal text-xs" /> Flip H
              </button>
              <button
                onClick={() => { setFlipV((v) => !v); markDirty(); }}
                className={`flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-md border text-[11px] font-roboto transition-colors cursor-pointer ${
                  flipV ? 'border-[#0d5959] bg-[#0d5959]/5 text-[#0d5959]' : 'border-[#e8edf2] text-[#001731] hover:border-[#0d5959]/40'
                }`}
              >
                <i className="ri-split-cells-vertical text-xs" /> Flip V
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="space-y-2">
            <p className="text-[11px] font-roboto text-[#7a8a99] uppercase tracking-wider">Adjustments</p>
            {[
              { label: 'Brightness', val: brightness, set: setBrightness },
              { label: 'Contrast', val: contrast, set: setContrast },
              { label: 'Saturation', val: saturate, set: setSaturate },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[10px] text-[#7a8a99] font-roboto">{item.label}</span>
                  <span className="text-[10px] text-[#0d5959] font-roboto">{item.val}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={200}
                  step={1}
                  value={item.val}
                  onChange={(e) => { item.set(Number(e.target.value)); markDirty(); }}
                  className="w-full accent-[#0d5959]"
                />
              </div>
            ))}
          </div>

          <button
            onClick={reset}
            disabled={!dirty}
            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md border border-[#e8edf2] text-[11px] font-roboto text-[#7a8a99] hover:text-[#001731] hover:bg-[#f8fafc] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <i className="ri-refresh-line" /> Reset edits
          </button>
        </div>
      </div>
    </div>
  );
}