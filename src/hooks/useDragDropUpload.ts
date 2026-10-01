import { useState } from 'react';
import type { DragEvent } from 'react';

interface DropHandlers {
  onDragEnter: (e: DragEvent<HTMLElement>) => void;
  onDragOver: (e: DragEvent<HTMLElement>) => void;
  onDragLeave: (e: DragEvent<HTMLElement>) => void;
  onDrop: (e: DragEvent<HTMLElement>) => void;
}

/**
 * Shared drag & drop helper for image upload areas.
 * Returns the current dragging state plus the four DOM handlers to spread
 * onto any container. Only image files are surfaced to the callback.
 */
export function useDragDropUpload(onFiles: (files: File[]) => void) {
  const [isDragging, setIsDragging] = useState(false);

  const handlers: DropHandlers = {
    onDragEnter: (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
    },
    onDragOver: (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isDragging) setIsDragging(true);
    },
    onDragLeave: (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
    },
    onDrop: (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer?.files || []).filter((f) => f.type.startsWith('image/'));
      if (files.length) onFiles(files);
    },
  };

  return { isDragging, handlers };
}