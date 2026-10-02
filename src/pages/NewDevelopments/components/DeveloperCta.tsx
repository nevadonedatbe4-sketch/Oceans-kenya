import { Link } from 'react-router-dom';
import MobileCollapsible from '@/components/feature/MobileCollapsible';

interface DeveloperCtaProps {
  title: string;
  collapseLabel: string;
  openLabel: string;
  summary: string;
  text: string;
  button1Label: string;
  button1Link: string;
  button2Label: string;
  button2Link: string;
}

/**
 * "Have a Development to Sell?" call-to-action. All copy and both button
 * labels/links are backend-driven.
 */
export default function DeveloperCta({
  title, collapseLabel, openLabel, summary, text,
  button1Label, button1Link, button2Label, button2Link,
}: DeveloperCtaProps) {
  return (
    <section className="py-10 md:py-14 lg:py-16 px-4 md:px-6 bg-primary">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-white font-bold text-2xl md:text-3xl mb-3 md:mb-4">{title}</h2>
        <MobileCollapsible
          label={collapseLabel}
          openLabel={openLabel}
          summary={summary}
          icon="ri-team-line"
          variant="dark"
          className="max-w-lg mx-auto text-left md:text-center"
        >
          <p className="text-white/70 text-xs md:text-sm mb-6 md:mb-8 max-w-lg mx-auto">{text}</p>
        </MobileCollapsible>
        <div className="mt-6 md:mt-0 flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4">
          {button1Label && (
            <Link to={button1Link || '#'} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 md:px-8 py-3 md:py-3.5 bg-golden text-white text-sm md:text-base font-semibold tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-golden/90 transition-opacity">
              <i className="ri-mail-line"></i>{button1Label}
            </Link>
          )}
          {button2Label && (
            <Link to={button2Link || '#'} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 md:px-8 py-3 md:py-3.5 border border-white/50 text-white text-sm md:text-base font-semibold tracking-widest uppercase cursor-pointer whitespace-nowrap hover:bg-white/10 transition-colors">
              <i className="ri-bar-chart-2-line"></i>{button2Label}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}