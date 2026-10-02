interface NewDevHeroProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  image: string;
}

/**
 * New Developments hero. Fully backend-driven copy; an optional background
 * image can be supplied, otherwise the brand gradient is used.
 */
export default function NewDevHero({ eyebrow, title, subtitle, image }: NewDevHeroProps) {
  return (
    <div
      className="relative flex flex-col items-center justify-center text-center overflow-hidden pt-12 pb-12 md:pt-16 md:pb-16 bg-gradient-to-br from-primary via-primary to-accent/70"
      style={{ minHeight: '320px' }}
    >
      {image && <img src={image} alt="" className="absolute inset-0 w-full h-full object-cover object-top" />}
      <div className={`absolute inset-0 ${image ? 'bg-primary/80' : 'bg-gradient-to-r from-primary/90 via-primary/80 to-primary/50'}`}></div>
      <div className="relative z-10 w-full max-w-3xl mx-auto px-4 md:px-6 text-center">
        {eyebrow && (
          <p className="text-golden text-sm md:text-base font-bold tracking-widest uppercase mb-3 md:mb-4">{eyebrow}</p>
        )}
        <h1 className="text-[28px] md:text-[32px] lg:text-[36px] font-bold text-white mb-4 md:mb-5 leading-tight">{title}</h1>
        {subtitle && (
          <p className="text-white/80 font-medium text-sm md:text-base lg:text-lg leading-relaxed max-w-xl mx-auto">{subtitle}</p>
        )}
      </div>
    </div>
  );
}