import { useScrollReveal } from '@/hooks/useScrollReveal';

interface ScrollRevealBlockProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

/**
 * Shared scroll-reveal wrapper used across page sections. Fades and lifts the
 * content into view once it enters the viewport.
 */
export default function ScrollRevealBlock({ children, className = '', delay = 0 }: ScrollRevealBlockProps) {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`${className} reveal-up ${isVisible ? 'revealed' : ''}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}