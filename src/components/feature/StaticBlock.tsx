import type { ReactNode } from 'react';

interface StaticBlockProps {
  children: ReactNode;
  className?: string;
  /** Accepted for drop-in compatibility with the animated reveal block. */
  delay?: number;
}

/**
 * StaticBlock - an immediately-visible section wrapper for guide pages.
 *
 * Guide pages used to wrap every section in a scroll-reveal block that started
 * hidden (opacity 0) and only faded in once it entered the viewport, which made
 * content feel like it was loading as you scrolled. This wrapper renders its
 * children straight away - no IntersectionObserver, no hidden state, no
 * per-section delay - so all guide content is present the moment the page opens.
 */
export default function StaticBlock({ children, className = '' }: StaticBlockProps) {
  return <div className={className}>{children}</div>;
}