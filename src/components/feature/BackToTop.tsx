import { useState, useEffect } from 'react';

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
      className="fixed bottom-6 right-6 z-50 w-11 h-11 flex items-center justify-center text-white cursor-pointer whitespace-nowrap transition-all duration-300 hover:scale-110 rounded-full shadow-[0_4px_14px_rgba(0,0,0,0.15)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.25)] border border-white/10"
      style={{ backgroundColor: 'rgb(var(--color-accent) / 1)' }}
    >
      <i className="ri-arrow-up-line text-lg"></i>
    </button>
  );
}