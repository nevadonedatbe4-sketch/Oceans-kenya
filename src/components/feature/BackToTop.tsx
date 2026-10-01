import { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

export default function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!visible) return null;

  return (
    <button
      aria-label="Back to top"
      onClick={scrollToTop}
      className="fixed bottom-5 right-4 z-50 w-9 h-9 md:w-10 md:h-10 md:bottom-6 md:right-6 flex items-center justify-center bg-accent text-white cursor-pointer whitespace-nowrap transition-all duration-300 hover:scale-110 hover:bg-accent/90 rounded-full shadow-[0_3px_10px_rgba(0,0,0,0.16)] hover:shadow-[0_5px_16px_rgba(0,0,0,0.22)]"
    >
      <ArrowUp size={18} strokeWidth={2.5} />
    </button>
  );
}